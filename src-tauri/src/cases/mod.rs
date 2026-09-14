//! 案例离线安全层（模块 B）：硬件指纹、Ed25519 验签、加密包解密与本地密文库。

pub mod bundle;
pub mod bundle_secret;
pub mod commands;
pub mod crypto;
pub mod db;
pub mod machine_id;
pub mod master_password;
#[cfg(feature = "admin-signing")]
pub mod signing;
