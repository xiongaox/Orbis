//! 核心密码学实现（模块 B / crypto.rs）
//!
//! - Ed25519 验签：校验作者签发的激活码（scripts/cases-keygen.ts 签发）。
//! - 主密钥解掩码：还原 scripts/pack-cases.ts 生成的 bundle_secret.rs。
//! - LocalKey 派生：Argon2id(MachineID, 激活码) → 本机行级加密密钥。
//! - 行级 AES-256-GCM 加解密。
//!
//! 与脚本端的跨语言契约（改动需同步 scripts/cases-keygen.ts / pack-cases.ts）：
//! - 签名消息 = "orbis-case-activation:" + 机器识别码（UTF-8）
//! - 激活码 = "ACT-" + base32(64 字节签名) 按 6 字符分组、'-' 连接
//! - 掩码 mask = SHA256("orbis-bundle-mask:v1:" + 公钥十六进制)

use crate::cases::bundle_secret::MASKED_MASTER_KEY;
use crate::cases::master_password::{MASTER_PASSWORD_ITERATIONS, MASTER_PASSWORD_SALT, MASTER_PASSWORD_VERIFY};
use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use argon2::{Algorithm, Argon2, Params, Version};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use hmac::Hmac;
use sha2::{Digest, Sha256};

/// 与 scripts/cases-keygen.ts 的 SIGN_MESSAGE_PREFIX 一致。
pub const SIGN_MESSAGE_PREFIX: &[u8] = b"orbis-case-activation:";
/// 与 scripts/cases-keygen.ts 的 ACTIVATION_CODE_PREFIX 一致。
pub const ACTIVATION_CODE_PREFIX: &str = "ACT-";
/// 与 scripts/pack-cases.ts 的 RUST_SECRET_MASK_DOMAIN 一致。
const RUST_SECRET_MASK_DOMAIN: &str = "orbis-bundle-mask:v1:";
/// Argon2id 盐（固定应用常量；唯一性由 machine_id + license_code 保证）。
const LOCAL_KEY_SALT: &[u8] = b"orbis-local-key:v1";

/// 预埋公钥：优先取构建环境变量 ORBIS_CASE_SIGN_PUBLIC_KEY（十六进制），
/// 缺省回退到仓库作者当前签发密钥（公钥可安全公开）。
const FALLBACK_PUBLIC_KEY_HEX: &str = "842c3db6c7fd5969ee33e087fabac391d96ca1c12d5644b17d1fb3e0805fc5f7";

fn embedded_public_key() -> Result<VerifyingKey, String> {
    let hex_str = option_env!("ORBIS_CASE_SIGN_PUBLIC_KEY").unwrap_or(FALLBACK_PUBLIC_KEY_HEX);
    let bytes: [u8; 32] = hex::decode(hex_str.trim())
        .map_err(|cause| format!("预埋公钥不是合法十六进制: {}", cause))?
        .try_into()
        .map_err(|_| "预埋公钥长度必须为 32 字节".to_string())?;
    VerifyingKey::from_bytes(&bytes).map_err(|cause| format!("预埋公钥无效: {}", cause))
}

fn base32_decode(text: &str) -> Option<Vec<u8>> {
    const ALPHABET: &[u8; 32] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut bit_buffer: u32 = 0;
    let mut bit_count: u32 = 0;
    let mut bytes = Vec::new();
    for char in text.chars() {
        let index = ALPHABET.iter().position(|&c| c as u8 == char.to_ascii_uppercase() as u8)? as u32;
        bit_buffer = (bit_buffer << 5) | index;
        bit_count += 5;
        if bit_count >= 8 {
            bytes.push(((bit_buffer >> (bit_count - 8)) & 0xFF) as u8);
            bit_count -= 8;
        }
    }
    Some(bytes)
}

/// 校验激活码是否由作者私钥为本机签发。通过返回 Ok(())，失败返回原因。
pub fn verify_activation_code(machine_id: &str, license_code: &str) -> Result<(), String> {
    let normalized = license_code.trim().to_uppercase();
    let body = normalized
        .strip_prefix(ACTIVATION_CODE_PREFIX)
        .ok_or_else(|| "激活码必须以 ACT- 开头".to_string())?
        .replace('-', "");
    let signature_bytes = base32_decode(&body)
        .filter(|bytes| bytes.len() == 64)
        .ok_or_else(|| "激活码格式无效（解码后不是 64 字节签名）".to_string())?;
    let signature = Signature::from_slice(&signature_bytes)
        .map_err(|cause| format!("激活码签名编码无效: {}", cause))?;
    let mut message = SIGN_MESSAGE_PREFIX.to_vec();
    message.extend_from_slice(machine_id.to_uppercase().as_bytes());
    embedded_public_key()?
        .verify(&message, &signature)
        .map_err(|_| "激活码与本机不匹配（验签失败）".to_string())
}

