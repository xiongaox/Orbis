//! 核心 Tauri 命令（模块 B / commands.rs）
//!
//! 暴露给前端的 IPC 命令：
//! get_machine_id / get_cases_status / activate_cases / activate_with_master_password /
//! remove_activation / get_case_list / get_case_content / get_author_profile。
//!
//! 激活流程（完全离线，案例包随应用内置）：
//! - activate_cases：Ed25519 验签激活码（一机一码，远程签发）；
//! - activate_with_master_password：校验内置 PBKDF2 哈希（作者面对面激活）。
//! 两条路共用同一管线：内存解密内置包 → LocalKey 二次加密灌库；
//! 数据库只保存许可串（激活码原文 / 密码的单向派生串），均无明文密码。

use crate::cases::bundle::{self, parse_and_decrypt};
use crate::cases::crypto;
use crate::cases::db::{self, CaseMeta, CasesStatus};
use crate::cases::machine_id;
#[cfg(feature = "admin-signing")]
use crate::cases::signing;
use rusqlite::Connection;
use serde_json::json;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

/// 进度事件名（前端通过 @tauri-apps/api/event 监听）。
pub const PROGRESS_EVENT: &str = "case-pack-progress";

pub struct CasesState {
    connection: Mutex<Option<Connection>>,
    /// (LocalKey, machine_id|license_code) 缓存，避免逐篇 Argon2 派生。
    local_key_cache: Mutex<Option<([u8; 32], String)>>,
    /// 本次进程是否已完成内置包同步。同步要整包解密（2MB 密文 → 6MB JSON），
    /// 而案例包在进程生命周期内不可能变化，因此只需成功一次。
    bundle_synced: AtomicBool,
}

impl Default for CasesState {
    fn default() -> Self {
        Self {
            connection: Mutex::new(None),
            local_key_cache: Mutex::new(None),
            bundle_synced: AtomicBool::new(false),
        }
    }
}

impl CasesState {
    fn with_connection<T>(
        &self,
        app: &AppHandle,
        operation: impl FnOnce(&Connection) -> Result<T, String>,
    ) -> Result<T, String> {
        let mut guard = self.connection.lock().map_err(|_| "案例库状态锁中毒".to_string())?;
        if guard.is_none() {
            let dir = app.path().app_local_data_dir().map_err(|cause| format!("无法定位应用数据目录: {}", cause))?;
            *guard = Some(db::open(&dir)?);
        }
        operation(guard.as_ref().expect("连接必已初始化"))
    }
}

/// 管理员版应用内签发：管理密码解封私钥，直接为机器码出激活码。
#[tauri::command]
pub fn sign_activation_code(machine_id: String, unlock_password: String) -> Result<String, String> {
    #[cfg(feature = "admin-signing")]
    return signing::sign_machine_id(&machine_id, &unlock_password);
    #[cfg(not(feature = "admin-signing"))]
    {
        let _ = (machine_id, unlock_password);
        Err("签发功能仅存在于管理员版本".to_string())
    }
}

/// 前端据此决定是否展示签发面板（仅管理员版可见）。
#[tauri::command]
pub fn is_signing_available() -> bool {
    #[cfg(feature = "admin-signing")]
    return signing::blob_present();
    #[cfg(not(feature = "admin-signing"))]
    {
        false
    }
}

#[tauri::command]
pub fn get_machine_id() -> String {
    machine_id::machine_id()
}

#[tauri::command]
pub async fn get_cases_status(
    state: tauri::State<'_, CasesState>,
    app: AppHandle,
) -> Result<CasesStatus, String> {
    sync_embedded_bundle(&app, &state).await;
    state.with_connection(&app, db::read_status)
}

