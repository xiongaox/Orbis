//! 本地数据库与密文表（模块 B / db.rs）
//!
//! 在 Tauri 应用数据目录维护 cases_local.sqlite：
//! - case_entries / 元数据明文，支持高速筛选分页；
//! - case_contents / author_profiles 正文密文（一机一密，行级 AES-256-GCM）；
//! - activation_status 激活状态。
//! 数据库被拷贝到其他机器时因 LocalKey 不同而全部不可解密。

use crate::cases::bundle::DecryptedBundle;
use crate::cases::crypto;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

#[derive(Serialize)]
pub struct CaseMeta {
    pub id: String,
    pub title: String,
    pub domain: String,
    pub author_key: String,
    pub author_name: String,
    pub category: String,
    pub summary: String,
}

#[derive(Serialize)]
pub struct CasesStatus {
    #[serde(rename = "is_activated")]
    pub is_activated: bool,
    pub total: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}

pub fn open(app_local_data_dir: &std::path::Path) -> Result<Connection, String> {
    std::fs::create_dir_all(app_local_data_dir).map_err(|cause| format!("无法创建数据目录: {}", cause))?;
    let path = app_local_data_dir.join("cases_local.sqlite");
    let connection = Connection::open(&path).map_err(|cause| format!("无法打开案例数据库: {}", cause))?;
    initialize(&connection)?;
    Ok(connection)
}