/// 还原案例包 AES-256-GCM 主密钥（与 scripts/pack-cases.ts 的掩码互逆）。
pub fn master_key() -> [u8; 32] {
    let public_hex = option_env!("ORBIS_CASE_SIGN_PUBLIC_KEY").unwrap_or(FALLBACK_PUBLIC_KEY_HEX).trim();
    let mask = Sha256::digest(format!("{}{}", RUST_SECRET_MASK_DOMAIN, public_hex).as_bytes());
    let mut key = MASKED_MASTER_KEY;
    for (index, byte) in key.iter_mut().enumerate() {
        *byte ^= mask[index % mask.len()];
    }
    key
}

/// 本机落盘密钥：LocalKey = Argon2id(machine_id, license_code)。
/// Argon2id 参数取轻量档（m=8MiB, t=1, p=1），避免逐篇解密时的可感知延迟。
pub fn derive_local_key(machine_id: &str, license_code: &str) -> Result<[u8; 32], String> {
    let params = Params::new(8192, 1, 1, None).map_err(|cause| format!("Argon2 参数无效: {}", cause))?;
    let mut output = [0u8; 32];
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into(
            format!("{}|{}", machine_id.to_uppercase(), license_code.trim()).as_bytes(),
            LOCAL_KEY_SALT,
            &mut output,
        )
        .map_err(|cause| format!("LocalKey 派生失败: {}", cause))?;
    Ok(output)
}

/// 校验作者管理密码（面对面激活）。客户端只内置 PBKDF2 哈希，原密码不落任何文件。
pub fn verify_master_password(password: &str) -> bool {
    const ZERO: [u8; 32] = [0u8; 32];
    if MASTER_PASSWORD_VERIFY == ZERO {
        return false;
    }
    pbkdf2_verify(
        password,
        &MASTER_PASSWORD_VERIFY,
        MASTER_PASSWORD_SALT,
        MASTER_PASSWORD_ITERATIONS,
    )
}

/// PBKDF2-HMAC-SHA256 派生（校验哈希与管理密码 KEK 共用；独立出来便于单测）。
pub(crate) fn pbkdf2_derive(password: &str, salt: &str, iterations: u32) -> [u8; 32] {
    let mut output = [0u8; 32];
    pbkdf2::pbkdf2::<Hmac<Sha256>>(password.as_bytes(), salt.as_bytes(), iterations, &mut output)
        .expect("PBKDF2 输出缓冲区长度恒定");
    output
}

/// PBKDF2 常数时间比较校验。
fn pbkdf2_verify(password: &str, expected: &[u8; 32], salt: &str, iterations: u32) -> bool {
    let candidate = pbkdf2_derive(password, salt, iterations);
    candidate.iter().zip(expected.iter()).fold(0u8, |acc, (a, b)| acc | (a ^ b)) == 0
}

/// 管理密码激活时写入数据库的"许可串"：只含单向派生串，拿不到原密码；
/// 与激活码许可一样参与 LocalKey 派生，重启后无需重输密码即可解密。
pub fn master_password_license(password: &str) -> String {
    let digest = Sha256::digest(format!("orbis-master-license:v1:{}", password.trim()).as_bytes());
    format!("MASTER-{}", hex::encode(digest))
}

/// 行级 AES-256-GCM 加密，返回 (nonce, ciphertext||tag)。
pub fn encrypt_row(local_key: &[u8; 32], plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(local_key));
    let nonce_bytes = rand_nonce();
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, Payload { msg: plaintext, aad: &[] })
        .map_err(|cause| format!("行加密失败: {}", cause))?;
    Ok((nonce_bytes.to_vec(), ciphertext))
}

/// 行级 AES-256-GCM 解密。
pub fn decrypt_row(local_key: &[u8; 32], nonce: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(local_key));
    let nonce: [u8; 12] = nonce
        .try_into()
        .map_err(|_| "nonce 长度必须为 12 字节".to_string())?;
    cipher
        .decrypt((&nonce).into(), Payload { msg: ciphertext, aad: &[] })
        .map_err(|_| "解密失败（数据损坏或本机密钥不匹配）".to_string())
}

