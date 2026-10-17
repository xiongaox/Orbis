# Orbis 历史包袱清理提示词

> 用途：整段复制到新会话（Codex / Claude）中执行。
> 目标：让 AI 对长期演进遗留的死依赖、死配置、废弃同步方案残留做一次「以删为导向」的审计，**先出计划、不动代码**。
> 实测基线：2026-10，分支 `Dev`，commit `b7b919c`。

---

## 零、体检结论（已实测，供参考靶点）

| 类别 | 实测发现 |
|---|---|
| 死依赖 | `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities` 零引用；`SortableCaseCard.tsx` 顶部注释称「拖拽手动排序已移除」，文件名是遗迹 |
| lockfile 腐烂 | `classnames`、`xlsx`、`lunar-javascript`、`@types/classnames` 仍在 `package-lock.json`，但 `package.json` 已不声明 |
| 旧栈残留 | Supabase 源码目录已删干净（`docs/ponytail-audit-remaining.md` 记录的状态已过期）；`src/utils/qimenImportUtils.ts:111` 仍有 Supabase 导出格式的兼容分支 |
| 代理配置 | `vite.config.ts` 的 `/api → http://localhost:8000` 在 `src/` 中零引用（Python 后端时代遗迹） |
| 双同步共存 | D1 云同步（`cloudSyncService` + `cloud-sync-worker`）与 WebDAV/S3 备份（`remoteBackupService`）**均在活跃使用**，不是重复功能；真正可疑的是两者共用的工具函数层 |
| 打包体积 | `dist/index-*.js` 约 3.1 MB，值得查死代码是否拖累 tree-shaking |

---

## 一、可直接复制的提示词

````markdown
# 任务：历史包袱清理（只出计划，不动代码）

## 背景
Orbis（reticle-bazi）是 React 19 + TS + Vite + Tauri v2 项目，开发周期很长，先后用过
Vite 单页、Tauri 桌面/安卓、Python 后端；同步/备份方案先后试过 Supabase、WebDAV、S3、
Cloudflare D1。历史方案的部分代码、依赖、配置、文档可能已废弃但仍留在仓库里，
形成多余引用、死依赖、死配置。

请做一次**以「删」为导向**的全仓清理审计，产出可执行的清理计划。

## 硬性约束（违反即算任务失败）
1. **本轮只产出计划文档，不改任何源码、不删任何文件、不跑 `npm uninstall`。**
   唯一允许的写入是新建 `docs/cleanup-plan.md`。
2. **判断「废弃」必须以引用证据为准，禁止凭直觉**。每条「建议删除」必须附：
   - `文件:行号` 形式的引用搜索命令与结果
   - 或「入口不可达」的调用链证明（从 `src/main.tsx` 出发追踪不到）
3. **区分三态**，严禁把「暂时没人用」当成「可以删」：
   - `【死】` 全仓零引用、零调用链、零配置绑定 → 可删
   - `【疑】` 有引用但疑似遗留（如只有注释、只有测试、只有类型导出）→ 需用户裁决
   - `【活】` 在主链路上 → 不动，最多建议重构
4. **不得触碰**（gitignore 已排除但磁盘上存在，且清理它们有数据丢失风险）：
   `keys/`、`dist-cases/`、`.env`、`src/data/cases/`（语料在私有仓 orbis-lore）、
   `cloud-sync-worker/wrangler.toml`（含真实 database_id）、`src-tauri/target*/`、`node_modules/`。
5. **不得删除用户数据路径**：`localPrivateStore` 记录类型、SQLite 表结构、Cloudflare D1
   migration（`cloud-sync-worker/migrations/0001_init.sql`）属数据兼容边界，只能标记不能提出删除。
6. 涉及正在使用的同步/备份功能时（WebDAV、S3、D1 云同步），**先证明它是否仍是产品功能**，
   再谈合并。用户尚未声明要砍掉其中任何一条线，默认全部为「活」，只找它们**共用层的重复**。

## 必查清单（按此顺序逐项给结论，每项都要有证据）

