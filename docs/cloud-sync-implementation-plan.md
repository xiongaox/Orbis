# Orbis 云同步实施方案（SQLite 本地兜底 + 自部署 Worker/D1 增量同步）

> 文档性质：可逐点执行、可中断续做的实现手册。
> 使用方式：**一次只做一个任务点（Txx）**，完成自检 → 报告 → 等待评审 → 用户批准进入下一点时，
> 先提交上一个任务点到本地 Git，再开始下一点。

---

## 0. 目标与验收标准

### 0.1 目标

在多台设备之间，用**用户自己部署的 Cloudflare Worker + D1** 做增量同步，解决当前「完整备份 + 手动/定时恢复」导致的数据同步不及时问题。

```text
本地 SQLite / IndexedDB（离线兜底、首屏数据源）
        ↓ 闲时增量 push / pull
用户自己的 HTTPS Worker
        ↓
用户自己的 D1
```

### 0.2 整体验收标准

- 两台设备各自修改后，能在数十秒内自动收敛，无需手动点击。
- 断网、退出、崩溃后重启，本地数据与待同步队列不丢，能续传。
- 删除可在设备间传播，离线旧设备不会把已删除数据「复活」。
- 云同步未配置或失败时，**本地功能与既有 WebDAV/S3 备份完全不受影响**。
- WebDAV/S3 备份与恢复的既有行为零回归。

---

## 1. 硬边界：WebDAV/S3 备份体系冻结

> **云同步是新增的独立子系统；WebDAV/S3 是冻结的既有备份子系统。除本地存储层为排除同步元数据而增加必要标记外，不修改 WebDAV/S3 服务、备份格式和恢复语义。**

### 1.1 明确不改的东西

| 子系统 | 文件 | 状态 |
|---|---|---|
| WebDAV 备份 | `src/services/webdavBackupService.ts` | 冻结，不改协议与配置模型 |
| S3 兼容备份 | `src/services/s3BackupService.ts`、`src/services/s3SigV4.ts` | 冻结 |
| 备份方式与自动备份调度 | `src/services/remoteBackupService.ts` | 冻结 |
| 备份命名/路径/重试共享层 | `src/services/remoteBackupShared.ts` | 冻结 |
| ZIP 打包与覆盖式恢复 | `src/services/backupPackageService.ts` | 冻结格式与语义 |
| 备份配置界面 | `src/components/Common/PrivateDataBackupModal.tsx` | 仅允许增加「云同步」入口，不改表单语义 |

### 1.2 明令禁止的做法

```text
✗ 不要把 D1 变成第三种备份方式（禁止 type RemoteBackupMethod = 'webdav' | 's3' | 'd1'）
✗ 不要让 cloudSyncService 复用 ZIP 打包 / 上传逻辑
✗ 不要把云同步接入 s3BackupService / webdavBackupService / remoteBackupService 的调用链
✗ 不要让云同步配置进入 backupPackageService 的打包与恢复范围
✗ 不要让同步失败阻塞本地读写、WebDAV 备份或 S3 备份
✗ 不要让恢复 ZIP 备份覆盖或删除云同步配置
✗ 不要把「同步」和「备份」合并成同一个界面表单或同一条调度
```

### 1.3 必须成立的独立运行契约

- 用户可以完全不启用云同步，WebDAV/S3 照常工作。
- 即使未来整体移除云同步功能，WebDAV/S3 仍可独立完整运行。
- 云同步的配置、队列、游标属于**设备本地数据**，语义与现有 `DEVICE_LOCAL_CONFIG_RECORD_TYPES` 一致：不进快照、不进 ZIP、不参与覆盖式恢复。

### 1.4 每个任务点的回归红线

任何触碰 `src/services/localPrivateStore.ts` 的任务点，都必须附带并跑通：

```bash
npm test -- src/services/localPrivateStore.test.ts
npm test -- src/services/backupPackageService.test.ts
npm test -- src/services/webdavBackupService.test.ts
npm test -- src/services/s3BackupService.test.ts
```

既有测试的断言**不得为了让新逻辑通过而被削弱**。

---

## 2. 现状基线（实现前必读）

| 关注点 | 位置 | 说明 |
|---|---|---|
| 本地存储统一入口 | `src/services/localPrivateStore.ts` | Tauri 用 SQLite（`orbis-private.db`），浏览器用 IndexedDB，无环境时内存回退 |
| 记录模型 | 同上 `PrivateRecord` | `id` / `type` / `payload` / `createdAt` / `updatedAt` / `sortOrder` |
| 业务读写方 | `baziCaseService.ts`、`qimenCaseService.ts`、`sanyuanCaseService.ts`、`profileService.ts`、`learningPanelService.ts` | 全部经 `localPrivateStore`，无旁路写库 |
| 设备本地配置排除 | 同上 `DEVICE_LOCAL_CONFIG_RECORD_TYPES` | `webdav_config` / `s3_config` / `backup_method` / `auto_backup_state` |
| 启动预热 | `src/main.tsx` | 首屏渲染前 `await` 各 preload，本方案新增的预热需挂到此处 |
| 运行期调度入口 | `src/components/Layout/Navbar.tsx` | `useEffect(() => startRemoteAutoBackup(), [])`，云同步调度可同构挂载 |
| 应用设置 | `src/services/appSettingStore.ts` | 内存缓存 + 同步读；`app_setting` 记录当前会进备份 |

**关键前置认知**：现有 `updatedAt` 由各设备本地时钟生成，跨设备比较不可靠（项目已在
`localPrivateStore.restore` 注释中记录过该教训）。因此云同步的先后判定**必须由服务端生成递增序号**，
绝不能沿用设备时间戳比较。

---

## 3. 首期同步范围

### 3.1 纳入同步（白名单）

| record type | 说明 |
|---|---|
| `bazi_case` | 八字案例 |
| `qimen_case` | 奇门案例 |
| `sanyuan_case` | 三元天星案例 |
| `profile` | 个人资料 |
| `case_favorite` | 案例收藏 |
| `case_progress` | 阅读进度 |

### 3.2 首期排除（含理由，避免实现时「顺手加进去」）

| record type | 排除理由 |
|---|---|
| `ai_chat_sessions` | 单条记录存整份会话数组，长期使用会逼近 D1 单行 2 MB 上限；需先拆成「一会话一条」再纳入 |
| `ai_model_service` | 含 AI 服务 API Key，属凭据，不跨端传输 |
| `webdav_config` / `s3_config` / `backup_method` | 既有设备本地备份凭据，冻结不动 |
| `auto_backup_state` | 设备本地备份节奏，跨端覆盖会互相干扰 |
| `app_setting` | 含锁定盘、导航槽位等设备相关项，整体跨端覆盖会打乱各端布局；二期按 key 白名单单独评估 |

