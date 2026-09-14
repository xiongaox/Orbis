//! 核心 Tauri 命令（模块 B / commands.rs）
//!
//! 暴露给前端的 IPC 命令：
//! get_machine_id / get_cases_status / activate_cases / activate_with_master_password /
//! get_case_list / get_case_content / get_author_profile。
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
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

/// 进度事件名（前端通过 @tauri-apps/api/event 监听）。
pub const PROGRESS_EVENT: &str = "case-pack-progress";

pub struct CasesState {
    connection: Mutex<Option<Connection>>,
    /// (LocalKey, machine_id|license_code) 缓存，避免逐篇 Argon2 派生。
    local_key_cache: Mutex<Option<([u8; 32], String)>>,
}

impl Default for CasesState {
    fn default() -> Self {
        Self {
            connection: Mutex::new(None),
            local_key_cache: Mutex::new(None),
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
pub fn get_cases_status(state: tauri::State<CasesState>, app: AppHandle) -> Result<CasesStatus, String> {
    state.with_connection(&app, db::read_status)
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

/// 共用激活管线：同一许可重复激活直接复用本地数据；否则解密内置包并全量灌库。
async fn activate_with_license(
    app: &AppHandle,
    state: &CasesState,
    machine: String,
    license: String,
) -> Result<u32, String> {
    let existing = state.with_connection(app, |connection| {
        Ok(db::stored_license(connection)?.filter(|_| db::read_status(connection).map(|status| status.total > 0).unwrap_or(false)))
    })?;
    if existing.as_deref() == Some(license.as_str()) {
        let total = state.with_connection(app, |connection| Ok(db::read_status(connection)?.total))?;
        emit_progress(app, "done", Some(100.0), "案例库已是最新。");
        return Ok(total);
    }

    let file = bundle::embedded_bundle()
        .ok_or_else(|| "应用未内置案例包（构建前请先运行 npm run cases:pack）".to_string())?;

    emit_progress(app, "decrypting", None, "正在安全解密案例包...");
    let decrypted = parse_and_decrypt(file, &crypto::master_key())?;
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
}
