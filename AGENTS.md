# Orbis (reticle-bazi) - Agent Guide

This repo is a React + TypeScript + Vite frontend (Tailwind CSS). Supabase is optional.

## 全局语言规则

- 无论用户使用何种语言输入，所有对用户的回复一律使用简体中文。
- 内部推理不输出；需要解释时给出结论与可执行步骤，避免英文引导句（如 "I will..."）。

## Commands

Install:

```bash
npm install
```

Dev server:

```bash
npm run dev
```

Build (includes TypeScript project build first):

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

Lint a single file:

```bash
npx eslint "src/path/to/file.tsx"
```

Lint with autofix (not a package script, but supported):

```bash
npx eslint . --fix
```

Typecheck only (same `tsc -b` used by build):

```bash
npx tsc -b
```

Typecheck (watch):

```bash
npx tsc -b -w
```

Tests:

- No test runner is configured (no `test` script in `package.json`).
- There is no supported "run a single test" command until a test framework is added.

## Environment

- Copy the example env file if you want Supabase enabled:

```bash
cp .env.example .env
```

- Required env vars (only needed if you use Supabase features):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

Notes:

- Do not commit `.env` (it typically contains secrets).
- Vite only exposes env vars prefixed with `VITE_` to the browser.

## Dev server details

- Vite dev server port: `9898` (`vite.config.ts`).
- Proxy: requests under `/api` are proxied to `http://localhost:8000`.

## Repo layout (high-signal)

- `src/main.tsx`: React root.
- `src/App.tsx`: top-level app composition (providers + main layout switching).
- `src/contexts/*`: React context providers (e.g., auth, bazi).
- `src/components/*`: UI components and module pages.
- `src/services/*`: data and integration services (Supabase auth, case services, etc.).
- `src/types/*`: shared TypeScript types.
- `src/data/*`: bundled data (books/cases/config).

## Code style (repo-grounded)

### TypeScript

- TypeScript is strict (`tsconfig.app.json` has `strict: true` + unused checks).
- Prefer real types over `any`; follow existing patterns (interfaces for object shapes, type aliases for unions).
- Use `import type { ... }` for type-only imports (already used in `src/App.tsx`).
- Bundler mode is enabled (`moduleResolution: bundler`, `verbatimModuleSyntax: true`).

### React

- Functional components + hooks.
- Context hooks are expected to throw if used outside the provider (see `src/contexts/AuthContext.tsx`).
- Keep changes local: avoid broad refactors or mass formatting changes unless explicitly requested.

### Imports

- Typical ordering (observed across the repo):
  1. External packages
  2. Internal modules (relative imports)
  3. Type-only imports via `import type`
- Follow the file's existing convention for TS extension imports (e.g., `src/main.tsx` imports `./App.tsx`).

### Formatting

- ESLint is configured (`eslint.config.js`) with recommended JS/TS + React hooks + React refresh rules.
- There is no repo-level Prettier config; formatting varies by file (indentation and semicolons differ).
- Rule of thumb: preserve the surrounding file's formatting and keep diffs minimal.

### Naming

- Components: PascalCase filenames (e.g., `CaseList.tsx`).
- Hooks: `useX` pattern in `src/hooks/*`.
- Types: PascalCase (e.g., `ChartType`).

### Error handling

- Prefer explicit, user-safe fallbacks rather than throwing from UI paths.
- Service APIs often return `{ error }` objects instead of throwing (see `src/services/authService.ts`).
- Log unexpected failures with context (existing code uses `console.error(...)`).

### Styling

- Tailwind is used; prefer Tailwind utility classes in TSX.

## AI / agent instructions in this repo

- No Cursor rules found (`.cursor/rules/` and `.cursorrules` are absent).
- No GitHub Copilot instructions found (`.github/copilot-instructions.md` is absent).

Additional agent-related rules exist under `.agent/`:

- `.agent/rules/rules.md`: always-on role/workflow guidance.
- `.agent/rules/GEMINI.md`: requires Simplified Chinese for agent communication/output in that toolchain.

If you are running an agent that reads `.agent/rules/*`, follow those rules for language/formatting.
