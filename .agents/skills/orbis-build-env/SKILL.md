---
name: orbis-build-env
description: 仅在 Orbis 项目中使用；用户输入包含「构建」关键词，或要求执行任何构建/自检任务（npm run build、tauri:build、tauri android 打包、cargo test、lint+tsc、worktree:build 等）时，必须先读本 skill，直接使用本机已探明的 macOS 工具链路径与环境变量，禁止重新搜索探测工具位置。含 Windows 环境占位段（待补）。
---

# Orbis 构建环境（macOS）

## 触发条件

- 用户输入包含「构建」关键词，一律先读完本 skill 再动手。
- 要求执行 `npm run build`、`npm run tauri:build`、`npm run tauri:build:admin`、`tauri android build`、`cargo test`、`npm run worktree:build` 等任何依赖本机工具链的命令时同样适用。

## 0. 环境变量（已持久化，但 agent 仍须显式导出）

`JAVA_HOME`、`ANDROID_HOME`、`ANDROID_SDK_ROOT`、`NDK_HOME` 已于 2026-09-29 写入 `~/.zshrc` 的「Orbis build env」块，用户自己的终端开箱即用。

⚠️ **但 agent 的执行 shell 通常是非交互的（`bash -c` / `sh`），读不到 `.zshrc`** —— 所以构建命令前必须显式 export，直接复制下面这段，不要探测、不要猜测：