### A. npm 依赖
1. 对 `package.json` 的每个 `dependencies` / `devDependencies`，统计 `src/`、`scripts/`、
   `vite.config.ts`、`eslint.config.js`、`tailwind.config.js`、`.github/workflows/*.yml`
   中的实际 import 数，列出零引用 / 仅测试引用 / 仅间接依赖三类。
2. **已知线索**（请复核，不要直接采信）：`@dnd-kit/core`、`@dnd-kit/sortable`、
   `@dnd-kit/utilities` 疑似零引用——`SortableCaseCard.tsx` 顶部注释称「拖拽手动排序已移除」，
   文件名是历史遗迹。若确认为零引用，同时给出该文件是否应改名（改名属【疑】，需裁决）。
3. 检查 `package-lock.json` 是否残留 `package.json` 已不声明的包
   （用 `node -e` 比对 `lockfilePackages[''].dependencies` 与所有包节点，
   无需安装依赖即可完成）。残留包在计划中单列一节「lockfile 腐烂」。

### B. 历史同步方案残留
按 Supabase / WebDAV / S3 / D1 四条线分别列表：

1. **Supabase**
   - 全仓搜索 `supabase`（含大小写、含 SQL、含注释）。注意 `qimenImportUtils.ts` 第 111 行附近
     有「Supabase 导出的 …+00 格式」注释，判断这是**死代码分支**还是**输入格式兼容**（后者不得删）。
   - `docs/ponytail-audit-remaining.md` 记录 `supabase/migrations/` 与
     `docs/database-schema.sql` 待删——请先验证这两个路径现在是否还存在，若已不存在，
     指出该文档条目状态已过期。**不要去 `main` 分支验证线上是否还在用 Supabase**，
     这超出本轮范围，只标注「需用户在 main 分支确认」。
2. **WebDAV**：`src/services/webdavBackupService.ts` 与 `MobileProfileCenter.tsx`、
   `RemoteBackupManagerModal.tsx`、`PrivateDataBackupModal.tsx` 的耦合，列出是否与 S3 走同一抽象。
3. **S3**：同上，加 `s3SigV4.ts` 是否存在被手写替代的标准能力（注意：浏览器环境无法用原生
   SigV4，手写签名是合理的，**不要建议换成 AWS SDK**，只评估它是否有多余导出）。
4. **D1 云同步**：`src/services/cloudSyncService.ts`、`cloudSyncStore.ts`、
   `src/hooks/useCloudSyncScheduler.ts`、`cloud-sync-worker/`。特别检查：
   - `cloud-sync-worker/wrangler.toml` 与 `wrangler.toml.example` 两份是否存在字段不一致
   - `cloud-sync-worker/` 是否被主仓 `npm test` / `npm run lint` 正确排除（`package.json` 中
     `test` 已用 `--exclude 'cloud-sync-worker/**'`，确认 `lint` 是否也需要）
   - `SYNCABLE_RECORD_TYPES`（前端白名单）与 Worker 端白名单是否两处硬编码且已漂移
5. **跨方案的重复层**：`remoteBackupShared.ts` 被 `cloudSyncService` 复用超时/重试，
   判断这层抽象是否真正被三条线共用，还是某条线已经不用了。

### C. 构建与配置残留
1. `vite.config.ts` 的 `server.proxy['/api'] → http://localhost:8000`：搜索 `src/` 中是否有
   `/api/` 请求。**已知线索**：目前零引用（Python 后端时代遗迹）。若确认零引用，
   需要判断它是否仅用于本地调试（用户可能有独立 Python 服务），标记为【疑】而非直接判死。
2. `public/` 下资源是否有零引用项（对照 `src/` 与 `index.html`）。
3. `.env.example` 中的键（如 `VITE_AUTHOR_QR_URL`）是否在 `src/` 有对应 `import.meta.env` 使用。
   **注意**：`vite` 的 `define` / `import.meta.env` 可能经 `src/vite-env.d.ts` 声明后以其他方式读取，
   搜索时要覆盖 `import.meta.env.` 与 `process.env.` 两种写法。
