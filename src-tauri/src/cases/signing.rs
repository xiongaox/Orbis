//! 应用内签发（管理员版专用，cargo feature `admin-signing`）
//!
//! 管理员版构建把 Ed25519 私钥的 AES-256-GCM 封印嵌入二进制
//! （由 `npm run cases-keygen export-signing` 生成 keys/signing_blob.rs，
//! build.rs 复制到 OUT_DIR；封印密钥 = PBKDF2(管理密码, SIGNING_KEK_SALT)）。
//! 签发时输入管理密码解封私钥、对机器码出激活码；普通版构建为 None，
//! 命令在运行期直接拒绝。私钥明文不出现在任何构建产物中。

use crate::cases::crypto::{pbkdf2_derive, SIGN_MESSAGE_PREFIX};
use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use ed25519_dalek::{Signer, SigningKey};

include!(concat!(env!("OUT_DIR"), "/signing_blob.rs"));

/// 与 scripts/cases-keygen.ts 的 SIGNING_KEK_SALT 一致，改动需同步。
const SIGNING_KEK_SALT: &str = "orbis-signing-kek:v1";
/// 与 cases-keygen.ts 的 MASTER_PASSWORD_ITERATIONS 一致（同一密码体系）。
const SIGNING_KEK_ITERATIONS: u32 = crate::cases::master_password::MASTER_PASSWORD_ITERATIONS;

const ACTIVATION_CODE_PREFIX: &str = "ACT-";
const BASE32_ALPHABET: &[u8; 32] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

pub fn blob_present() -> bool {
    SIGNING_BLOB.is_some()
}

fn base32_encode(bytes: &[u8]) -> String {
    let mut bit_buffer: u32 = 0;
    let mut bit_count: u32 = 0;
    let mut output = String::new();
    for &byte in bytes {
        bit_buffer = (bit_buffer << 8) | byte as u32;
        bit_count += 8;
        while bit_count >= 5 {
            output.push(BASE32_ALPHABET[((bit_buffer >> (bit_count - 5)) & 31) as usize] as char);
            bit_count -= 5;
        }
    }
    if bit_count > 0 {
        output.push(BASE32_ALPHABET[((bit_buffer << (5 - bit_count)) & 31) as usize] as char);
    }
    output
}

fn format_activation_code(signature: &[u8; 64]) -> String {
    let encoded = base32_encode(signature);
    let groups: Vec<String> = encoded.as_bytes().chunks(6).map(|chunk| String::from_utf8_lossy(chunk).to_string()).collect();
    format!("{}{}", ACTIVATION_CODE_PREFIX, groups.join("-"))
}

fn normalize_machine_id(machine_id: &str) -> Result<String, String> {
    let normalized = machine_id.trim().to_uppercase();
    let valid = {
        let parts: Vec<&str> = normalized.split('-').collect();
        parts.len() == 4
            && parts[0] == "ORBIS"
            && parts[1..].iter().all(|part| part.len() == 4 && part.chars().all(|c| c.is_ascii_hexdigit()))
    };
    if !valid {
        return Err("机器识别码格式无效，应为 ORBIS-XXXX-XXXX-XXXX（十六进制）".to_string());
    }
    Ok(normalized)
}

fn unseal_signing_key(unlock_password: &str) -> Result<SigningKey, String> {
    let (nonce, sealed) = SIGNING_BLOB.ok_or_else(|| "当前构建未包含签发密钥（仅管理员版具备签发能力）".to_string())?;
    let kek = pbkdf2_derive(unlock_password, SIGNING_KEK_SALT, SIGNING_KEK_ITERATIONS);
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&kek));
    let plaintext = cipher
        .decrypt(Nonce::from_slice(nonce), Payload { msg: sealed, aad: &[] })
        .map_err(|_| "管理密码不正确或签发密钥已失效".to_string())?;
    let seed: [u8; 32] = plaintext.try_into().map_err(|_| "签发密钥长度异常".to_string())?;
    Ok(SigningKey::from_bytes(&seed))
}

/// 用管理密码解封私钥并为机器码签发激活码（与 cases-keygen sign 输出一致）。
pub fn sign_machine_id(machine_id: &str, unlock_password: &str) -> Result<String, String> {
    let normalized = normalize_machine_id(machine_id)?;
    let signing_key = unseal_signing_key(unlock_password)?;
    let mut message = SIGN_MESSAGE_PREFIX.to_vec();
    message.extend_from_slice(normalized.as_bytes());
    let signature = signing_key.sign(&message);
    Ok(format_activation_code(&signature.to_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base32_matches_rfc4648_vectors() {
        assert_eq!(base32_encode(b""), "");
        assert_eq!(base32_encode(b"f"), "MY");
        assert_eq!(base32_encode(b"fo"), "MZXQ");
        assert_eq!(base32_encode(b"foo"), "MZXW6");
        assert_eq!(base32_encode(b"foob"), "MZXW6YQ");
        assert_eq!(base32_encode(b"fooba"), "MZXW6YTB");
        assert_eq!(base32_encode(b"foobar"), "MZXW6YTBOI");
    }

    #[test]
    fn machine_id_is_normalized_and_validated() {
        assert_eq!(normalize_machine_id("orbis-4207-c85b-3051").unwrap(), "ORBIS-4207-C85B-3051");
        assert!(normalize_machine_id("ORBIS-GGGG-2222-3333").is_err(), "非十六进制必须拒绝");
        assert!(normalize_machine_id("ORBIS-4207-C85B").is_err());
        assert!(normalize_machine_id("").is_err());
    }

    #[test]
    fn wrong_password_cannot_unseal_when_blob_present() {
        if !blob_present() {
            return;
        }
        let result = sign_machine_id("ORBIS-4207-C85B-3051", "definitely-wrong-password");
        assert!(result.is_err(), "错误管理密码必须无法解封签发密钥");
    }

    #[test]
    fn rejects_when_blob_absent() {
        if blob_present() {
            return;
        }
        assert!(sign_machine_id("ORBIS-4207-C85B-3051", "any").is_err());
    }
}