白名单在客户端与 Worker 侧**各维护一份并校验**，两侧不一致时以 Worker 拒绝为准。

---

## 4. 协议与 D1 数据模型

### 4.1 第一版接口

```text
GET  /health                     连通性与鉴权自检（测试连接按钮用）
POST /sync/push                  批量提交本地变更
GET  /sync/pull?after=<seq>      按服务端序号增量拉取
GET  /sync/bootstrap             新设备首次全量拉取（不含 changes 历史）
```

`/sync/bootstrap` 是必需的：`changes` 表会随时间无限增长，新设备首次同步不能靠回放全部历史。

### 4.1.1 请求/响应载荷格式（T02 冻结）

**鉴权**：所有路由（含 `/health`）均需 `Authorization: Bearer <SYNC_TOKEN>`；失败返回 401 与中文可读信息。

**POST /sync/push** 请求体（字段名与客户端 outbox 条目 §4.4 一致）：

```json
{
  "workspaceId": "xiongaox",
  "deviceId": "<设备 UUID>",
  "mutations": [
    {
      "type": "bazi_case",
      "recordId": "<记录 id>",
      "operation": "upsert | delete",
      "payload": {},
      "mutationId": "<UUID>",
      "baseVersion": 3
    }
  ]
}
```

- `baseVersion`：该记录最近已知服务端版本；从未同步为 `null`（见 4.3 第 8 条）。
- `payload`：`upsert` 必填（对象）；`delete` 忽略。

**GET /sync/pull**：`?workspaceId=<标识>&after=<seq>&limit=<n>`（`after` 默认 0、`limit` 默认 100、上限 200，均须为非负整数）。响应 200：

```json
{
  "changes": [
    { "sequence": 12, "type": "bazi_case", "recordId": "<记录 id>", "serverVersion": 3, "deleted": 0, "payload": {} }
  ],
  "hasMore": true,
  "nextCursor": 12,
  "currentSequence": 47
}
```

- 按 `sequence` 升序；`deleted=1` 的条目 `payload` 为 `null`（tombstone）。
- `hasMore=true` 时 `nextCursor` 为本页最后一条的 `sequence`，作为下页 `after`。
- `currentSequence`：该工作区当前最大 `sequence`（客户端游标持久化用）。

**GET /sync/bootstrap**：`?workspaceId=<标识>`。响应 200：

```json
{
  "records": [
    { "type": "bazi_case", "recordId": "<记录 id>", "payload": {}, "serverVersion": 3 }
  ],
  "currentSequence": 47
}
```

- 仅含 `deleted=0` 的有效记录。

**POST /sync/push 响应**：全部应用时 200 `{ "results": [{ "mutationId": "<id>", "status": "applied | idempotent | duplicate_content", "serverVersion": 3 }] }`；存在冲突时 409，响应体为 `{ "error": { "code": "CONFLICT", "message": "..." }, "results": [...], "conflicts": [{ "mutationId", "type", "recordId", "serverVersion", "deleted", "payload" }] }`——`results` 为已应用条目（客户端可清出 outbox），`conflicts` 为冲突条目（客户端按 §4.3 第 5 条分类型处理）。

**统一错误响应**：`{ "error": { "code": "<错误码>", "message": "<中文说明>" } }`；错误码词汇：`UNAUTHORIZED`(401)、`INVALID_WORKSPACE` / `INVALID_JSON` / `INVALID_REQUEST` / `INVALID_RECORD_TYPE` / `INVALID_OPERATION`(400)、`PAYLOAD_TOO_LARGE` / `BATCH_TOO_LARGE`(413)、`METHOD_NOT_ALLOWED`(405)、`NOT_FOUND`(404)、`CONFLICT`(409)、`INTERNAL_ERROR`(500，详情仅记服务端日志)、`RATE_LIMITED`(429，预留)。

**上限取值**（§4.3 第 6 条的落地冻结）：单批 ≤ 50 条；单批总字节 ≤ 512 KB；单条 payload ≤ 256 KB（单批总字节的一半留量，保证至少两条大记录可同批）；`workspaceId` ≤ 64 字符且仅含字母、数字、`-`、`_`；`recordId` / `mutationId` / `deviceId` ≤ 512 字符（防滥用 sanity 上限）。

### 4.2 D1 表结构（三张表 + 索引）

```sql
-- 当前有效记录（每工作区每对象一行）
CREATE TABLE records (
  workspace_id   TEXT    NOT NULL,
  record_type    TEXT    NOT NULL,
  record_id      TEXT    NOT NULL,
  payload_json   TEXT    NOT NULL,
  server_version INTEGER NOT NULL,
  deleted        INTEGER NOT NULL DEFAULT 0,   -- tombstone
  updated_at     TEXT    NOT NULL,
  device_id      TEXT    NOT NULL,
  PRIMARY KEY (workspace_id, record_type, record_id)
);

-- 变更日志：其他设备据此增量拉取
CREATE TABLE changes (
  sequence       INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id   TEXT    NOT NULL,
  record_type    TEXT    NOT NULL,
  record_id      TEXT    NOT NULL,
  server_version INTEGER NOT NULL,
  deleted        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL
);
CREATE INDEX idx_changes_ws_seq ON changes(workspace_id, sequence);

-- 幂等去重：网络重试不会重复生效
CREATE TABLE mutations (
  workspace_id TEXT NOT NULL,
  mutation_id  TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  PRIMARY KEY (workspace_id, mutation_id)
);
```

### 4.3 同步语义（必须实现，否则会出现「看起来成功、实际丢数据」）

