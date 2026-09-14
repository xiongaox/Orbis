use std::path::PathBuf;

fn main() {
    let out_dir = PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR must be set"));
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR must be set"));

    // 将作者端打包产物 dist-cases/cases_v1.enc 嵌入二进制（约 2.3MB）。
    // 未打包的开发环境写入空占位文件保证可编译；激活时给出明确指引。
    let source = manifest_dir.join("../dist-cases/cases_v1.enc");
    let target = out_dir.join("cases_v1.enc");
    if source.is_file() {
        std::fs::copy(&source, &target).expect("复制案例加密包失败");
        println!("cargo:rerun-if-changed={}", source.display());
    } else {
        std::fs::write(&target, []).expect("写入案例包占位文件失败");
        println!("cargo:warning=未找到 dist-cases/cases_v1.enc，本次构建不含案例包（先运行 npm run cases:pack）");
    }

    // 管理员版签发密钥封印（keys/signing_blob.rs，gitignored）。
    // 普通版（GitHub Actions）没有该文件，写入 None 占位，签发命令在运行期拒绝。
    let signing_source = manifest_dir.join("../keys/signing_blob.rs");
    let signing_target = out_dir.join("signing_blob.rs");
    if signing_source.is_file() {
        std::fs::copy(&signing_source, &signing_target).expect("复制签发密钥封印失败");
        println!("cargo:rerun-if-changed={}", signing_source.display());
    } else {
        std::fs::write(
            &signing_target,
            "pub const SIGNING_BLOB: Option<(&[u8; 12], &[u8; 48])> = None;\n",
        )
        .expect("写入签发密钥占位失败");
    }

    tauri_build::build()
}
