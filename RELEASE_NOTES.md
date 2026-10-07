## 🚀 Orbis v2.1.0 更新日志

### 为什么是大版本：从网页版转向本地应用

Orbis 此前是 Vite 构建的纯网页应用：页面托管在 Vercel / Cloudflare，数据同步依赖 Supabase 云数据库。实际使用中暴露了三个问题：

- **无法打包**：网页应用始终要「打开浏览器才能用」，无法像常规软件那样安装进系统、点击图标离线启动；
- **访问偏慢**：云端页面受部署平台与网络环境影响，首次加载与弱网环境下的体验明显不如本地应用；
- **Supabase 低频访问会冻结数据库**：项目转为个人自用后访问频率不高，数据库闲置一段时间即被暂停，需要登录控制台手动恢复，非常麻烦。

因此自 v2.0.0-beta 起整体迁移至 Tauri：界面与功能保持不变，运行壳换成系统 WebView 的本地应用，数据全部存放在本机私有存储（SQLite / IndexedDB），WebDAV / S3 降级为纯备份手段；打包、签名、自动发布链路也随之建立。**本版本是迁移完成后的第一个正式版。**

### 本版变更（v2.0.0-beta → v2.1.0）

- 【发布】Windows x64 / x86、macOS Apple Silicon / Intel、Android arm64 全平台安装包，推一次标签全平台自动出包
- 【新增】GitHub Release 直连下载：安装包带版本号，不再需要到 Actions 里翻 zip
- 【新增】应用内「检查更新」与「更新日志」：移动端个人中心与桌面端菜单均可一键检查新版本
- 【新增】安卓云端构建与正式签名，可与已装版本覆盖升级
- 【优化】安装包英文化：安装路径与主程序统一为 orbis，默认安装到系统 Program Files
- 【修复】Windows 安装器无 LOGO 图标的问题
- 【修复】移动端网页底栏被浏览器工具栏遮挡（视口高度改用 dvh 动态适配）

> 迁移期（v2.0.0-beta → v2.0.5-beta）的逐日变更见应用内「更新日志」：移动端在「个人中心 → 版本」，桌面端在右上角菜单 → 「更新日志」。

## 📦 安装包说明

- **Windows x64 推荐版**：`orbis_2.1.0_x64-setup.exe`，适用于 64 位 Windows 系统，默认安装到 `C:\Program Files\orbis`
- **Windows x86 兼容版**：`orbis_2.1.0_x86-setup.exe`，适用于 32 位系统环境，默认安装到 `C:\Program Files (x86)\orbis`
- **macOS M 芯片（Apple Silicon）**：`orbis_2.1.0_aarch64.dmg`
- **macOS Intel 芯片**：`orbis_2.1.0_x64.dmg`
- **macOS 提示**：安装包未经 Apple 公证，首次打开若提示「已损坏，无法打开」，将 orbis.app 拖入应用程序文件夹后，在终端执行 `sudo xattr -r -d com.apple.quarantine /Applications/orbis.app`，再打开即可
- **Android（arm64）**：`orbis_2.1.0_release.apk`，适用于主流 64 位安卓机型，正式签名，可与已装版本覆盖升级

> iOS 版本暂未提供正式签名包：可到 Actions 的 `ios-build` 工作流下载未签名 ipa，用个人 Apple ID 签名后侧载。