1. **服务端序号权威**：写入时 `changes.sequence` 自增，客户端只按 `sequence` 推进游标。
2. **mutation 幂等**：每次本地操作带 `mutationId`（UUID）；Worker 在 `mutations` 中已存在则直接返回成功，不重复写入。
3. **软删除**：删除写 `deleted = 1` 并追加一条 `changes`，不物理删除，避免离线旧设备回灌。
4. **乐观并发**：push 携带 `baseVersion`；与 D1 当前 `server_version` 不一致时返回 409 与当前版本。
5. **冲突策略（第一版，分类型）**：`*_case` 类型冲突时**保留两份**——远端内容原样保留，本机内容另存为带「冲突副本」标记的新记录，不静默覆盖人工断法正文；`profile` / `case_favorite` / `case_progress` 冲突时采用 **LWW**（后到先胜出）：客户端收到 409 后放弃本地修改、重新拉取该记录落库（收藏与进度是高频小数据，无「人工断法正文」需要保护，保留两份只会产生无意义副本）。
6. **批量限制**：单次 push 限制条数与总字节（如 ≤ 50 条 / ≤ 512 KB），超出由客户端分片；对齐 D1 单行 2 MB、单语句 100 KB、绑定参数 100 个的平台上限。
7. **防回环**：pull 落库走 remote-origin 通道，**不得**再写入 outbox。
8. **baseVersion 来源**：客户端新增设备本地表 `cloud_sync_versions`（`record_type` + `record_id` → 该记录最近一次同步到的 `server_version`），与第 4.4 节同步元数据同语义（不进快照/ZIP/恢复）。`put` / `remove` 拦截入队时读取镜像作为 `baseVersion`；pull 落库且游标推进后更新镜像；从未同步过的记录 `baseVersion = null`（服务端无此记录则按新建处理，已存在则按冲突处理）。

### 4.4 客户端本地新增状态

```text
cloud_sync_config    启用开关、workerUrl、syncToken、workspaceId（首次配置必填，见第 5 节）
cloud_sync_state     deviceId、lastPulledSequence、最近同步时间与结果
cloud_sync_outbox    待上传操作队列（type / recordId / operation / payload / mutationId / baseVersion）
cloud_sync_versions  每条记录最近已知的服务端版本镜像（record_type + record_id → server_version），即 push 的 baseVersion 来源
```

四者一律列入设备本地数据，不进快照、不进 ZIP、不参与恢复、不进备份配置导出。

---

## 5. 安全与配置

- 客户端只填写 **Worker URL + 同步密钥 + 工作区标识**。工作区标识**首次配置必填**、不默认生成：由用户自起（示例：`xiongaox`），两台设备填同一值；Worker 校验其格式与长度，「测试连接」确认该工作区可读。工作区隔离是逻辑隔离（`workspace_id` 列），一个 D1 可容纳多个工作区，无需为每个工作区建新库。
- Cloudflare Account ID、D1 database ID、Cloudflare API Token **只存在于用户自己的部署侧**，绝不进入客户端。
- Worker URL 必须为 HTTPS（仅本地开发允许显式 localhost 例外）。
- Worker 校验：Token、工作区隔离、record type 白名单、payload 大小与批量数量；不接受任意 SQL 或任意表名。
- 同步密钥禁止出现在：日志、错误提示、ZIP 备份、WebDAV/S3 配置导出、任何 toast。
- 界面回显密钥时使用密码态，不显示明文。
- 第一版采用静态共享密钥：**它等价于整个工作区的钥匙**。密钥轮换、设备级 Token、payload 端到端加密列入二期，并在文档中明确告知用户该风险。

---

## 6. 工具链隔离（T01 必须一次做对）

新目录 `cloud-sync-worker/` 会被现有工具链扫到，必须先隔离，否则会破坏既有 `lint` / `dev`：

| 工具 | 现状 | 需要的动作 |
|---|---|---|
| `npm run lint`（`eslint .`） | `files: ['**/*.{ts,tsx}']`，会扫新目录 | 在 `eslint.config.js` 的 `globalIgnores` 增加 `cloud-sync-worker`（或为其单独配置规则） |
| `npx tsc -b` | 只覆盖 `src` 与 node 侧，**不会检查新目录** | Worker 自带 `tsconfig.json`，并新增独立检查命令；否则 Worker 类型错误无人发现 |
| `npm run dev`（Vite） | `watch.ignored` 未包含新目录 | 必须排除 `**/cloud-sync-worker/**`：其 `.wrangler/` 下是独占写入的 sqlite，属 `vite.config.ts` 注释里记录过的 EBUSY 崩溃同类风险 |
| `npm test`（Vitest） | 无独立配置，默认匹配 `**/*.test.ts`，会误扫 `cloud-sync-worker/**` | 根 `package.json` 的 `test` 脚本改为 `vitest run --exclude 'cloud-sync-worker/**'`；`cloud-sync-worker/` 自带 `vitest.config.ts` 与 vitest devDependency，在目录内独立运行 |

**验收**：新增 `cloud-sync-worker/` 后，前端 `npm run lint`、`npx tsc -b`、`npm test`、`npm run dev` 全部维持原状。

---

## 7. 任务点清单

> 通用规则（每个任务点都适用）：
> - 前置：上一点已评审通过并已提交。
> - 完成后：跑本点「自检」，暂停并报告「改动 / 自检结果 / 未决问题」。
> - **不构建任何安装包**，不推送远端。
> - 若发现必须修改第 1 节的冻结边界或第 4 节的协议语义 → 立即暂停，先修订本文档并取得确认。

---

### T00 基线核查与协议冻结

**目标**：在写任何代码前，把范围、协议、白名单、冲突语义固化成可对照的清单，并确认工作区现状。

**前置**：无。

**子步骤**
1. 记录当前 `git status` 与最近提交，**登记开工时存在的全部未提交修改**（文件名 + 归属判断）。
   > 注意：本方案编写时工作区为干净状态（那批既有修改已于 `62a29c2`、`4677a04` 提交），此处不在文档里写死文件清单，
   > 因为清单会随会话推进而过时。执行 T00 时以**当时实际的 `git status`** 为准，逐条登记。
2. 明确「凡与本方案无关的既有未提交修改，任何任务点都不得提交它们」，并把这份清单抄进每次提交前的检查项。
3. 通读并登记所有会写入白名单类型的调用路径：`baziCaseService`、`qimenCaseService`、`sanyuanCaseService`、`profileService`、`learningPanelService`（含批量创建、清空、迁移函数）。
4. 冻结第 3 节白名单与排除项、第 4 节接口与三张表、第 4.3 节六条同步语义。
5. 确认首期不纳入 AI 对话与 `app_setting`，并写明二期升级前提。

**产出**：本文档追加一节「T00 冻结结论」（或就地确认，若无需改动则记录「已核对，无偏差」）。

**自检**：文档描述与实际代码一致（调用路径逐条可指到文件与函数名）。

**验收**：列出白名单类型的每一个写入口，且无误漏。

**提交边界**：仅 `docs/` 下本文档。

**回滚**：删除该节即可，不涉及代码。

---

### T01 Worker/D1 项目骨架与工具链隔离

**目标**：`cloud-sync-worker/` 可本地运行、可部署、有 migration，且完全不影响前端工具链。

