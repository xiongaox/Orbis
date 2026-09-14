//! 加密包解析（模块 B / bundle.rs）
//!
//! 文件格式契约（与 scripts/pack-cases.ts 一致，勿随意变更）：
//!   [0..8)   magic "ORBSCSv1"
//!   [8..10)  格式版本 u16 LE（当前 1）
//!   [10..22) AES-256-GCM nonce（12 字节）
//!   [22..)   密文（末尾 16 字节为 auth tag）；明文为 Gzip(JSON)

use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use serde::Deserialize;
use std::io::Read;

const BUNDLE_MAGIC: &[u8; 8] = b"ORBSCSv1";

/// 随应用内置的加密案例包（build.rs 从 dist-cases/cases_v1.enc 嵌入；空字节表示未内置）。
pub static EMBEDDED_BUNDLE: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/cases_v1.enc"));

pub fn embedded_bundle() -> Option<&'static [u8]> {
    (!EMBEDDED_BUNDLE.is_empty()).then_some(EMBEDDED_BUNDLE)
}

#[derive(Deserialize)]
pub struct BundleCase {
    #[allow(dead_code)]
    pub id: String,
    pub title: String,
    pub domain: String,
    pub author_key: String,
    pub author_name: String,
    pub category: String,
    pub summary: String,
    pub content: String,
}

#[derive(Deserialize)]
struct RawBundle {
    version: String,
    #[serde(default)]
    cases: Vec<BundleCase>,
    #[serde(default, rename = "authorProfiles")]
    author_profiles: std::collections::HashMap<String, String>,
}

pub struct DecryptedBundle {
    pub version: String,
    pub cases: Vec<BundleCase>,
    pub author_profiles: std::collections::HashMap<String, String>,
}

/// 内存中完成校验、解密与解压；任何一步失败都返回可读错误。
pub fn parse_and_decrypt(file: &[u8], master_key: &[u8; 32]) -> Result<DecryptedBundle, String> {
    if file.len() < 22 + 16 || &file[0..8] != BUNDLE_MAGIC {
        return Err("加密包头部无效（缺少 ORBSCSv1 魔数或文件被截断）".to_string());
    }
    let format_version = u16::from_le_bytes([file[8], file[9]]);
    if format_version != crate::cases::bundle_secret::BUNDLE_FORMAT_VERSION {
        return Err(format!("不支持的加密包格式版本：{}", format_version));
    }
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(master_key));
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&file[10..22]), Payload { msg: &file[22..], aad: &[] })
        .map_err(|_| "加密包解密失败（密钥不匹配或数据损坏）".to_string())?;

    let mut gzip = flate2::read::GzDecoder::new(&plaintext[..]);
    let mut json = Vec::new();
    gzip.read_to_end(&mut json).map_err(|cause| format!("加密包解压失败: {}", cause))?;

    let raw: RawBundle = serde_json::from_slice(&json).map_err(|cause| format!("加密包内容解析失败: {}", cause))?;
    Ok(DecryptedBundle {
        version: raw.version,
        cases: raw.cases,
        author_profiles: raw.author_profiles,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    /// 用固定密钥手工构造一个最小加密包，验证 Rust 侧解包链路。
    fn seal(payload: &[u8], key: &[u8; 32]) -> Vec<u8> {
        use aes_gcm::aead::OsRng;
        use aes_gcm::aead::rand_core::RngCore;
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let ciphertext = cipher
            .encrypt(Nonce::from_slice(&nonce_bytes), Payload { msg: payload, aad: &[] })
            .unwrap();
        let mut file = Vec::new();
        file.extend_from_slice(BUNDLE_MAGIC);
        file.extend_from_slice(&1u16.to_le_bytes());
        file.extend_from_slice(&nonce_bytes);
        file.extend_from_slice(&ciphertext);
        file
    }

    #[test]
    fn parses_sealed_bundle() {
        let key = [7u8; 32];
        let payload = flate2::write::GzEncoder::new(
            Vec::new(),
            flate2::Compression::default(),
        );
        let mut payload = payload;
        payload
            .write_all(
                r#"{"version":"t1","cases":[{"id":"bazi/a/x.md","title":"t","domain":"bazi","author_key":"a","author_name":"甲","category":"c","summary":"s","content":"正文"}],"authorProfiles":{"a":"生平"}}"#.as_bytes(),
            )
            .unwrap();
        let file = seal(&payload.finish().unwrap(), &key);
        let bundle = parse_and_decrypt(&file, &key).unwrap();
        assert_eq!(bundle.version, "t1");
        assert_eq!(bundle.cases.len(), 1);
        assert_eq!(bundle.cases[0].content, "正文");
        assert_eq!(bundle.author_profiles.get("a").map(String::as_str), Some("生平"));
    }

    #[test]
    fn rejects_bad_magic_and_wrong_key() {
        let key = [7u8; 32];
        let file = seal(b"{}" , &key);
        assert!(parse_and_decrypt(&file, &[8u8; 32]).is_err(), "错误密钥必须失败");
        let mut broken = file.clone();
        broken[3] = b'X';
        assert!(parse_and_decrypt(&broken, &key).is_err(), "魔数损坏必须失败");
    }

    /// 若构建时嵌入了真实案例包，验证内置字节可直接解包。
    #[test]
    fn decrypts_embedded_bundle_when_present() {
        let Some(file) = embedded_bundle() else { return };
        let key = crate::cases::crypto::master_key();
        let decrypted = parse_and_decrypt(file, &key).expect("内置加密包必须可用预埋密钥解开");
        assert!(decrypted.cases.len() >= 700, "内置案例数量异常：{}", decrypted.cases.len());
    }
}