```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls "$ANDROID_HOME/ndk" 2>/dev/null | sort -V | tail -1)"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

## 1. 工具链清单（已逐项验证，直接使用）

| 工具 | 版本 | 位置 |
|------|------|------|
| JDK | 17.0.20.1（Homebrew `openjdk@17`） | `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home` |
| Android SDK 根目录 | — | `/opt/homebrew/share/android-commandlinetools` |
| Android platforms | android-35、android-36 | `<SDK>/platforms/` |
| Android build-tools | 35.0.0 | `<SDK>/build-tools/` |
| Android NDK | 27.2.12479018 | `<SDK>/ndk/27.2.12479018` |
| Android platform-tools | 37.0.1（含 adb） | `<SDK>/platform-tools/` |
| Rust | rustc/cargo 1.94.0（rustup 管理） | `~/.cargo/bin` |
| Rust targets | `aarch64-apple-darwin`、`aarch64-linux-android`（仅此两个） | `rustup target list --installed` |
| tauri-cli | 2.11.4（项目内 `npx tauri` 调用） | — |
| Node | v22.21.1（nvm 管理） | `~/.nvm/versions/node/v22.21.1/bin` |
| npm / pnpm | 10.9.4 / 10.26.1 | 同上 |
| Xcode | 仅 Command Line Tools（`/Library/Developer/CommandLineTools`），**无完整 Xcode** | — |
| Gradle wrapper | 8.14.3 | `src-tauri/gen/android/gradle/wrapper/` |

## 2. 本机特殊性与坑

1. Homebrew 的 openjdk 是 **keg-only**：`/opt/homebrew/bin` 里没有 `java`，全靠 `JAVA_HOME` + `PATH`（见第 0 节）。
2. 本机**没有安装 Android Studio**，标准位置 `~/Library/Android/sdk` 不存在；SDK 完全由 Homebrew（android-commandlinetools）管理。`NDK_HOME` 在 `~/.zshrc` 与第 0 节均为**动态解析**（自动取 `ndk/` 下最新版本目录），升级 NDK 后配置不会失效，只需回填第 1 节的版本号记录。
3. `sdkmanager` 在没有 `JAVA_HOME` 时会**静默失败**（输出为空）。排查 SDK 问题先确认 `JAVA_HOME`。
4. `~/.local/bin/adb` 是 **QtScrcpy 投屏工具**的软链，不是构建工具；PATH 中 SDK 的 platform-tools 已前置覆盖它，勿被误导。
5. Rust 只装了两个 target，Android 只出 arm64 包：`--target aarch64` 之外的值需先 `rustup target add`。
6. 无完整 Xcode，**不要尝试 iOS 构建**（`tauri ios` 不可用）。
7. Android 构建固定用 JDK 17。本机**仅两份真实 JDK**：`openjdk@17`（构建支柱，勿删）与 `openjdk` 26（被 jadx/yuicompressor/emscripten 依赖，勿删）；`/opt/homebrew/opt/` 下的 `openjdk@23`、`openjdk@26`、`java` 软链只是指向 26.0.2 的别名，并非独立安装，**不要**把 26 用于 Gradle。
8. Android 正式签名**已配置**（2026-09-29）：keystore 位于 `keys/orbis-android.keystore`（已被根 `.gitignore` 忽略），凭据位于 `src-tauri/gen/android/keystore.properties`（被 Tauri 模板 `.gitignore` 忽略，**密码明文就在此文件**）。`app/build.gradle.kts` 会自动加载并给 release 构建签名；keystore.properties 缺失时回退为未签名。⚠️ keystore 与密码**不可再生**——丢失后无法覆盖安装同包名的 release 应用，必须另行备份。worktree 场景：storeFile 用相对路径锚定仓库根 `keys/`，配合 worktree 技能的 keys/ 同步即可用。

## 3. 按任务速查

| 任务 | 命令 |
|------|------|
| 前端自检 | `npm run lint && npx tsc -b`（无需 Java/Android） |
| 桌面构建（普通版） | `npm run tauri:build` |
| 桌面构建（管理员版） | `npm run tauri:build:admin`（仅作者本机，需 keys/） |
| 安卓构建 | 先执行第 0 节 export 块，再 `npx tauri android build --target aarch64`（release 产物已自动正式签名） |
| Rust 安全层测试 | `cd src-tauri && cargo test`（无需 Java） |
| 安卓图标重生成 | `npm run android:icons`（tauri icon 之后必须重跑，见根 AGENTS.md） |

## 4. 环境自检（怀疑环境坏了再跑，平时跳过）

```bash
zsh -ic 'java -version; echo $ANDROID_HOME; sdkmanager --list_installed'
```

预期输出：`openjdk version "17.0.20.1"`；SDK 已装包列表含 `build-tools;35.0.0`、`ndk;27.2.12479018`、`platform-tools`、`platforms;android-35`、`platforms;android-36`。

## 5. 维护规则

- 机器环境变化（升级/更换 JDK、NDK、SDK 位置、换新 Mac）时，**同时更新两处**：`~/.zshrc` 的「Orbis build env」块 + 本 skill 第 0/1 节，并更新第 1 节各版本号。
- 每次构建会话开始时以本 skill 为唯一事实来源，不要重新全盘探测；仅当某工具按本 skill 的路径找不到时才排查并回填修正。
- Android keystore / 密码变更时：更新 `src-tauri/gen/android/keystore.properties`，并**重新异地备份** keystore 与密码。

## 6. Windows 环境（占位，待补）

> TODO(Windows)：首次在 Windows 机器上开发时补全本节，方法同 macOS 探测流程：
>
> - **签名文件迁移（最优先）**：从备份中取回 `keys/orbis-android.keystore` 与 `src-tauri/gen/android/keystore.properties`，放到仓库内**相同相对位置**（storeFile 为相对路径设计，文件内容无需修改）；两文件均被 gitignore，必须经加密压缩包/私有网盘/U盘手动传输，**严禁改 .gitignore 提交**
> - JDK 路径与版本（`where java`、`echo %JAVA_HOME%`），建议同样固定 17
> - Android SDK 位置（默认 `%LOCALAPPDATA%\Android\Sdk`）与 `ANDROID_HOME`
> - NDK 版本、Rust（`%USERPROFILE%\.cargo\bin`）与已装 targets
> - Node 安装方式与版本
> - 桌面构建产物差异（NSIS/MSI）、代码签名配置
> - 补全后同步更新本节与第 3 节命令对照