**前置**：T00。

**子步骤**
1. 建目录 `cloud-sync-worker/`：`src/index.ts`、`wrangler.toml.example`（模板，`database_id` 占位符；真实 `wrangler.toml` 由其复制且 gitignore、不入库——wrangler 4.121 不支持 toml 内环境变量插值，已实测）、`package.json`、`tsconfig.json`、`vitest.config.ts`、`migrations/0001_init.sql`、`README.md`。
2. `migrations/0001_init.sql` 落第 4.2 节三张表与索引。
3. 实现 `GET /health`（返回服务名与版本，便于客户端「测试连接」）。
4. 写本地开发说明：`wrangler d1 migrations apply`（本地/远端）、`wrangler dev`、`wrangler deploy`、`wrangler secret put SYNC_TOKEN`。
5. 按第 6 节完成工具链隔离：`eslint.config.js` 的 `globalIgnores` 增加 `cloud-sync-worker`；`vite.config.ts` 的 `nonFrontendDirs` 增加 `**/cloud-sync-worker/**`；根 `package.json` 的 `test` 脚本改为 `vitest run --exclude 'cloud-sync-worker/**'`；`cloud-sync-worker/` 自带 `vitest.config.ts` 与 devDependency，目录内 `npx vitest run` 独立运行；Worker 独立 `tsc` 检查命令。
6. 在 `README.md` 写明：这是**用户自部署**组件，数据与费用均由用户自己的 Cloudflare 账号承担。

**自检**
```bash
npm run lint          # 前端，须与改动前一致
npx tsc -b            # 前端，须与改动前一致
npm test              # 前端，须与改动前一致
cd cloud-sync-worker && npx tsc --noEmit
cd cloud-sync-worker && npx wrangler d1 migrations apply orbis-sync --local
cd cloud-sync-worker && npx wrangler dev   # 手动访问 /health 一次
```

**验收**：`/health` 返回 200；migration 可重复执行不报错；前端四项自检无新增告警或失败。

**提交边界**：`cloud-sync-worker/**`（含 `wrangler.toml.example`，不含 gitignored 真实 `wrangler.toml`）+ `eslint.config.js` + `vite.config.ts`（仅排除项）+ `package.json`（仅 test 脚本）+ `docs/`。真实 `database_id` 只存在于本机 gitignored 的 `wrangler.toml`（第 5 节部署侧边界）。

**回滚**：整目录删除 + 还原两个配置文件的排除项。

---

### T02 Worker 鉴权与输入边界

**目标**：未授权请求被拒；非法类型、超限请求被拒；错误结构可被客户端消费。

**前置**：T01。

**子步骤**
1. `Authorization: Bearer <SYNC_TOKEN>` 校验，失败返回 401 与中文可读信息。
2. 记录类型白名单校验（与服务端常量单一来源，客户端不得覆盖）。
3. 校验 `workspaceId` 格式与长度。
4. 校验单条 payload 大小、单批条数、单批总字节；超限返回 413/400 并说明上限。
5. 统一错误响应结构（`{ error: { code, message } }`），便于客户端区分「鉴权失败 / 限流 / 数据非法 / 冲突」。

**自检**：Worker 测试覆盖——无 Token、错 Token、非法 record type、超大 payload、超批量、缺 workspaceId。

**验收**：所有非法输入均被拒且不写库（用本地 D1 查询确认无残留行）。

**提交边界**：`cloud-sync-worker/**` + `docs/`（新增 §4.1.1 请求/响应载荷格式：纯增量细化，不改第 4 节既有协议语义）。

**回滚**：还原 `src/index.ts` 与相关测试。

---

### T03 Worker push/pull 与 D1 原子语义

**目标**：增量同步的服务端语义完整可用。

**前置**：T02。

**子步骤**
1. `POST /sync/push`：接收变更数组，逐条处理并保证 D1 批处理内的原子性（用 `batch()` 或事务语义）。
2. mutation 幂等：命中 `mutations` 直接返回成功。
3. 写 `records`（`server_version` 自增）+ 追加 `changes`（利用自增 `sequence`）。
4. 版本冲突：`baseVersion` 与当前不符返回 409 + 当前版本与内容。
5. 软删除：`deleted = 1` 并追加 changes。
6. `GET /sync/pull?after=<seq>&limit=<n>`：按 `sequence` 升序返回，带 `hasMore` 与 `nextCursor`。
7. `GET /sync/bootstrap`：返回该工作区当前全部有效记录与当前最大 `sequence`。
8. 工作区隔离：所有查询强制带 `workspace_id`。

**自检**：测试覆盖——重复 push 同一 mutationId 只生效一次；删除后 pull 能拿到 tombstone；分页游标连续不丢不重；冲突返回 409；跨 workspace 数据不可见。

**验收**：上述五个场景全部通过；`records` 与 `changes` 状态一致。

**提交边界**：`cloud-sync-worker/**` + `docs/`（§4.1.1 增补 push/pull/bootstrap 响应结构与错误码词汇：纯增量细化，不改第 4 节既有协议语义）。

**回滚**：还原 push/pull/bootstrap 实现与测试；D1 本地库可直接重建。

---

### T04 客户端同步元数据存储

**目标**：本地能持久化同步配置、状态、版本镜像与 outbox，且**完全不影响既有备份**。

**前置**：T01（可并行于 T02/T03 开发，但提交仍在 T03 之后）。

**子步骤**
1. 在 `localPrivateStore.ts` 扩展类型：新增 `cloud_sync_config`、`cloud_sync_state`，并把它们列入设备本地数据集合（与 `DEVICE_LOCAL_CONFIG_RECORD_TYPES` 同语义）。
2. 新增 `cloud_sync_versions` 镜像表（`record_type` + `record_id` → `server_version`）：Tauri SQLite 独立建表、浏览器 IndexedDB 独立 store、内存回退 Map；不混入 `private_records`。提供按记录读取、写入、按类型批量读取 API。
3. outbox 采用**独立表**（Tauri SQLite 建表 + 浏览器 IndexedDB 独立 store），不混入 `private_records`，从根上避免进入 `snapshot()`。
4. 数据库 schema 版本升级：`SCHEMA_VERSION` 递增，`CREATE TABLE IF NOT EXISTS` 保证老库平滑升级、可重复执行。
5. 提供 outbox 的最小 API：入队、批量取、按 mutationId 删除、清空、计数。
6. `deviceId` 生成并持久化（首次生成后固定）。
7. 明确 `snapshot()` 与 `restore()` **不感知**这四类数据。

