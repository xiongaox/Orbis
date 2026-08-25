# Tauri 迁移基线

更新时间：2026-08-25

## 分支隔离

- 工作分支：`codex/tauri-migration`
- 当前提交：`33be0cbb917a9e9d18cdf687d299dc3da8df2755`
- `main` 当前提交：`5f74bf0501b2135cc7d7cdb12db4d5645a04d26c`
- 合并基点：`33be0cbb917a9e9d18cdf687d299dc3da8df2755`
- `git log main..HEAD`：无输出，迁移分支尚未产生提交，`main` 没有新增迁移提交。

## 未提交变更清单

以下变更来自 LOCAL-13 的 Tauri 初始化与 Android Demo 验证，当前只存在于
`codex/tauri-migration` 工作区，未执行 reset、checkout 或覆盖操作：

- `package.json`、`package-lock.json`：加入 `@tauri-apps/cli` 与 `tauri` 脚本。
- `src-tauri/Cargo.toml`、`Cargo.lock`、`build.rs`：Rust/Tauri 工程依赖。
- `src-tauri/tauri.conf.json`、`capabilities/default.json`：应用与权限配置。
- `src-tauri/src/`：桌面/移动端入口代码。
- `src-tauri/gen/android/`：Tauri 生成的 Android Gradle 工程源文件；构建输出、本机路径、临时 native 产物由 `.gitignore` 排除。
- `src-tauri/icons/`：Tauri 应用图标资源。

## 当前工作区证据

执行基线检查时，`git status --short` 仅报告：

```text
 M package-lock.json
 M package.json
?? src-tauri/
```

`git diff main...HEAD` 只包含零提交差异；`git diff` 的已修改文件仅为两个 npm 清单。
工作区中的 `.env`、`dist`、`node_modules`、`.DS_Store` 以及 Android/Cargo 构建目录均被忽略，未纳入迁移变更。

## 后续提交边界

后续阶段应在本分支上分阶段提交上述源文件与配置；不得把 Android SDK、Gradle 缓存、`target`、APK 输出、签名文件或含本机路径的配置提交到 Git。正式发布前另行处理 ABI 拆分、签名和生产包标识。

## LOCAL-16 私有数据本地化

- `src/services/localPrivateStore.ts` 是统一私有数据边界：Tauri 使用 `sqlite:orbis-private.db`，浏览器开发/预览环境使用 IndexedDB（无 IndexedDB 的测试环境使用内存降级）。
- SQLite 初始化会幂等创建 `schema_migrations` 与 `private_records`，迁移版本写入使用 `INSERT OR IGNORE`，重复启动不会重复迁移。
- 八字与奇门案例 service 已切换到本地 store，保留原有方法和返回形状；用户未登录时使用 `anonymous` 作用域，因此离线也可以 CRUD。
- `webDavBackupService` 以 JSON 快照做文件级 PUT/GET，网络失败按 0.5s、1s、2s 重试，并在 UI 中提供连接测试、备份、恢复入口。
- 入口位于头像菜单的“私有数据备份”，配置保存在本机浏览器存储中，不写入仓库或环境文件。