/// 建表（幂等）；独立出来便于测试对内存库使用。
pub fn initialize(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS case_entries (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                domain TEXT NOT NULL,
                author_key TEXT NOT NULL,
                author_name TEXT NOT NULL,
                category TEXT NOT NULL,
                summary TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS case_contents (
                id TEXT PRIMARY KEY,
                nonce BLOB NOT NULL,
                encrypted_content BLOB NOT NULL
            );

            CREATE TABLE IF NOT EXISTS author_profiles (
                author_key TEXT PRIMARY KEY,
                author_name TEXT NOT NULL,
                nonce BLOB NOT NULL,
                encrypted_profile BLOB NOT NULL
            );

            CREATE TABLE IF NOT EXISTS activation_status (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                machine_id TEXT NOT NULL,
                license_key TEXT NOT NULL,
                version TEXT NOT NULL,
                activated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_case_entries_domain ON case_entries(domain);",
        )
        .map_err(|cause| format!("无法初始化案例数据库: {}", cause))?;
    Ok(())
}

pub fn read_status(connection: &Connection) -> Result<CasesStatus, String> {
    let total: u32 = connection
        .query_row("SELECT COUNT(*) FROM case_entries", [], |row| row.get(0))
        .map_err(|cause| format!("无法统计案例数量: {}", cause))?;
    let (machine_id, version): (Option<String>, Option<String>) = connection
        .query_row(
            "SELECT machine_id, version FROM activation_status WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|cause| format!("无法读取激活状态: {}", cause))?
        .unwrap_or((None, None));
    Ok(CasesStatus {
        is_activated: machine_id.is_some() && total > 0,
        total,
        version,
    })
}

pub fn stored_license(connection: &Connection) -> Result<Option<String>, String> {
    Ok(connection
        .query_row("SELECT license_key FROM activation_status WHERE id = 1", [], |row| row.get(0))
        .optional()
        .map_err(|cause| format!("无法读取激活状态: {}", cause))?)
}

/// 全量灌库：明文目录 + 行级密文正文 + 激活记录，单事务完成。
pub fn import_bundle(
    connection: &Connection,
    machine_id: &str,
    license_code: &str,
    bundle: &DecryptedBundle,
    local_key: &[u8; 32],
) -> Result<(), String> {
    let tx = connection.unchecked_transaction().map_err(|cause| format!("无法开启事务: {}", cause))?;
    tx.execute("DELETE FROM case_entries", []).map_err(db_err("清空案例目录"))?;
    tx.execute("DELETE FROM case_contents", []).map_err(db_err("清空案例正文"))?;
    tx.execute("DELETE FROM author_profiles", []).map_err(db_err("清空作者生平"))?;
    tx.execute("DELETE FROM activation_status", []).map_err(db_err("清空激活记录"))?;

    for case in &bundle.cases {
        tx.execute(
            "INSERT INTO case_entries (id, title, domain, author_key, author_name, category, summary) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![case.id, case.title, case.domain, case.author_key, case.author_name, case.category, case.summary],
        )
        .map_err(db_err("写入案例目录"))?;
        let (nonce, ciphertext) = crypto::encrypt_row(local_key, case.content.as_bytes())?;
        tx.execute(
            "INSERT INTO case_contents (id, nonce, encrypted_content) VALUES (?1, ?2, ?3)",
            params![case.id, nonce, ciphertext],
        )
        .map_err(db_err("写入案例正文密文"))?;
    }

    for (author_key, profile) in &bundle.author_profiles {
        let author_name = bundle
            .cases
            .iter()
            .find(|case| &case.author_key == author_key)
            .map(|case| case.author_name.clone())
            .unwrap_or_else(|| author_key.clone());
        let (nonce, ciphertext) = crypto::encrypt_row(local_key, profile.as_bytes())?;
        tx.execute(
            "INSERT INTO author_profiles (author_key, author_name, nonce, encrypted_profile) VALUES (?1, ?2, ?3, ?4)",
            params![author_key, author_name, nonce, ciphertext],
        )
        .map_err(db_err("写入作者生平密文"))?;
    }

    let activated_at = now_iso();
    tx.execute(
        "INSERT INTO activation_status (id, machine_id, license_key, version, activated_at) VALUES (1, ?1, ?2, ?3, ?4)",
        params![machine_id, license_code.trim(), bundle.version, activated_at],
    )
    .map_err(db_err("写入激活记录"))?;
    tx.commit().map_err(|cause| format!("提交案例库事务失败: {}", cause))
}

pub fn list_entries(connection: &Connection, domain: Option<&str>) -> Result<Vec<CaseMeta>, String> {
    let mut statement = connection
        .prepare("SELECT id, title, domain, author_key, author_name, category, summary FROM case_entries WHERE (?1 IS NULL OR domain = ?1) ORDER BY id")
        .map_err(db_err("准备案例查询"))?;
    let rows = statement
        .query_map(params![domain], |row| {
            Ok(CaseMeta {
                id: row.get(0)?,
                title: row.get(1)?,
                domain: row.get(2)?,
                author_key: row.get(3)?,
                author_name: row.get(4)?,
                category: row.get(5)?,
                summary: row.get(6)?,
            })
        })
        .map_err(db_err("查询案例目录"))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_err("读取案例目录"))
}

pub fn case_content(connection: &Connection, local_key: &[u8; 32], id: &str) -> Result<String, String> {
    let row: Option<(Vec<u8>, Vec<u8>)> = connection
        .query_row("SELECT nonce, encrypted_content FROM case_contents WHERE id = ?1", params![id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .optional()
        .map_err(db_err("查询案例正文"))?;
    let (nonce, ciphertext) = row.ok_or_else(|| format!("案例不存在：{}", id))?;
    let plaintext = crypto::decrypt_row(local_key, &nonce, &ciphertext)?;
    String::from_utf8(plaintext).map_err(|_| "案例正文不是有效 UTF-8".to_string())
}

pub fn author_profile(connection: &Connection, local_key: &[u8; 32], author_key: &str) -> Result<String, String> {
    let row: Option<(Vec<u8>, Vec<u8>)> = connection
        .query_row(
            "SELECT nonce, encrypted_profile FROM author_profiles WHERE author_key = ?1",
            params![author_key],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(db_err("查询作者生平"))?;
    let (nonce, ciphertext) = row.ok_or_else(|| format!("作者生平不存在：{}", author_key))?;
    let plaintext = crypto::decrypt_row(local_key, &nonce, &ciphertext)?;
    String::from_utf8(plaintext).map_err(|_| "作者生平不是有效 UTF-8".to_string())
}

fn db_err(stage: &'static str) -> impl Fn(rusqlite::Error) -> String + 'static {
    move |cause| format!("{}失败: {}", stage, cause)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cases::bundle::BundleCase;

    fn sample_bundle() -> DecryptedBundle {
        DecryptedBundle {
            version: "test.1.0".to_string(),
            cases: vec![BundleCase {
                id: "bazi/lishuanglin/甲日命造/测试案例.md".to_string(),
                title: "测试案例".to_string(),
                domain: "bazi".to_string(),
                author_key: "lishuanglin".to_string(),
                author_name: "李双林".to_string(),
                category: "甲日命造".to_string(),
                summary: "1985/07/14 甲木".to_string(),
                content: "# 测试正文\n\n命主生辰: 1985/07/14 08:00".to_string(),
            }],
            author_profiles: [("lishuanglin".to_string(), "# 李双林介绍".to_string())].into_iter().collect(),
        }
    }

    #[test]
    fn import_and_read_back_with_same_machine_key() {
        let connection = Connection::open_in_memory().unwrap();
        initialize(&connection).unwrap();
        let bundle = sample_bundle();
        let key = crypto::derive_local_key("ORBIS-A8F2-9901-7BC3", "ACT-VALID").unwrap();
        import_bundle(&connection, "ORBIS-A8F2-9901-7BC3", "ACT-VALID", &bundle, &key).unwrap();

        let status = read_status(&connection).unwrap();
        assert!(status.is_activated);
        assert_eq!(status.total, 1);
        assert_eq!(status.version.as_deref(), Some("test.1.0"));

        let entries = list_entries(&connection, Some("bazi")).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].author_name, "李双林");
        assert!(list_entries(&connection, Some("qimen")).unwrap().is_empty());

        assert_eq!(case_content(&connection, &key, &bundle.cases[0].id).unwrap(), bundle.cases[0].content);
        assert_eq!(author_profile(&connection, &key, "lishuanglin").unwrap(), "# 李双林介绍");
    }

    #[test]
    fn database_copied_to_another_machine_cannot_decrypt() {
        let connection = Connection::open_in_memory().unwrap();
        initialize(&connection).unwrap();
        let bundle = sample_bundle();
        let machine_a_key = crypto::derive_local_key("ORBIS-A8F2-9901-7BC3", "ACT-VALID").unwrap();
        import_bundle(&connection, "ORBIS-A8F2-9901-7BC3", "ACT-VALID", &bundle, &machine_a_key).unwrap();

        let machine_b_key = crypto::derive_local_key("ORBIS-BB12-3456-7890", "ACT-VALID").unwrap();
        assert!(
            case_content(&connection, &machine_b_key, &bundle.cases[0].id).is_err(),
            "他机 LocalKey 读取密文必须失败"
        );

        // 激活记录绑定原机器：load_local_key 的前置校验场景。
        let (stored_machine,): (String,) = connection
            .query_row("SELECT machine_id FROM activation_status WHERE id = 1", [], |row| Ok((row.get(0)?,)))
            .unwrap();
        assert_eq!(stored_machine, "ORBIS-A8F2-9901-7BC3");
        assert_ne!(stored_machine, "ORBIS-BB12-3456-7890");
    }
}

fn now_iso() -> String {
    // 激活时间仅用于展示；避免为时间戳引入额外依赖，用标准库实现 UTC ISO 格式。
    let seconds = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0);
    let days = seconds.div_euclid(86_400);
    let secs_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year,
        month,
        day,
        secs_of_day / 3600,
        (secs_of_day % 3600) / 60,
        secs_of_day % 60
    )
}

/// Howard Hinnant 的 days-from-civil 逆变换：unix 天数 → (年, 月, 日)。
fn civil_from_days(days: i64) -> (i64, u32, u32) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let year = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let month = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if month <= 2 { year + 1 } else { year }, month, day)
}