**自检**
```bash
npm test -- src/services/localPrivateStore.test.ts
npm test -- src/services/backupPackageService.test.ts
npm test -- src/services/webdavBackupService.test.ts
npm test -- src/services/s3BackupService.test.ts
npm run lint && npx tsc -b
```
新增测试：老库升级后既有记录不变；快照中不含同步元数据（含版本镜像）；恢复备份不删除、不覆盖同步配置；`cloud_sync_versions` 读写与按类型批量读取正确。

**验收**：四个既有测试文件全绿且断言未被削弱；新增断言证明同步元数据不进入备份链路。

**提交边界**：`src/services/localPrivateStore.ts`（及新增同步存储文件）+ 对应测试。

**回滚**：还原存储层改动；新表留着不影响运行（空表无副作用）。

---

### T05 本地业务写入接入 outbox

**目标**：白名单类型的增删改写操作自动进入待同步队列，且远端回灌不产生回环。

**前置**：T04。

**子步骤**
1. 选择接入点：优先在 `localPrivateStore` 的写入口做**统一拦截**（`put` / `remove` / `clear`），而非逐个 service 改——避免新增术数时漏接入（与现有「快照列出全部记录」的教训一致）。
2. 按白名单过滤：非白名单类型直接跳过，不入队。
3. `clear(type)` 语义：为每一条现存记录生成删除操作，而不是只记录一次「清空」（否则其他设备不会删除对应数据）。
4. remote-origin 通道：pull 落库时走不产生 outbox 的写路径（内部标记参数），确保回环为零。
5. `mutationId`（本地写入时生成 UUID）与 `baseVersion`（入队时读 `cloud_sync_versions` 镜像，从未同步为 `null`）的生成时机与存储方式按第 4.3 节第 8 条实现并写明。
6. 逐条核对 T00 登记的调用方，确认批量创建、迁移函数、恢复备份等路径都得到正确语义（恢复备份是否入队需在 T00 结论中已定；默认**入队**，使恢复结果也能同步出去）。

**自检**：新增测试——白名单类型写入产生 1 条队列项；非白名单类型不产生；每案删除产生对应删除项；`clear` 产生 N 条；remote-origin 写入队列长度为 0。

**验收**：上述断言全绿；既有备份测试仍全绿。

**提交边界**：`src/services/localPrivateStore.ts` 及必要的 service 调用点 + 测试。

**回滚**：还原拦截逻辑，队列数据保留无害。

---

### T06 客户端 push/pull 同步编排

**目标**：一次同步 = push 队列 → pull 增量 → 推进游标，失败可安全重试。

**前置**：T03、T05。

**子步骤**
1. 新增 `src/services/cloudSyncService.ts`：`readConfig` / `saveConfig` / `testConnection` / `syncNow` / `getStatus`。
2. HTTP 层复用现有超时/重试约定（`fetchWithTimeout`、`MAX_RETRIES` 等来自 `remoteBackupShared.ts` 的既有实现，**只读复用，不修改该文件**）；Tauri 端走 `@tauri-apps/plugin-http`，与既有 S3 请求一致以规避 CORS。
3. push：分批上传 outbox；**仅在服务端确认成功后**删除队列项，并同步更新 `cloud_sync_versions` 镜像（镜像更新失败时，下次 push 会因 baseVersion 过期触发 409，按冲突策略自愈，不丢数据）。
4. 409 冲突：按第 4.3 节第 5 条**分类型**处理——`*_case` 生成冲突副本，原远端记录保留；`profile` / `case_favorite` / `case_progress` 放弃本地修改、重新拉取该记录落库并更新版本镜像。
5. pull：按 `lastPulledSequence` 分页拉取 → remote-origin 落库 → **落库成功后才推进游标**。
6. 首次同步（`lastPulledSequence` 为空）：先走 `/sync/bootstrap`，再把游标设为首批返回的最大 sequence。
7. 失败处理：网络/5xx/限流保留队列并退避；401 停止自动重试并提示用户检查密钥；落库失败不推进游标。
8. 防重入：同一时刻只允许一次同步在跑。

**自检**：新增测试（mock fetch）——push 成功才清队列；push 失败队列保留；重复响应幂等；pull 分页不丢不重；落库失败游标不前进；401 不无限重试。

**验收**：上述断言全绿；`npm run lint`、`npx tsc -b` 通过。

**提交边界**：`src/services/cloudSyncService.ts`（及必要测试辅助）。

**回滚**：删除新服务文件；本地数据与 outbox 不受影响。

---

### T07 独立云同步设置界面

**目标**：用户能填写配置、测试连接、手动同步、看到状态。

**前置**：T06。

**子步骤**
1. 新增独立 `CloudSyncModal`（桌面弹窗 + 移动端 `SubPage` 双壳，遵循 `src/components/UI/AGENTS.md` 的既有约定）。
2. 字段：启用开关、Worker 地址、同步密钥（密码态）、工作区标识（**首次配置必填**、不默认生成；文案明确两台设备需填同一标识）、测试连接、立即同步、最近同步时间/结果/错误。
3. 入口：在现有「数据备份」入口旁**新增**「云同步」入口，共三处：`Navbar.tsx`（state + 渲染，桌面端经 `UserMenu.tsx` 在「数据备份」按钮旁新增菜单按钮）、`MobileProfileCenter.tsx`（设置行 + modal 实例）；**不修改** `PrivateDataBackupModal` 的 WebDAV/S3 表单、调用与保存逻辑。
4. 敏感字段：不回显明文、不进入日志与 toast。
5. 不把云同步配置加入既有备份配置的「导出/导入」范围。
6. 文案明确：需自行部署 Worker、密钥等价于工作区钥匙、数据与费用由用户自己的 Cloudflare 账号承担。
7. UI 遵循根目录 `DESIGN.md`；实现前先读该文件。

**自检**
```bash
npm run lint && npx tsc -b
```
人工验收（由用户完成）：填配置 → 测试连接成功/失败提示明确 → 立即同步有结果 → 关闭开关后不再自动同步。

**验收**：既有备份界面行为与文案零变化；云同步入口独立可用。

**提交边界**：新增组件 + 入口处最小改动 + `docs/` 若需补充用户说明。

**回滚**：移除入口与组件，备份界面不受影响。

---

### T08 闲时触发与应用生命周期

**目标**：无需手动干预即可在数十秒内收敛。

**前置**：T07。

