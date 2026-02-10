# Orbis（reticle-bazi）- AGENTS 指南

本仓库是 React + TypeScript + Vite 的前端项目（Tailwind CSS）。Supabase 为可选能力。

## 语言与输出（强制）

- 无论用户输入什么语言，对用户的回复一律使用简体中文。
- 不输出内部推理；只给结论与可执行步骤，避免英文引导句（例如 "I will..."）。
- 若你的 agent 框架会读取 `.agent/rules/*`，请同时遵守其中的中文输出约束：`.agent/rules/GEMINI.md`。

## 常用命令（来自 `package.json`）

安装依赖：

```bash
npm install
```

开发服务器（Vite）：

```bash
npm run dev
```

生产构建（包含 TypeScript 类型检查）：

```bash
npm run build
```

本地预览构建产物：

```bash
npm run preview
```

代码检查（ESLint，全量）：

```bash
npm run lint
```

Lint 单文件（用于“快速验证某个改动”）：

```bash
npx eslint "src/path/to/file.tsx"
```

Lint 自动修复（项目未提供脚本，但 ESLint 支持）：

```bash
npx eslint . --fix
```

仅做类型检查（与 `npm run build` 中的 `tsc -b` 相同）：

```bash
npx tsc -b
```

类型检查（watch）：

```bash
npx tsc -b -w
```

测试（重要）：

- 当前未配置测试框架：`package.json` 没有 `test` script，仓库也没有 `*.test.* / *.spec.*` 文件。
- 因此：不存在“运行单个测试”的命令。
- 替代验证手段（不是测试）：`npm run lint` 或 `npx tsc -b`。

## 开发服务器细节（来自 `vite.config.ts`）

- Vite dev server 端口：`9898`
- `/api` 代理到：`http://localhost:8000`

## 环境变量与本地配置

启用 Supabase（可选）：

```bash
cp .env.example .env
```

常用环境变量（Vite 仅暴露 `VITE_` 前缀到浏览器端）：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_ANON_KEY_PART1` / `VITE_SUPABASE_ANON_KEY_PART2` / `VITE_SUPABASE_ANON_KEY_PART3`（项目支持分段 key 拼接，见 `src/lib/supabase.ts`）
- `VITE_AUTHOR_QR_URL`（联系作者弹窗二维码，见 `src/components/Layout/Navbar.tsx`）

安全：

- 不要提交 `.env`。

## 高信号目录结构

- `src/main.tsx`：React 根挂载
- `src/App.tsx`：顶层组合（providers + 主布局/模块切换）
- `src/contexts/*`：全局上下文（例如 auth、bazi）
- `src/hooks/*`：业务 hooks（尽量把计算/聚合逻辑放这里）
- `src/components/*`：UI 组件（按 Layout / Modules / Common / UI / Auth 等组织）
- `src/services/*`：数据与集成服务（Supabase、案例 CRUD 等）
- `src/types/*`：共享 TypeScript 类型
- `src/data/*`：静态数据/配置（例如书籍配置）
- `src/utils/*`：纯工具与适配层（例如对 `lunar-typescript` 的统一封装）

## 代码风格与约定（以仓库现状为准）

TypeScript（严格）：

- `tsconfig.app.json` 启用 `strict: true`、`noUnusedLocals`、`noUnusedParameters` 等；不要通过 `any`、`@ts-ignore` 绕过类型系统。
- bundler 模式（`moduleResolution: bundler` + `verbatimModuleSyntax: true`）：类型导入用 `import type { ... }`，避免把纯类型当成运行时代码导入。
- `allowImportingTsExtensions: true`：部分文件会显式带 `.tsx` 扩展名（如 `src/main.tsx`），新增代码请跟随所在文件的既有写法。

Imports（导入顺序）：

- 常见顺序：外部包 -> 内部模块 -> type-only imports。
- 优先使用相对路径（仓库当前大量使用相对路径），避免引入新的路径别名体系。

React：

- 全部使用函数组件 + hooks。
- Context hook 的惯例：在 provider 外调用应抛错（见 `src/contexts/AuthContext.tsx`、`src/contexts/BaziContext.tsx`）。
- 组件职责清晰：布局（Layout）只负责组合，业务计算尽量下沉到 hooks/utils/services。

错误处理（两种模式并存，新增代码需保持一致）：

- auth 相关服务偏“返回 `{ error }`”模式（见 `src/services/authService.ts`）。
- case/service 相关有“记录日志 + throw Error”模式（见 `src/services/baziCaseService.ts`、`src/services/qimenCaseService.ts`）。
- UI 层尽量提供用户可理解的降级/提示，不要让异常穿透导致白屏。

格式化与代码风格（不要制造无意义 diff）：

- 仓库没有 Prettier 配置，文件之间分号/缩进风格不统一；修改时保持“就地一致”。
- ESLint 为主要静态约束：见 `eslint.config.js`。

命名：

- 组件/文件：PascalCase（例如 `Navbar.tsx`）。
- hooks：`useX`。
- 类型：PascalCase；共享类型优先放在 `src/types/*`。

样式：

- 优先 Tailwind utility classes；项目使用基于 CSS 变量的设计 token（`src/index.css` 与 `tailwind.config.js` 的 `hsl(var(--...))`）。
- 主题切换使用 `document.documentElement.classList.toggle('dark', ...)`（见 `src/components/Layout/Navbar.tsx`）。

## Supabase（可选，注意文件选择）

- 推荐使用 `src/lib/supabase.ts`：支持未配置时的“离线降级”（Proxy 模拟部分 API）。
- `src/lib/supabaseClient.ts` 返回 `SupabaseClient | null`，更像早期实现；新增/修改服务时优先跟随 `src/lib/supabase.ts` 的用法。

## Cursor / Copilot 规则

- 未发现 Cursor 规则：`.cursor/rules/`、`.cursorrules` 均不存在。
- 未发现 Copilot 规则：`.github/copilot-instructions.md` 不存在。

## 其他 agent 规则（仓库内）

- `.agent/rules/rules.md`：通用工作流/角色约束（某些工具链会自动应用）。
- `.agent/rules/GEMINI.md`：中文输出与格式要求（强制）。
