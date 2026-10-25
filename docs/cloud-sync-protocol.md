# Orbis 云同步：协议与 D1 数据模型

> 摘自云同步实施方案 §4–§5（2026-10 存档）：原 plan 其余部分（任务清单、冻结结论等）已随实施完成删除。

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
5. **冲突策略（第一版，分类型）**：`*_case` 类型冲突时**保留两份**——远端内容原样保留，本机内容另存为带「冲突副本」标记的新记录，不静默覆盖人工断法正文；`profile` / `case_favorite` / `case_progress` 冲突时采用 **LWW**（后到先胜出）：客户端收到 409 后放弃本地修改、重新拉取该记录落库（收藏与进度是高频小数据，无「人工断法正文」需要保护，保留两份只会产生无意义副本）；`ai_chat_session` 冲突时**会话内消息合并**（2026-10-16 追加）——409 回执携带远端 payload，客户端把镜像对齐到回执的 `serverVersion` 后，取本机**实时**记录与远端会话，把两侧 `messages` 按消息 `id` 去重、按 `timestamp` 排序合并（会话元数据取 `updatedAt` 较新者），合并结果写回本机并重新入队推送——两台设备继续同一会话时双方的问答都保留，而不是整条被覆盖。
6. **批量限制**：单次 push 限制条数与总字节（≤ 50 条 / ≤ 2 MB），超出由客户端分片；客户端**按条数与字节双上限分批**（2026-10-16 修订）——只按条数分批时，大记录与小记录混批会撞批总量校验；单条 payload ≤ 1 MB（D1 单行/单值硬上限 2 MB 的一半留量），单条自身超批总量时独占一批，交由服务端返回明确的单条超限错误，避免无声卡死。对齐 D1 单语句 100 KB、绑定参数 100 个的平台上限。
7. **防回环**：pull 落库走 remote-origin 通道，**不得**再写入 outbox。
8. **baseVersion 来源**：客户端新增设备本地表 `cloud_sync_versions`（`record_type` + `record_id` → 该记录最近一次同步到的 `server_version`），与第 4.4 节同步元数据同语义（不进快照/ZIP/恢复）。`put` / `remove` 拦截入队时读取镜像作为 `baseVersion`；pull 落库且游标推进后更新镜像；从未同步过的记录 `baseVersion = null`（服务端无此记录则按新建处理，已存在则按冲突处理）。
9. **按需补推（本机既有历史上云）**：每次同步前扫描本机白名单记录，把版本镜像（`cloud_sync_versions`）缺失的记录以 `baseVersion = null` 全量入队，随本次 push 上云——镜像缺失即「从未被当前云端确认过」，覆盖首台设备启用前的既有历史、本地调试残留（旧 state 游标失效后重新探测）、更换工作区后镜像被清空重新全量推送三类场景；镜像存在的记录不重复推送（正常增量同步零开销）。新设备加入已有工作区时 bootstrap 拉取会重建镜像，本机独有记录仍会被补推。
10. **工作区身份**：`cloud_sync_state` 记录上次同步的 `workerUrl` 与 `workspaceId`。同步时发现身份与当前配置不一致：身份曾有记录说明明确更换了工作区——旧游标与版本镜像全部失效，清空镜像并重置游标后重新首次同步；身份无记录（旧版本状态升级）则补记身份并重置游标（重新探测云端是否空工作区），镜像保留，同工作区升级时不重复推送。
11. **对话历史手动同步（2026-10-16 追加，同日改为每会话一条）**：`ai_chat_session`（recordId = sessionId，payload 为单个会话）进白名单但**不进自动通道**——写入口（`put`/`remove`/`clear`）对 `SYNC_MANUAL_TYPES` 排除自动入队，`seedOutboxFromLocal` 只扫描 `SYNCABLE_RECORD_TYPES`（不含手动类型），因此 15 秒轮询与写入去抖对对话历史零感知、零请求。触发路径唯一：对话历史弹窗「同步」按钮 → ① 本机所有会话逐条 `enqueueSyncMutation`（upsert）→ ② **删除传播**：`cloud_sync_versions` 镜像中存在而本机已无的 sessionId 补一条 delete 墓碑（否则 B 端会把本机删掉的会话拉回来）→ ③ 调用 `syncNow()` 复用全部编排（顺带推送积压的案例队列属正确行为）。pull 回灌该类型后广播事件，使 `aiChatHistoryService` 失效内存缓存并重载聚合列表（否则后台新对话会覆盖拉回内容）。冲突按第 5 条的会话内消息合并执行；旧版整份数组记录（`ai_chat_sessions`）在启动预载时自动迁移拆分并删除原记录。

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