/// 启动时静默同步内置案例包：已激活且包版本变化就重新灌库。
///
/// 案例包是构建时嵌入的（build.rs ← dist-cases/cases_v1.enc），重打包后
/// 激活码不变，若只在用户手动激活时才比对版本，已装应用会一直沿用旧数据。
/// 本地解密不联网、不需要激活码，因此这里可以直接复用已存储的许可串。
///
/// 同步失败（未激活 / 未内置包 / 解密异常）不向上抛：状态查询本身必须可用，
/// 用户仍可在激活界面看到真实错误。
async fn sync_embedded_bundle(app: &AppHandle, state: &tauri::State<'_, CasesState>) {
    // 内置包在进程内不会变化，同步成本却是整包解密（见 bundle_synced 注释）。
    // 这里必须最先判断，才真正省掉重复开销。
    if state.bundle_synced.load(Ordering::SeqCst) {
        return;
    }
    // 用户主动移除过激活：不擅自用内置包恢复，需其重新输入激活码
    match state.with_connection(app, db::is_removed) {
        Ok(true) => return,
        Ok(false) => {}
        Err(cause) => {
            log::warn!("读取移除状态失败：{}", cause);
            return;
        }
    }
    let license = match state.with_connection(app, db::stored_license) {
        Ok(Some(license)) => license,
        _ => return,
    };
    match activate_with_license(app, state, machine_id::machine_id(), license).await {
        Ok(_) => state.bundle_synced.store(true, Ordering::SeqCst),
        Err(cause) => log::warn!("启动同步案例包失败：{}", cause),
    }
}

