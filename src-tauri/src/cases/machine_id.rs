//! 硬件指纹提取（模块 B / machine_id.rs）
//!
//! 以操作系统级稳定标识为主源：macOS 取 IOPlatformUUID，Windows 取注册表
//! MachineGuid，Linux 取 /etc/machine-id。对原始值做 SHA-256 后格式化为
//! 16 位易读机器码（ORBIS-XXXX-XXXX-XXXX）。主源不可用时回退到
//! 主机名 + 用户名的弱指纹，保证命令可用但记录告警。

use sha2::{Digest, Sha256};

/// 与 scripts/cases-keygen.ts 约定的机器码前缀。
pub const MACHINE_ID_PREFIX: &str = "ORBIS";

pub fn machine_id() -> String {
    let raw = raw_fingerprint().unwrap_or_else(|cause| {
        log::warn!("硬件指纹主源读取失败（{}），回退到弱指纹", cause);
        fallback_fingerprint()
    });
    format_machine_id(&raw)
}

/// 将任意原始指纹散列并格式化为 ORBIS-XXXX-XXXX-XXXX（12 位十六进制）。
fn format_machine_id(raw: &str) -> String {
    let digest = Sha256::digest(raw.as_bytes());
    let hex = hex::encode(digest).to_uppercase();
    let body = &hex[..12];
    format!(
        "{}-{}-{}-{}",
        MACHINE_ID_PREFIX,
        &body[0..4],
        &body[4..8],
        &body[8..12]
    )
}

fn raw_fingerprint() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        read_macos_platform_uuid()
    }
    #[cfg(target_os = "windows")]
    {
        read_windows_machine_guid()
    }
    #[cfg(target_os = "linux")]
    {
        read_linux_machine_id()
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err("当前平台无硬件指纹实现".to_string())
    }
}

#[cfg(target_os = "macos")]
fn read_macos_platform_uuid() -> Result<String, String> {
    let output = std::process::Command::new("ioreg")
        .args(["-rd1", "-c", "IOPlatformExpertDevice"])
        .output()
        .map_err(|cause| format!("无法执行 ioreg: {}", cause))?;
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        if line.contains("\"IOPlatformUUID\"") {
            if let Some(value) = line.split("\" = \"").nth(1) {
                return Ok(value.trim_end_matches('"').trim().to_string());
            }
        }
    }
    Err("ioreg 输出中未找到 IOPlatformUUID".to_string())
}

#[cfg(target_os = "windows")]
fn read_windows_machine_guid() -> Result<String, String> {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;
    let crypto = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey(r"SOFTWARE\Microsoft\Cryptography")
        .map_err(|cause| format!("无法打开注册表 Cryptography: {}", cause))?;
    let guid: String = crypto
        .get_value("MachineGuid")
        .map_err(|cause| format!("注册表缺少 MachineGuid: {}", cause))?;
    Ok(guid)
}

#[cfg(target_os = "linux")]
fn read_linux_machine_id() -> Result<String, String> {
    for path in ["/etc/machine-id", "/var/lib/dbus/machine-id"] {
        if let Ok(text) = std::fs::read_to_string(path) {
            let trimmed = text.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }
    }
    Err("未找到 /etc/machine-id".to_string())
}

fn fallback_fingerprint() -> String {
    let host = std::env::var("HOSTNAME").or_else(|_| std::env::var("COMPUTERNAME")).unwrap_or_default();
    let user = std::env::var("USER").or_else(|_| std::env::var("USERNAME")).unwrap_or_default();
    format!("fallback|{}|{}", host, user)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn machine_id_matches_contract_format() {
        let id = machine_id();
        let body = id.strip_prefix("ORBIS-").expect("必须以 ORBIS- 开头");
        assert_eq!(id.len(), 20, "总长应为 20：ORBIS- + 12 位十六进制 + 3 个连字符");
        for group in body.split('-') {
            assert_eq!(group.len(), 4);
            assert!(group.chars().all(|c| c.is_ascii_hexdigit()), "分组必须为十六进制：{}", group);
        }
    }

    #[test]
    fn format_is_deterministic() {
        assert_eq!(format_machine_id("raw-a"), format_machine_id("raw-a"));
        assert_ne!(format_machine_id("raw-a"), format_machine_id("raw-b"));
    }
}