**子步骤**
1. 触发时机：应用启动（`main.tsx` 预热后）、回到前台（`visibilitychange`）、网络恢复（`online`）、本地写入后延迟合并（1–3 秒去抖）、运行期低频 pull（30–60 秒）、手动「立即同步」。
2. 调度挂在 `Navbar` 现有 `useEffect` 同构位置，返回清理函数；**不得干扰** `startRemoteAutoBackup` 的定时器。
3. 防重入 + 指数退避 + 连续失败上限（超限停止自动重试，仅保留手动）。
4. 未配置或未启用时，调度直接退出，不产生任何网络请求。
5. Tauri 与浏览器端能力差异处理（前后台事件、网络状态可用性）。
6. 文案不承诺「操作系统级后台常驻」——进程退出即停。

**自检**：断网场景手动验证队列保留；恢复网络后自动补传；关闭开关后无请求发出。

**验收**：两台设备（或一次模拟）在阈值时间内收敛；既有自动备份节奏未被打乱。

**提交边界**：调度接入点 + 必要测试。

**回滚**：移除调度注册，功能退回手动同步。

---

### T09 双设备端到端验收与部署文档

**目标**：真机两台设备跑通，并给出用户可照做的自部署步骤。

**前置**：T08。

**子步骤**
1. 列出并发场景并逐一验证：首次同步；A 建 B 建；A 改 B 改（冲突副本）；A 删 B 离线再上线（不复活）；重复 push；Worker 不可用；同步中途退出再启动续传。
2. 回归验证：WebDAV 备份、S3 备份、ZIP 恢复在云同步开启状态下行为不变。
3. 编写用户部署文档：注册 Cloudflare → 创建 D1 → 部署 Worker → 建表 → 设置 `SYNC_TOKEN` → 复制 URL 与密钥到两台设备。
4. 审计敏感信息路径：日志、toast、错误信息、ZIP 包、备份配置导出、界面明文回显。
5. 记录已知限制（静态密钥风险、AI 对话未同步、无端到端加密）。

**自检**：上述场景逐条留证（时间、结果、失败时的提示文案）。

**验收**：全部场景符合预期；用户按文档可从零部署成功。

**提交边界**：`docs/`（用户部署说明）+ 场景中暴露的必要修复。

**回滚**：文档可回退；修复按各自范围回退。

---

### T10 发布前检查与变更说明

**目标**：静态自检全绿，变更可交付、可回滚。

**前置**：T09。

**子步骤**
1. 跑齐全套静态自检（前端 + Worker）。
2. 审阅每个任务点的提交记录与最终 diff。
3. 确认未提交任何与本方案无关的既有修改（对照 T00 登记的清单）。
4. 撰写变更说明（用户可读：新增云同步、备份体系未变、需自行部署）。
5. 列出后续计划：AI 对话拆分后同步、R2 长期归档与附件、密钥轮换/设备级 Token、payload 端到端加密。

**自检**
```bash
npm run lint
npx tsc -b
npm test
cd cloud-sync-worker && npx tsc --noEmit && npx vitest run
```

**验收**：全绿；**不构建安装包**（构建由用户在确认后自行触发）。

**提交边界**：文档与必要收尾。

**回滚**：按任务点逐级回退，冻结的备份子系统无需回退。

---

## 8. Git 纪律（每个任务点强制执行）

1. 一次只做一个任务点；完成后**暂停等待评审**。
2. 用户批准进入下一点时，**先提交上一个任务点**，再开始新任务。
3. 提交前：
   - `git status` 确认当前变更范围；
   - **只暂存本任务点涉及的文件**，绝不 `git add -A` / `git add .`；
   - 查看 staged diff，确认没有混入 T00 登记的无关未提交修改；
   - 确认没有 `.env`、`keys/`、`dist-cases/`、同步密钥明文。
4. 提交信息用中文，说明「做了什么 + 为什么」，遵循项目既有风格。
5. 提交后报告：commit hash、文件清单、自检命令与结果、未决问题。
6. **不推送远端**；不写更新日志；不构建安装包。
7. 验收失败只修当前点，不跨点扩展；若必须改冻结协议 → 先改本文档并确认。

---

## 9. 测试矩阵与完成定义

| 层级 | 覆盖内容 |
|---|---|
| Worker 协议 | 鉴权、白名单、大小限制、幂等、tombstone、分页、冲突、工作区隔离 |
| D1 schema | migration 可重复执行、老库升级、索引生效 |
| 客户端存储 | schema 升级、outbox 持久化、快照不含同步元数据、恢复不动同步配置 |
| 同步编排 | push 确认后清队列、失败保留、pull 分页与游标、401 停止重试、防重入 |
| 回归 | WebDAV/S3/backupPackage/localPrivateStore 四个既有测试文件全绿 |
| 人工 | 界面配置与提示、双设备收敛、断网续传、离线删除不复活 |

**完成定义（全部满足才算整体完成）**
- 首期白名单数据可双向增量同步并收敛。
- 断网/重启不丢数据、不丢队列。
- 删除可传播且不被离线设备复活。
- WebDAV/S3 备份与恢复零回归，且不启用云同步时可独立工作。
- 敏感信息不落日志、不进备份包。
- 静态自检全绿。

---

## 10. 中断恢复流程

若会话中断或换人接手，按以下顺序恢复：

1. `git log --oneline -10` 与 `git status` 找到最后一个**已评审且已提交**的任务点。
2. 读该任务点在本文件中的条目，确认其验收标准已达成。
3. 检查是否存在「已实现但未提交」的当前任务点残留：对照 `git status` 与本文档该点的提交边界。
4. 从下一个任务点的「前置」开始，**不重做**已验收内容。
5. **不清理**与本方案无关的用户未提交修改（以 T00 登记的清单为准）。
6. 若当前任务点自检失败：只修该点，保留本地数据与 outbox，随后重新自检。

---

## 11. 二期展望（不在首期范围）

| 方向 | 前提 |
|---|---|
| AI 对话同步 | 先把 `ai_chat_sessions` 从「整份数组一条」拆成一会话一条 |
| R2 长期归档与附件 | 作为备份/对象存储侧扩展，不进 D1 同步链路 |
| 密钥轮换、设备级 Token | 替代首期静态共享密钥 |
| payload 端到端加密 | 客户端加密后存入 D1，代价是服务端无法检索 |
| `app_setting` 按 key 白名单同步 | 先区分设备相关项与业务项 |

---

## 12. T00 冻结结论（2026-10-15 核定）

### 12.1 开工基线

- 分支 `main`，HEAD `62a29c2`（八字案例信息操作行内 AI 按钮移到首位）。
- 开工时未提交修改（`git status --porcelain`）逐条登记：
  - `?? .zcode/` —— 代理工具会话状态，与本方案无关，**任何任务点不得提交**。
  - `?? docs/cloud-sync-implementation-plan.md` —— 本文档，即 T00 的提交边界。
