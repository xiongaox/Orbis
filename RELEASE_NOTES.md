## 🚀 Orbis v0.1.0 更新日志

- 【新增】移动端网页体验修复：手机浏览器中底部导航不再被浏览器工具栏遮挡（视口高度改用 dvh 动态适配）
- 【新增】三平台云端发布链路：推 `v*` 标签自动构建并发布到 GitHub Release，直连下载安装包
- 【新增】安装包英文化：安装目录、安装包与主程序统一为 orbis，默认安装到系统 Program Files
- 【修复】Windows 安装包缺少 LOGO 图标的问题（安装器与卸载器均已应用应用图标）
- 【优化】安装包覆盖全平台：macOS 区分 Apple Silicon 与 Intel 芯片，Windows 区分 64 位与 32 位

## 📦 安装包说明

- **Windows x64 推荐版**：`orbis_0.1.0_x64-setup.exe`，适用于 64 位 Windows 系统，默认安装到 `C:\Program Files\orbis`
- **Windows x86 兼容版**：`orbis_0.1.0_x86-setup.exe`，适用于 32 位系统环境，默认安装到 `C:\Program Files (x86)\orbis`
- **macOS M 芯片（Apple Silicon）**：`orbis_0.1.0_aarch64.dmg`
- **macOS Intel 芯片**：`orbis_0.1.0_x64.dmg`
- **Android（arm64）**：`orbis_0.1.0_release.apk`，适用于主流 64 位安卓机型，正式签名，可与已装版本覆盖升级

> iOS 版本暂未提供正式签名包：可到 Actions 的 `ios-build` 工作流下载未签名 ipa，用个人 Apple ID 签名后侧载。