/// 移除激活：清空本地案例库并落盘移除标记，回到试读态。
/// 与 `get_cases_status` 的自动同步是一对：标记不清除，重启也不会自动恢复。
#[tauri::command]
pub async fn remove_activation(
    state: tauri::State<'_, CasesState>,
    app: AppHandle,
) -> Result<(), String> {
    state
        .with_connection(&app, db::remove_activation)
        .map_err(|cause| format!("移除激活失败：{}", cause))?;
    // 缓存的行级密钥随激活记录一并失效，避免残留
    if let Ok(mut cache) = state.local_key_cache.lock() {
        *cache = None;
    }
    // 移除后本地库已空，同进程内再次激活必须重新灌库，不能沿用「已同步」判断
    state.bundle_synced.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn activate_cases(
    app: AppHandle,
    state: tauri::State<'_, CasesState>,
    license_code: String,
) -> Result<u32, String> {
    let machine = machine_id::machine_id();
    emit_progress(&app, "verifying", None, "正在校验激活码...");
    crypto::verify_activation_code(&machine, &license_code)?;
    activate_with_license(&app, &state, machine, license_code.trim().to_string()).await
}

/// 作者管理密码激活（面对面场景）：密码只做校验与派生，不落明文。
#[tauri::command]
pub async fn activate_with_master_password(
    app: AppHandle,
    state: tauri::State<'_, CasesState>,
    password: String,
) -> Result<u32, String> {
    let machine = machine_id::machine_id();
    emit_progress(&app, "verifying", None, "正在校验管理密码...");
    if !crypto::verify_master_password(&password) {
        return Err("管理密码不正确".to_string());
    }
    let license = crypto::master_password_license(&password);
    activate_with_license(&app, &state, machine, license).await
}

/// 共用激活管线：同一许可且同一案例包版本时复用本地数据；否则解密内置包并全量灌库。
/// 版本必须参与判断——案例包是构建时嵌入的，换包后激活码不变，
/// 若只比激活码会一直复用旧数据（重打包后列表看不到更新）。
async fn activate_with_license(
    app: &AppHandle,
    state: &CasesState,
    machine: String,
    license: String,
) -> Result<u32, String> {
    let file = bundle::embedded_bundle()
        .ok_or_else(|| "应用未内置案例包（构建前请先运行 npm run cases:pack）".to_string())?;

    emit_progress(app, "decrypting", None, "正在安全解密案例包...");
    let decrypted = parse_and_decrypt(file, &crypto::master_key())?;

    let up_to_date = state.with_connection(app, |connection| {
        let status = db::read_status(connection)?;
        let stored = db::stored_license(connection)?;
        Ok(status.total > 0
            && stored.as_deref() == Some(license.as_str())
            && status.version.as_deref() == Some(decrypted.version.as_str()))
    })?;
    if up_to_date {
        let total = state.with_connection(app, |connection| Ok(db::read_status(connection)?.total))?;
        emit_progress(app, "done", Some(100.0), "案例库已是最新。");
        return Ok(total);
    }

    let local_key = crypto::derive_local_key(&machine, &license)?;

    emit_progress(app, "importing", None, "正在安全部署本地案例库...");
    let total = state.with_connection(app, |connection| {
        db::import_bundle(connection, &machine, &license, &decrypted, &local_key)?;
        Ok(db::read_status(connection)?.total)
    })?;
    if let Ok(mut cache) = state.local_key_cache.lock() {
        *cache = Some((local_key, format!("{}|{}", machine, license)));
    }

    emit_progress(app, "done", Some(100.0), "本地案例库部署完成。");
    Ok(total)
}

fn emit_progress(app: &AppHandle, phase: &str, percent: Option<f64>, message: &str) {
    let payload = json!({ "phase": phase, "percent": percent, "message": message });
    if let Err(cause) = app.emit(PROGRESS_EVENT, payload) {
        log::warn!("进度事件发送失败: {}", cause);
    }
}

#[tauri::command]
pub fn get_case_list(
    state: tauri::State<CasesState>,
    app: AppHandle,
    domain: Option<String>,
) -> Result<Vec<CaseMeta>, String> {
    state.with_connection(&app, |connection| db::list_entries(connection, domain.as_deref()))
}

/// 取正文前先确保激活记录仍属于本机；数据库被拷贝到他机时这里会拒绝。
fn load_local_key(state: &CasesState, app: &AppHandle) -> Result<[u8; 32], String> {
    let machine = machine_id::machine_id();
    if let Ok(cache) = state.local_key_cache.lock() {
        if let Some((key, cache_key)) = cache.as_ref() {
            if cache_key.starts_with(&(machine.clone() + "|")) {
                return Ok(*key);
            }
        }
    }
    let (stored_machine, license) = state.with_connection(app, |connection| {
        connection
            .query_row(
                "SELECT machine_id, license_key FROM activation_status WHERE id = 1",
                [],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            )
            .map_err(|_| "尚未激活本地案例库".to_string())
    })?;
    if stored_machine != machine {
        return Err("激活记录与本机不匹配（数据可能被拷贝），请重新激活".to_string());
    }
    let key = crypto::derive_local_key(&machine, &license)?;
    if let Ok(mut cache) = state.local_key_cache.lock() {
        *cache = Some((key, format!("{}|{}", machine, license)));
    }
    Ok(key)
}

#[tauri::command]
pub fn get_case_content(state: tauri::State<CasesState>, app: AppHandle, id: String) -> Result<String, String> {
    let local_key = load_local_key(&state, &app)?;
    state.with_connection(&app, |connection| db::case_content(connection, &local_key, &id))
}

#[tauri::command]
pub fn get_author_profile(state: tauri::State<CasesState>, app: AppHandle, author_key: String) -> Result<String, String> {
    let local_key = load_local_key(&state, &app)?;
    state.with_connection(&app, |connection| db::author_profile(connection, &local_key, &author_key))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn state_defaults_to_closed_connection() {
        let state = CasesState::default();
        assert!(state.connection.lock().unwrap().is_none());
    }

    /// 内置包同步的短路标志：默认未同步，成功后才置位。
    /// 若默认即为 true，已装应用将永远不再灌入新版案例包。
    #[test]
    fn bundle_sync_flag_starts_unsynced_and_is_settable() {
        let state = CasesState::default();
        assert!(!state.bundle_synced.load(Ordering::SeqCst));
        state.bundle_synced.store(true, Ordering::SeqCst);
        assert!(state.bundle_synced.load(Ordering::SeqCst));
    }
}