4. `tsconfig.*.json`、`eslint.config.js`、`tailwind.config.js` 中指向已不存在路径的配置。
5. `src-tauri/Cargo.toml`：逐个 crate 检查是否在 `src-tauri/src/` 有 `use`；
   额外检查 `tauri-plugin-log`（`lib.rs:94` 注册）是否真的被产品使用（用户可见日志？还是仅调试）。
   同时核对 `src-tauri/capabilities/default.json` 里的权限项是否对应实际注册的插件。
6. `.github/workflows/*.yml` 中是否引用已删除的脚本或 env 键。

### D. 代码层重复与遗迹
1. 文件名/目录名与实际职责不符的历史命名（`SortableCaseCard.tsx` 已知一例）。
2. 注释中自称「已移除 / 已下线 / 兼容旧值」的分支（搜索 `已移除`、`已下线`、`旧`、`迁移`、
   `legacy`、`兼容`、`deprecated`、`TODO`、`ponytail:`），逐条判断是**必要的数据迁移代码**
   还是**已完成使命的残留**。数据迁移代码（如 `localStorage` → SQLite 的一次性迁移）
   只有在用户明确确认「所有设备都已迁移」后才可提删除，否则一律标记【疑】。
3. 同一能力的两套实现（如导入工具 `baziImportUtils.ts` / `qimenImportUtils.ts` 的重复逻辑）。
   **不要提出重构提议**，除非能给出净删除行数。

## 输出格式（写入 docs/cleanup-plan.md）

```markdown
# Orbis 历史包袱清理计划
> 生成时间 · 审计范围 · 一句话结论

## 零、摘要
- 可安全删除（【死】）共 N 项，预计删 X 行 / Y 个依赖 / Z 个文件
- 需用户裁决（【疑】）共 M 项，逐项列决策问题
- 明确不动（【活】）的清单，防止误删

## 一、【死】可安全删除
按风险从低到高排序，每项：
### 1. <名称>
- 位置：`path:line`
- 证据：<搜索命令 + 输出摘要>
- 影响面：<哪些文件会变>
- 删除动作：<精确命令或 diff 要点>
- 验证方式：`npm run lint && npx tsc -b && npm test`

## 二、【疑】需用户裁决
每项一个问题，用「是/否」能回答的形式，附若不删的持续成本。

## 三、【活】不动，但存在问题
只记录隐患（如两处白名单硬编码），不提出改动。

## 四、lockfile 腐烂单列
## 五、执行顺序建议
分批次（第 1 批零风险依赖与配置 → 第 2 批死文件 → 第 3 批需裁决项），
每批注明回滚方式（单个 commit，可 `git revert`）。
```

## 执行纪律
- 每条结论前先跑证据命令，禁止推测。若某处证据不足，写「无法确认，需人工核查」而不是猜。
- 结论里区分「这条线是**产品功能**」与「这条线是**历史实现**」。用户没说要砍功能，只砍包袱。
- 完成后**不要**执行任何删除，等待用户逐项审批。
- 自检：本任务不产生代码改动，只需确认 `docs/cleanup-plan.md` 中每条【死】都有可复现的证据命令。
````

---

## 二、使用建议

1. **分两次跑**：先让它只做 A+B（依赖与同步线），产出计划审一遍；再让它做 C+D。
   一次性全跑容易生成一份正确但没人读的 300 行文档。
2. **审批粒度要小**：让 AI 按批次提交（第 1 批只删零引用依赖），别让它一把梭。
   `docs/ponytail-audit-remaining.md` 是上次审计的产物，多条卡在「等用户 / 跨分支决策」，
   所以本提示词强制要求把【疑】项改写成可回答的「是/否」问题。
3. **可以不等审计的零风险项**：那 4 个 lockfile 残留包（`classnames`、`xlsx`、
   `lunar-javascript`、`@types/classnames`）跑一次 `npm install` 就会清掉。
4. **刻意留白**：提示词没有让 AI 判断「WebDAV 与 S3 要不要砍一条」——那是产品决策，
   不是清理任务。若确实想合并，需单独指定保留哪条。