- 除上述两项外工作区干净。

### 12.2 白名单类型写入口登记（全部经 `localPrivateStore`，无旁路写库）

| 写入口 | 位置 | 写库调用 |
|---|---|---|
| `baziCaseService.createCase` | `src/services/baziCaseService.ts` L63 | `put` L65-67 |
| `baziCaseService.createCases`（批量） | 同上 L71-75 | 循环 `createCase` |
| `baziCaseService.updateCase` | 同上 L77 | `put` L80 |
| `baziCaseService.deleteCase` | 同上 L87 | `remove` L88 |
| `baziCaseService.clearCases` | 同上 L92-94 | `clear` L93 |
| `qimenCaseService.createCase` | `src/services/qimenCaseService.ts` L49 | `put` L51-53 |
| `qimenCaseService.createCases`（批量） | 同上 L57-60 | 循环 `createCase` |
| `qimenCaseService.updateCase` | 同上 L62 | `put` L65-68 |
| `qimenCaseService.deleteCase` | 同上 L72 | `remove` L73 |
| `qimenCaseService.clearCases` | 同上 L77-79 | `clear` L78 |
| `qimenCaseService.migrateQimenTitlesIntoDescription` | 同上 L90 | 经 `updateCase` L99 写入；幂等标志 `qimen_title_desc_migrated` 存 `app_setting` |
| `qimenCaseService.migrateQimenTimezoneShift` | 同上 L139 | 经 `updateCase` L145 写入；天然幂等，无需标志位 |
| `sanyuanCaseService.createCase` | `src/services/sanyuanCaseService.ts` L55 | `put` L58 |
| `sanyuanCaseService.updateCase` | 同上 L62 | `put` L66 |
| `sanyuanCaseService.deleteCase` | 同上 L70 | `remove` L71 |
| `sanyuanCaseService.clearCases` | 同上 L75 | `clear` L76 |
| `profileService.updateProfile` | `src/services/profileService.ts` L19 | `put` L27（固定 id `profile`，单记录） |
| `learningPanelService.addFavorite` | `src/services/learningPanelService.ts` L56 | `put` L63；超 `FAVORITES_LIMIT=50` 时 `remove` L62 淘汰最旧 |
| `learningPanelService.removeFavorite` | 同上 L67 | `remove` L68/L74 |
| `learningPanelService.upsertProgress` | 同上 L95 | `put` L98 |
| `learningPanelService.clearAllProgress` | 同上 L122 | `clear` L123 + 逐条 `remove` L126-128 |
| 备份恢复路径 | `backupPackageService.restoreUnpackedBackup` L368-401 | 经 `localPrivateStore.restore` → 内部 `put` L315 / `remove` L324 逐条写入 |

- 统一拦截点：`localPrivateStore.put`（L216）/ `remove`（L244）/ `clear`（L257）。
- 恢复路径语义结论（T05 子步骤 6 的预定论）：**默认入队**，恢复结果也能同步出去。
- 注意项：`clearAllProgress` 先 `clear` 再逐条 `remove`，拦截后会产生冗余删除队列项——幂等无害，T05 实现时按「队列内同 recordId 待传操作合并」处理。
- 排除类型写入口（不入队）：`aiChatHistoryService.importSessions` 写 `ai_chat_sessions`（见 12.4）。

### 12.3 协议冻结确认

- 第 3 节白名单（6 类）与排除项（5 类）冻结。
- 第 4.1 节四接口、第 4.2 节三张表与索引冻结。
- 第 4.3 节同步语义冻结为 8 条（原 7 条 + 新增第 8 条 baseVersion 来源；原第 5 条修订为分类型冲突策略）。
- 第 4.4 节设备本地状态冻结为四类（新增 `cloud_sync_versions` 版本镜像表）。
- 第 5 节修订：workspaceId 首次配置必填、不默认生成。
- 第 6 节修订：Worker 测试隔离方案（根脚本 exclude + Worker 自带 vitest 配置）。

### 12.4 二期排除确认

- `ai_chat_sessions`：当前为「整份会话数组一条记录」（`aiChatHistoryService.ts` L67-68、L93-94、L131-133），单行随使用逼近 D1 上限；二期前提是先拆成「一会话一条」。
- `app_setting`：每设置一条记录（`appSettingStore.ts` L26-44），含锁定盘、导航槽位等设备相关项；二期按 key 白名单评估。

### 12.5 本机部署侧已备（不入库）

- D1 数据库 `orbis` 已于本机创建（region APAC），`database_id` 仅记录于本机部署侧（按第 5 节边界不进仓库、不进客户端；可随时 `wrangler d1 list` 重新查到，无丢失风险）。T01 采用 example 模板模式：入库 `wrangler.toml.example`（`database_id` 占位符），本机复制出 gitignored 的真实 `wrangler.toml`（wrangler 4.121 不支持 toml 环境变量插值，已实测，故不用 `${VAR}` 方案）。
- 本机 wrangler 实为 4.151.0：本地开发密钥文件是带点前缀的 `.dev.vars`（实测 `dev.vars` 不被加载，`wrangler dev --help` 亦注明读 `.env` 与 `.dev.vars`）；`wrangler d1 execute` 无 `--json` 选项，stdout 为「横幅 + JSON 数组」，需从第一个 `[` 起解析。集成测试 `cloud-sync-worker/scripts/integration-test.mjs` 已按此实测行为实现。
- T04 将客户端 `SCHEMA_VERSION` 由 2 升至 3（新增 cloud_sync_versions / cloud_sync_outbox 独立表与 IDB store；快照记录格式未变）。`localPrivateStore.restore` 与 `backupPackageService.unpackJson` 的版本校验同步改为 `1..SCHEMA_VERSION` 区间语义，保证 v1/v2 旧备份在升级后仍可恢复（原 `[1, SCHEMA_VERSION]` 枚举校验会在升版后拒绝 v2 快照）。
- T06 客户端编排实现要点（`src/services/cloudSyncService.ts`）：
  - **LWW 冲突无需单记录拉取**：409 意味着远端版本 > 本地镜像版本，而该远端写入的 sequence 必大于当前 pull 游标（否则早先的 pull 已把它落库、镜像不会是旧值），因此同一轮 syncNow 的 pull 阶段会自然拉回远端版本——放弃本地修改后只要移除队列项即可。
  - **案例类冲突副本**：本机内容以新 UUID 另存为新记录，payload 带 `conflict_copy_of` 标记字段（`CONFLICT_COPY_FIELD`，指向原 recordId）；副本经普通 `put` 入队，下轮同步推送。删除意图的冲突（本地待删除、远端有更新）直接放弃本地删除，远端内容经 pull 保留（最少数据丢失）。
  - **CloudSyncState.lastPulledSequence 改为 `number | null`**：null 表示从未同步（走 bootstrap），0 表示已同步到空工作区——区分两者避免空工作区每轮重复 bootstrap。
  - **HTTP 错误分类**：`CloudSyncHttpError`（status/code/retryable）——401 与其余 4xx 立即抛出不重试（T08 据 `code === 'UNAUTHORIZED'` 停止自动重试）；429/5xx/网络错误按 `MAX_RETRIES` 指数退避（500ms×2^n，与 S3 备份一致）。
  - **TS 两个坑**：`erasableSyntaxOnly` 禁止构造函数参数属性（`constructor(public readonly x)`），须显式声明字段；`pullChanges` 中无标注的 `let cursor` 与 `page`/`changes` 形成循环类型推断（TS7022），`cursor` 与 `page` 必须显式标注类型。
  - **测试环境**：`fetchWithTimeout`/`wait` 用 `window.setTimeout`，测试里 `window` 桩须带 `setTimeout`/`clearTimeout`（不能 stub 成 undefined，否则超时计时器崩溃）；`indexedDB` stub 为 undefined 走内存模式；内存模式数据跨同文件用例残留，`beforeEach` 必须清空 config/state/outbox。
