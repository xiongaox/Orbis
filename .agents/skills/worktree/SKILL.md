---
name: worktree
description: >-
  仅在用户在对话框中显式输入 `/worktree` 斜杠命令或明确要求为当前项目创建/管理工作树时触发。
  日常对话中仅泛泛提及 "worktree" 单词时不要自动激活本技能。
  负责严格的前置未提交代码检查（若工作区有修改则必须阻断）、以 dev-<git-id> 规范创建独立工作树目录与分支、
  为新 worktree 快速软链接共享 node_modules、同步 .env/keys/dist-cases 离线案例包与密钥环境，
  支持在工作树内执行前端 lint/typecheck/build/test 及 Tauri 构建校验，并在开发完成时严格禁止自启动应用，交由用户手动调试。
---

# Orbis Git Worktree 规范工作流

本技能专为 `Orbis`（React 19 + TypeScript + Vite + Tauri）项目设计。通过用户在对话框中输入 `/worktree` 命令显式调用，用于多需求并行、实验性功能或 Agent 独立任务时安全创建并使用 `git worktree`，实现代码隔离与轻量秒级开发调试环境。

> [!NOTE]
> **触发约定**：本技能必须由用户显式输入 `/worktree`（或明确要求创建独立 worktree）时触发。若用户在日常对话中仅泛泛提及 "worktree" 词汇（无实际创建意图），不要自动执行创建流程。

---

## 核心硬性约束

1. **未提交改动安全检查（强制阻断）**：
   在执行任何 worktree 创建前，必须先在主仓库执行 `git status --porcelain`。若存在任何未提交的代码变更或未跟踪文件，**必须立即终止流程**，提示用户完成提交或暂存后再继续。
2. **分支命名与目录规范**：
   - 默认管理目录：`../worktree/Orbis/<branch-name>`（即 `/Users/xiongaox/Downloads/00code/worktree/Orbis/<branch-name>`），支持通过 `WORKTREE_BASE` 自定义。
   - 默认分支名称：`<clean-base-branch>-<git-id>`（例如当前在 `Dev` 时生成 `dev-1c6a87b9`；若有冲突则自动附加 8 位唯一随机码）。
   - ⚠️ **严格禁止在分支名中使用斜杠 `/`**（如 `feature/xxx`、`codex/xxx`）。分支中的斜杠会导致 Git refs 形成层级目录，容易在多分支合并及工具链中引发路径冲突与潜在缺陷。
3. **环境与核心资产秒级继承（Orbis 专属优化）**：
   - **`node_modules` 毫秒级软链接共享**：新工作树直接软链接主仓库的 `node_modules`，无需重新运行耗时且占空间的 `npm install`。
   - **离线案例包 (`dist-cases/`) 与作者密钥 (`keys/`) 自动就绪**：若主仓库存在被 `.gitignore` 保护的 `dist-cases/cases_v1.enc` 和 `keys/`，自动建立软链接，确保 Tauri 构建时不缺失核心案例语料和管理员签发功能。
   - **环境配置 (`.env`) 自动同步**：继承本地私有存储、WebDAV 与环境密钥。
   - **Rust 编译缓存共享**：支持通过 `--share-rust-target` 软链接复用 `src-tauri/target`，节省 15GB 空间并避免重复编译几百个 Rust crate。
4. **端口隔离规范**：
   Orbis 前端 Vite 默认固定开发端口为 `9898`。在工作树内启动调试时，推荐使用 `npm run dev -- --port 9899`，防止与主工作区的 dev 服务发生端口争用。
5. **交付阶段严禁自启动开发服务或客户端**：
   需求开发与构建完成后，**Agent 严禁在后台常驻运行 `npm run dev` 守护进程，严禁自动拉起 Tauri 桌面客户端**。验证完成后必须将启动权交由用户手动执行。

---

## 执行步骤指引

### 第一阶段：前置代码状态检查 (Pre-flight Check)

在主仓库执行检查：
```bash
git status --porcelain
```
- **若输出不为空（存在 modified, staged, untracked 等改动）**：
  **必须立即停止**后续操作，向用户输出如下提示并等待用户处理：
  > ⚠️ **检测到本地仓库有未提交的改动！**
  > 为了防止代码意外覆盖或丢失，请先提交本地 Git 改动（或执行 `git stash`）后，再继续执行 worktree 流程。
- **若输出为空（工作区干净）**：方可进入第二阶段。

---

### 第二阶段：创建并初始化 Worktree

直接调用项目内置的初始化脚本：
```bash
.agents/skills/worktree/scripts/create-worktree.sh
```
*常用可选参数：*
- `-b <branch>`：自定义分支名称（不可含 `/`）
- `--share-rust-target`：同时复用 `src-tauri/target` 编译缓存

脚本将自动完成：
1. 校验工作区纯净性。
2. 提取当前 HEAD 的 8 位提交号，生成无斜杠规范分支名（如 `dev-1c6a87b9`）。
3. 执行 `git worktree add` 创建独立目录。
4. 软链接共享 `node_modules`、`dist-cases`、`keys`，并同步 `.env`。
5. 写入 `.worktree-meta.json` 记录元数据。

---

### 第三阶段：在 Worktree 中进行需求开发

后续所有的代码查看、编辑与改动操作，**均在新建的 worktree 目录中进行**，主仓库目录保持完全干净与解耦。

---

### 第四阶段：需求完成与分级构建交付 (Build & Deliver)

需求编码与自测完成后，在主项目或直接在工作树下调用构建脚本：
```bash
.agents/skills/worktree/scripts/build-worktree.sh -p "<worktree-path>"
```
*该脚本将自动执行：*
1. ESLint 代码规范检查 (`npm run lint`)。
2. TypeScript 严格类型检查 (`npx tsc -b`)。
3. 自动化单元测试 (`npm test`)。
4. 前端生产包构建 (`npm run build`)。
5. （若附带 `-t / --tauri` 参数）执行 Rust `cargo test` 与 Tauri 客户端完整构建。
6. 校验 `dist/index.html` 产物状态。

#### 交付回复规范
构建自检成功后，Agent 必须向用户明确回复：
1. 需求改动已完成，且前端与构建自检全部通过。
2. 明确给出工作树路径与修改分支。
3. 明确提示用户：**根据 Orbis 项目交付规范，Agent 严格不自启任何常驻服务，请您在需要时手动运行以下命令进行调试**：
   - 调试前端页面：`cd "<worktree-path>" && npm run dev -- --port 9899`
   - 调试桌面应用：`cd "<worktree-path>" && npm run tauri:dev:admin`

---

### 第五阶段：工作树安全回收 (Cleanup)

当需求已合并或废弃，需要清理工作树时，执行回收脚本：
```bash
.agents/skills/worktree/scripts/remove-worktree.sh -p "<worktree-path>"
```
- 脚本会自动检查工作树内是否有未提交改动，杜绝误删未存盘代码。
- 安全移除工作树，并自动清理对应的临时 Git 分支（保留 `Dev` 和 `main` 主分支）。