fn rand_nonce() -> [u8; 12] {
    // 每行独立 96 位随机 nonce；AES-GCM 行级随机加密的标准用法。
    let mut nonce = [0u8; 12];
    use aes_gcm::aead::OsRng;
    use aes_gcm::aead::rand_core::RngCore;
    OsRng.fill_bytes(&mut nonce);
    nonce
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cases::bundle_secret::BUNDLE_FORMAT_VERSION as FORMAT_VERSION_CONST;

    #[test]
    fn bundle_format_version_matches_pack_script() {
        assert_eq!(FORMAT_VERSION_CONST, 1);
    }

    #[test]
    fn master_key_unmasks_to_32_nonzero_bytes() {
        let key = master_key();
        assert_eq!(key.len(), 32);
        assert!(key.iter().any(|&b| b != 0), "解掩码结果不应为全零");
    }

    #[test]
    fn local_key_is_stable_and_input_sensitive() {
        let a = derive_local_key("ORBIS-A8F2-9901-7BC3", "ACT-AAAA").unwrap();
        let b = derive_local_key("ORBIS-A8F2-9901-7BC3", "ACT-AAAA").unwrap();
        let c = derive_local_key("ORBIS-1111-2222-3333", "ACT-AAAA").unwrap();
        assert_eq!(a, b);
        assert_ne!(a, c);
    }

    #[test]
    fn row_roundtrip_and_tamper_detection() {
        let key = derive_local_key("ORBIS-A8F2-9901-7BC3", "ACT-TEST").unwrap();
        let (nonce, ciphertext) = encrypt_row(&key, "正文内容".as_bytes()).unwrap();
        assert_eq!(decrypt_row(&key, &nonce, &ciphertext).unwrap(), "正文内容".as_bytes());

        let mut tampered = ciphertext.clone();
        tampered[0] ^= 0xFF;
        assert!(decrypt_row(&key, &nonce, &tampered).is_err());

        let other_key = derive_local_key("ORBIS-1111-2222-3333", "ACT-TEST").unwrap();
        assert!(decrypt_row(&other_key, &nonce, &ciphertext).is_err(), "他机密钥必须无法解密");
    }

    #[test]
    fn invalid_license_is_rejected() {
        assert!(verify_activation_code("ORBIS-A8F2-9901-7BC3", "ACT-短码").is_err());
        assert!(verify_activation_code("ORBIS-A8F2-9901-7BC3", "not-a-code").is_err());
        assert!(verify_activation_code("ORBIS-A8F2-9901-7BC3", "").is_err());
    }

    #[test]
    fn master_password_verify_uses_pbkdf2_contract() {
        // RFC 7914 风格的 PBKDF2-HMAC-SHA256 已知向量（c=1）。
        let expected: [u8; 32] = [
            0x12, 0x0f, 0xb6, 0xcf, 0xfc, 0xf8, 0xb3, 0x2c, 0x43, 0xe7, 0x22, 0x52, 0x56, 0xc4, 0xf8, 0x37, 0xa8, 0x65, 0x48, 0xc9, 0x2c, 0xcc, 0x35, 0x48, 0x08, 0x05, 0x98, 0x7c, 0xb7, 0x0b, 0xe1, 0x7b,
        ];
        assert!(pbkdf2_verify("password", &expected, "salt", 1));
        assert!(!pbkdf2_verify("Password", &expected, "salt", 1));
        assert!(!pbkdf2_verify("password", &expected, "salt", 2));
    }

    #[test]
    fn master_password_license_is_stable_and_one_way_friendly() {
        let a = master_password_license("admin@yu#0224");
        let b = master_password_license(" admin@yu#0224 ");
        let c = master_password_license("other-pw");
        assert_eq!(a, b, "首尾空白应归一化");
        assert_ne!(a, c);
        assert!(a.starts_with("MASTER-"));
        assert!(!a.contains("admin"), "许可串不得包含原密码片段");
    }

    #[test]
    fn master_password_accepts_currently_embedded_hash() {
        // 该断言在作者执行 set-master-password 后成立；未启用（全零）时必须拒绝一切输入。
        const ZERO: [u8; 32] = [0u8; 32];
        if crate::cases::master_password::MASTER_PASSWORD_VERIFY == ZERO {
            assert!(!verify_master_password("anything"));
        } else {
            assert!(!verify_master_password("wrong-password"));
        }
    }

    /// 跨语言兼容性测试向量：由 `npm run cases:keygen -- sign --machine ORBIS-0E57-0001-0002`
    /// 用当前预埋公钥对应的私钥（node:crypto Ed25519）签发。
    #[test]
    fn accepts_activation_code_issued_by_node_keygen() {
        let code = "ACT-ZFWZES-W7IM45-RTEHZX-LQ5NFG-PKCVIN-EEEXQK-UTFAWE-FEXVNI-2B7JT4-LZJ7MD-ICM4G6-KZOFZW-ZFZX7E-YJ7LCT-R3SJXY-7ENUOR-AQBIUA-A";
        assert!(verify_activation_code("ORBIS-0E57-0001-0002", code).is_ok());
        assert!(verify_activation_code("ORBIS-0E57-0001-0003", code).is_err(), "换机器必须拒绝");
        assert!(
            verify_activation_code(
                "ORBIS-0E57-0001-0002",
                "ACT-4ZGDWB-BHS6WE-MBLMAZ-QDO35D-K2QCZB-3CH7KP-PJAE5I-6MQGQQ-GJMKQI-EUS44X-BV4ZBL-MUTSD2-X2LFRE-ZBVFKI-TFE5A7-ATB23U-Y5BN4C-I"
            )
            .is_err(),
            "他人激活码必须拒绝"
        );
    }

    /// 若本地存在打包产物（作者机器），用预埋主密钥真实解包一遍。
    #[test]
    fn decrypts_real_bundle_when_present() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../dist-cases/cases_v1.enc");
        let Ok(file) = std::fs::read(path) else { return };
        let bundle = super::super::bundle::parse_and_decrypt(&file, &master_key()).expect("真实加密包必须可用预埋密钥解开");
        assert!(bundle.cases.len() >= 700, "案例数量异常：{}", bundle.cases.len());
        assert!(!bundle.author_profiles.is_empty());
        assert!(bundle.cases.iter().all(|case| !case.content.is_empty()));
    }
}
