# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-01 20:07:53 +0800
**Commit:** 449ee8c
**Branch:** Dev

## OVERVIEW
Orbis（reticle-bazi）是 React + TypeScript + Vite 前端项目，核心是八字/奇门排盘与案例阅读。数据层以本地 Markdown + 可选 Supabase 混合运行。

## STRUCTURE
```text
Orbis/
├── src/
│   ├── components/Modules/   # 业务模块入口（Bazi/Qimen/CaseStudy/Wannianli）
│   ├── lib/                  # 领域计算与算法实现
│   ├── services/             # Supabase/案例服务与业务 IO
│   ├── hooks/                # 跨组件状态聚合与逻辑编排
│   └── data/cases/           # 大规模 Markdown 案例语料
├── .agent/rules/             # 代理规则（中文输出等）
├── docs/
└── AGENTS.md
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 应用启动与挂载 | `src/main.tsx` | React root 挂载 |
| 顶层模块切换/Provider 组合 | `src/App.tsx` | Auth/Bazi provider + 主视图切换 |
| 八字领域算法 | `src/lib/xuan-bazi` | maps/settings/utils 三层拆分 |
| 奇门领域算法 | `src/lib/csp-qimen` | 含 WASM 初始化与结果转换 |
| 服务层行为 | `src/services` | auth 与 case 错误模式不同 |
| 大型业务模块 UI | `src/components/Modules` | Bazi/Qimen/Wannianli/CaseStudy |
| 案例静态语料 | `src/data/cases` | 以 Markdown 为主，体量大 |

## CODE MAP
| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `App` | Function | `src/App.tsx` | High | 顶层容器 |
| `AppContent` | Function | `src/App.tsx` | High | 模块渲染切换 |
| `useBazi` | Hook | `src/hooks/useBazi.ts` | High | 八字状态与加载编排 |
| `useQimenState` | Hook | `src/components/Modules/Qimen/hooks/useQimenState.ts` | High | 奇门页面核心状态 |
| `baziCaseService` | Service | `src/services/baziCaseService.ts` | Medium | 八字案例 CRUD |
| `qimenCaseService` | Service | `src/services/qimenCaseService.ts` | Medium | 奇门案例 CRUD |
| `supabase` | Proxy Client | `src/lib/supabase.ts` | High | 在线/离线统一入口 |

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

## ANTI-PATTERNS (THIS PROJECT)
- 不要提交 `.env`。
- 不要在 UI 层复制算法常量或映射表，优先复用领域层导出。
- 不要把新的案例服务错误处理写成与既有模式冲突（auth 返回 `{ error }`，case service 抛错）。
- 不要假设测试脚本存在；当前仓库无 `npm test`。

## UNIQUE STYLES
- `src/lib/supabase.ts` 支持 `VITE_SUPABASE_ANON_KEY_PART1/2/3` 分段拼接与离线降级 Proxy。
- `src/lib/csp-qimen/CONSTANTS.md` 维护常量分层与复用规则。
- `src/data/cases` 以目录命名编码领域标签（术数流派/日主/主题）。

## COMMANDS
```bash
npm install
npm run dev
npm run build
npm run lint
npx tsc -b
```

## NOTES
- 开发端口固定 `9898`，`/api` 代理到 `http://localhost:8000`。
- 当前未配置测试框架；验证以 lint + typecheck + build 为主。
- 当修改子域规则时，同步更新对应子目录 `AGENTS.md`，避免只改根文档。
