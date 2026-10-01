# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-01 20:07:53 +0800
**Commit:** 449ee8c
**Branch:** Dev

## OVERVIEW
Orbis（reticle-bazi）是 React + TypeScript + Vite 前端项目，核心是八字/奇门排盘与案例阅读。数据层以本地 Markdown 与单工作区私有存储运行，WebDAV 仅用于备份。

## STRUCTURE
```text
Orbis/
├── src/
│   ├── components/Modules/   # 业务模块入口（Bazi/Qimen/CaseStudy/Wannianli）
│   ├── lib/                  # 领域计算与算法实现
│   ├── services/             # 本地存储、备份与案例业务 IO
│   ├── hooks/                # 跨组件状态聚合与逻辑编排
│   └── data/cases/           # 案例语料还原目录（源库为私有仓 orbis-lore，不入库）
├── .agent/rules/             # 代理规则（中文输出等）
├── docs/
└── AGENTS.md
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 应用启动与挂载 | `src/main.tsx` | React root 挂载 |
| 顶层模块切换/Provider 组合 | `src/App.tsx` | Bazi provider + 主视图切换 |
| 八字领域算法 | `src/lib/xuan-bazi` | maps/settings/utils 三层拆分 |
| 奇门领域算法 | `src/lib/csp-qimen` | 含 WASM 初始化与结果转换 |
| 服务层行为 | `src/services` | 本地业务服务与 WebDAV 备份 |
| 大型业务模块 UI | `src/components/Modules` | Bazi/Qimen/Wannianli/CaseStudy |
| 案例静态语料 | orbis-lore 私有仓 → `src/data/cases` | 明文源已迁出主仓，`npm run cases:unpack` 还原 |
| 案例加密包签发/打包 | `scripts/cases-keygen.ts` `scripts/pack-cases.ts` | 作者端工具：Ed25519 密钥、激活码、AES-256-GCM 加密包 |
| 案例离线安全层 | `src-tauri/src/cases/` | 机器码、验签、内置包内存解密（build.rs 嵌入，无需云端）、一机一密落盘 |

## CODE MAP
| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `App` | Function | `src/App.tsx` | High | 顶层容器 |
| `AppContent` | Function | `src/App.tsx` | High | 模块渲染切换 |
| `useBazi` | Hook | `src/hooks/useBazi.ts` | High | 八字状态与加载编排 |
| `useQimenState` | Hook | `src/components/Modules/Qimen/hooks/useQimenState.ts` | High | 奇门页面核心状态 |
| `baziCaseService` | Service | `src/services/baziCaseService.ts` | Medium | 八字案例 CRUD |
| `qimenCaseService` | Service | `src/services/qimenCaseService.ts` | Medium | 奇门案例 CRUD |
| `localPrivateStore` | Local Store | `src/services/localPrivateStore.ts` | High | 本地私有数据统一入口 |

## SUBDIRECTORY AGENTS
- `src/components/Modules/AGENTS.md`：业务模块 UI 边界、模块间职责。
- `src/lib/xuan-bazi/AGENTS.md`：八字算法分层与映射规则。
- `src/lib/csp-qimen/AGENTS.md`：奇门算法、常量治理、WASM 约束。
- `src/services/AGENTS.md`：服务层错误处理、数据边界。
- `src/hooks/AGENTS.md`：业务 hooks 组织与副作用约束。
- `src/data/cases/AGENTS.md`：Markdown 案例语料维护规则。

## CONVENTIONS
- 输出语言强制简体中文；不输出内部推理；遵守 `.agent/rules/GEMINI.md`。
- TypeScript 严格模式：`strict`、`noUnusedLocals`、`noUnusedParameters`、`noUncheckedSideEffectImports`。
- 模块解析为 bundler 模式；类型导入优先 `import type`。
- UI 层保持组合职责，计算/聚合逻辑优先放 hooks/lib/services。
- 样式基于 Tailwind + CSS 变量 token；暗色切换走 `class`。
- 涉及 UI、样式、组件视觉或设计 token 的任务，必须先阅读根目录 `DESIGN.md`；修改设计规范后运行 `design.md lint DESIGN.md`。

## UI 验收与交付规则（重要）
- **UI 验证由用户人工完成，AI 不要在界面验证上耗时**。不要为了「看一眼效果」去反复截图、
  导航界面、点控件、定位元素或抓取 DOM；这些操作对交付没有价值，且极其浪费时间。
- **AI 的职责边界**：改完代码 → 通过静态自检（`npm run lint`、`npx tsc -b`）→ **把包构建出来** → 交付并说明构建产物路径。
- **构建方式视目标端而定**，桌面端与移动端同一规则：
  - 移动端：**默认一律构建 debug 包**（用户没有明确点名 release 时不得构建 release）：
    按 `orbis-build-env` skill 执行 `npx tauri android build --apk --debug --target aarch64`，
    产物 `app-universal-debug.apk`（包名 `com.orbis.app.debug`），`adb install -r` 覆盖安装、保留数据。
  - 移动端 release（`npx tauri android build --target aarch64`，包名 `com.orbis.app`）**仅在用户明确要求
    release / 正式交付时构建**；与手机上已装的 debug 包并存为两个图标，属预期。
  - 桌面端：`npm run tauri:build`。
- **例外（仅限这些情况才可做界面检查）**：用户明确要求截图/验证；或需要排查
  「构建是否成功」「资源是否加载」这类无法靠静态检查确认的链路问题时，最多确认一次，不要反复试。
- 若确实需要给出视觉效果，优先产出 `design-demos/` 下的可交互 demo 让用户自己打开看，
  而不是 AI 在设备上截图。

## ANTI-PATTERNS (THIS PROJECT)
- 不要提交 `.env`、`keys/`、`dist-cases/`。
- 不要把 `src/data/cases` 语料（除 README/AGENTS）提交到主仓或公开远端；语料源库为私有仓 orbis-lore。
- 不要在 UI 层复制算法常量或映射表，优先复用领域层导出。
- 案例服务直接抛出业务错误，调用方负责展示可理解的提示。
- 案例正文明文只允许存在于内存；不得写入 localStorage/日志/明文文件。

## UNIQUE STYLES
- `src/services/localPrivateStore.ts` 在 Tauri 使用 SQLite，在浏览器使用 IndexedDB，所有数据属于当前单一本地工作区。
- `src/lib/csp-qimen/CONSTANTS.md` 维护常量分层与复用规则。
- `src/data/cases` 以目录命名编码领域标签（术数流派/日主/主题）。

## COMMANDS
```bash
npm install
npm run dev
npm run build
npm run lint
npx tsc -b
npm run cases:keygen -- init-keys          # 作者端：生成密钥（keys/，已 gitignore）
npm run cases:keygen -- sign --machine <ID> # 作者端：签发激活码
npm run cases:keygen -- set-master-password # 作者端：设置/清除管理密码（面对面激活，仅哈希入库）
npm run cases:keygen -- export-signing      # 作者端：封印私钥供管理员版应用内签发（keys/signing_blob.rs）
npm run tauri:build                          # 构建普通版（无私钥材料，可在 GitHub Actions 跑）
npm run tauri:build:admin                    # 构建管理员版（--features admin-signing，仅作者本机）
npm run cases:pack                          # 作者端：打包加密案例包 → dist-cases/cases_v1.enc（构建时嵌入客户端）
npm run cases:unpack                        # 开发机：解密 orbis-lore 加密包 → 还原 src/data/cases 语料目录
npm run cases:previews                      # 作者端：生成每分类 2 篇试读样章 → src/lib/caseStudy/casePreviews.generated.ts
npm run android:icons                       # 安卓端：重生成自适应图标前景（tauri icon 会把图案铺满画布，跑过它之后必须重跑）
cargo test                                  # 在 src-tauri 内运行 Rust 安全层测试
npm run worktree:create                     # 创建并初始化隔离的 Orbis worktree 开发环境
npm run worktree:build                      # 在 worktree 内执行完整自检与构建 (lint + tsc + test + build)
npm run worktree:remove -- -p <path>        # 安全回收指定 worktree 及临时分支
```

## NOTES
- 开发端口固定 `9898`，`/api` 代理到 `http://localhost:8000`。
- 测试为 `npm test`（vitest 前端）+ `cargo test`（Rust 安全层）；验证以 lint + typecheck + build 为主。
- 当修改子域规则时，同步更新对应子目录 `AGENTS.md`，避免只改根文档。