- T07 设置界面（`src/components/Common/CloudSyncModal.tsx`）：桌面 `BaseModal` + 移动 `SubPage` 双壳（正文抽成 `bodyContent` 共用）；三处入口——`Navbar`→`UserMenu` 菜单（「数据备份」旁新增「云同步」项）、`MobileProfileCenter`「数据与服务」区设置行；`PrivateDataBackupModal` 的 WebDAV/S3 表单零改动，云同步配置不进既有备份配置的导出/导入。敏感字段约定：同步密钥密码态输入、永不回显（界面留空表示保持已保存值，已保存值只存内存不渲染）；「测试连接 / 立即同步」先走同一份 `persistConfig` 校验落盘，保证测试与同步用的永远是已保存配置；披露文案注明需自行部署 Worker、密钥等价于工作区钥匙、数据与费用由用户自己的 Cloudflare 账号承担。
- T08 自动调度：`syncNow` 内维护调度记账（成功清零失败计数并解除暂停；401 立即暂停；其余错误累计，连续 5 次失败暂停）——手动「立即同步」走 `syncNow` 不过门控，成功后自动恢复自动调度。`syncNowAuto()` 按门控状态过滤触发（暂停或退避窗口内返回 null，不产生网络请求；退避 30s×2^n 封顶 10 分钟）。调度 hook `useCloudSyncScheduler`（`src/hooks/`）挂在 `Navbar` 与 `startRemoteAutoBackup` 同构位置、与布局断点无关地运行：挂载一次、45 秒低频、visibilitychange 回前台、online 恢复、2 秒轮询 outbox 计数（非零时 1.5 秒去抖合并触发）。未配置/未启用时 `syncNow` 直接返回 disabled，全程零网络请求。不承诺操作系统级后台常驻——进程退出即停。hook 接线按计划人工验收（断网保留队列、恢复网络自动补传、关闭开关无请求），门控逻辑由单测覆盖（401 暂停/退避跳过/连续失败上限/手动成功恢复）。
- T09 双设备端到端验收（`cloud-sync-worker/scripts/integration-test.mjs` 场景 10，真实 D1 本地模式，49 项检查全绿）：
  - 覆盖子步骤 1 全部并发场景：首次同步（B 走 bootstrap）、A 建 B 建（增量 pull 可见）、A 改 B 收（正确 baseVersion 推进到 serverVersion=2）、A 删 B 上线（tombstone 传播、bootstrap 不复活）、重复 push（内容一致的过期推送走 `duplicate_content` 恢复不产生新 change；同 mutationId 重放 `idempotent`）、并发冲突（B 过期 baseVersion 改 → 409，回执含 `serverVersion=2` 与当前内容，即客户端冲突副本素材）、续传（从最后已见 sequence 续拉为空，不丢不重）。「Worker 不可用」由客户端单测覆盖（5xx 指数退避重试 3 次、队列保留）。
  - 场景暴露的基础设施修复：wrangler dev 在 `d1Query`（execFileSync 阻塞事件循环）后关闭空闲 keep-alive 连接，客户端复用死 socket 收到 ECONNRESET——`api()` 网络层 TypeError 重试一次（必然新建连接）；进程退出/未处理异常/未处理拒绝三条路径都杀 wrangler 进程组（`stopDev`），避免崩溃后孤儿进程占端口。
  - 敏感信息路径审计（子步骤 4）：Worker 唯一 `console.error` 只记错误对象；`SYNC_TOKEN` 仅出现于 auth.ts 注释、index.ts 的 `requireAuth(request, env.SYNC_TOKEN)` 调用与 env.ts 类型声明，不进任何错误消息；客户端错误提示全为固定中文文案（不插值 token）；同步密钥密码态输入永不回显；备份链路（WebDAV/S3/ZIP 导出）自 T04 起排除 cloud_sync 元数据。审计结论：日志、toast、错误信息、ZIP 包、备份配置导出、界面回显六条路径均无泄漏。
  - 已知限制（子步骤 5，已写入 `docs/cloud-sync-deployment.md` §五）：静态密钥风险（SYNC_TOKEN 等同工作区钥匙，泄露即换密钥）；AI 对话历史（`ai_chat_sessions`）不同步；无端到端加密（Worker 可见明文 payload）；changes 表首期不清理（避免 tombstone 复活风险）；进程退出即停（不承诺 OS 级后台常驻）。
  - 用户部署文档：`docs/cloud-sync-deployment.md`（注册 Cloudflare → `wrangler d1 create` → 填 `wrangler.toml` → `migrations apply --remote` → `wrangler secret put SYNC_TOKEN` → `wrangler deploy` → 两台设备填同一 Worker 地址/密钥/工作区标识 → 测试连接），并含使用说明（自动调度行为、冲突副本语义、失败重试与暂停）与本地开发自测章节。
- 首期工作区标识：`xiongaox`（逻辑工作区，`workspace_id` 列隔离；一个 D1 可容纳多工作区，无需每工作区建库）。
