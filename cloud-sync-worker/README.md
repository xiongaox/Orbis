# Orbis 云同步 Worker（用户自部署组件）

这是 Orbis 的**云同步服务端**，基于 Cloudflare Worker + D1。

> **用户自部署**：Worker 与 D1 部署在你自己的 Cloudflare 账号下，
> 数据、费用与可用性均由你自己的账号承担，与 Orbis 官方无关。
> 协议与数据模型见主仓 `docs/cloud-sync-protocol.md`。

## 一次性部署

1. 注册 Cloudflare 账号，安装并登录 wrangler：`wrangler login`。
2. 创建 D1 数据库（名字可自定，下文以 `orbis` 为例）：

   ```bash
   wrangler d1 create orbis
   ```

3. 生成真实部署配置并填入 `database_id`（`wrangler d1 list` 可查）：

   ```bash
   cp wrangler.toml.example wrangler.toml
   # 编辑 wrangler.toml，替换两处 REPLACE_WITH_YOUR_D1_DATABASE_ID
   ```

   `wrangler.toml` 已 gitignore，真实值不入库。

4. 应用建表 migration：

   ```bash
   wrangler d1 migrations apply orbis --remote
   ```

5. 设置同步密钥（它等价于整个工作区的钥匙，请用强随机串，勿与任何人共享）：

   ```bash
   wrangler secret put SYNC_TOKEN
   ```

6. 部署：

   ```bash
   wrangler deploy
   ```

7. 在 Orbis 客户端「云同步」配置中填写：Worker 地址
   （`https://<worker-name>.<account-subdomain>.workers.dev`）、SYNC_TOKEN、
   工作区标识。**多台设备的工作区标识必须填同一值**，否则数据互不可见。

## 本地开发

```bash
# 注：npm 10.9.x 的 arborist 解析 vitest peer 依赖会崩溃
# （Cannot read properties of null (reading 'edgesOut')），需加 --legacy-peer-deps
npm install --legacy-peer-deps
cp wrangler.toml.example wrangler.toml   # 首次：本地模式不校验 database_id，占位符即可
echo "SYNC_TOKEN=local-dev-token" > .dev.vars  # 本地开发密钥（gitignored）
npm run dev        # wrangler dev（本地模式，默认 http://127.0.0.1:8787）
npm test           # vitest run（本目录独立运行，不影响主仓前端测试）
npm run typecheck  # tsc --noEmit
```

migration 应用到本地 D1（不需要真实 database_id）：

```bash
npx wrangler d1 migrations apply orbis --local
```

## 集成测试

在真实 D1（本地模式）上跑协议场景矩阵（幂等、tombstone、分页、冲突、
内容一致恢复、跨 workspace 隔离、records↔changes 一致性、bootstrap）：

```bash
node scripts/integration-test.mjs
```

脚本会自动启动/停止 `wrangler dev --local`（端口 8792）、清理本地 D1
数据并应用 migration，可重复运行。`.dev.vars` 缺失时会写入默认测试令牌。

## 目录结构

- `src/index.ts` —— Worker 入口（路由、鉴权前置、统一错误）
- `src/auth.ts` —— Bearer 鉴权（常量时间比较）
- `src/validation.ts` —— 请求体与分页参数校验
- `src/errors.ts` —— ApiError 与统一错误结构
- `src/constants.ts` —— 常量（限额、白名单、服务信息）
- `src/d1.ts` —— D1 数据访问层（原子 batch 写入、增量拉取、bootstrap）
- `src/sync.ts` —— 同步语义（幂等、乐观并发、内容一致恢复）
- `scripts/integration-test.mjs` —— 集成测试（见上文）
- `migrations/` —— D1 migrations（`0001_init.sql` 见实施方案 §4.2）
- `wrangler.toml.example` —— 部署配置模板（`database_id` 占位符）
## 三、使用说明

- **自动同步**：应用启动、回到前台、网络恢复、本地写入后 1.5 秒（合并去抖）、
  运行期每 45 秒低频拉取。无需任何手动干预。
  > 不承诺操作系统级后台常驻：进程退出即停，下一次启动自动收敛。
- **立即同步**：设置页的手动按钮，立即执行一次 push + pull。
- **冲突处理**：
  - 案例类记录（八字/奇门/三元案例）两台设备并发修改时，**保留两份**：
    远端记录原样保留，本机内容另存为带「冲突副本」标记的新记录，
    不会丢任何一边的修改。
  - 资料档案、案例收藏、学习进度等采用最后写入优先（LWW）：
    冲突时放弃本机修改，自动拉取远端版本。
- **失败重试**：网络波动、服务端 5xx、限流会自动退避重试（最多 3 次，指数退避）；
  连续失败 5 次后停止自动重试（保留手动「立即同步」）；
  密钥错误（401）时立即停止自动重试——修正密钥后手动同步一次即恢复。
- **队列可见**：设置页显示「N 条待同步」与最近同步时间/结果/错误。

## 四、安全说明

- 同步密钥以 Bearer Token 随请求发送，**只存于本机**，不回显、不进日志、
  不进备份包（WebDAV/S3 备份与 ZIP 导出均不含云同步配置）。
- 传输走 HTTPS；Worker 与 D1 部署在你的账号下，Orbis 官方无法访问你的数据。
- Worker 地址必须为 HTTPS（防中间人），仅本机开发调试允许 `http://localhost`。

## 五、已知限制（首期）

1. **静态密钥风险**：SYNC_TOKEN 是静态共享密钥，泄露即等同于工作区钥匙
   （可在 Cloudflare 后台随时更换：`wrangler secret put SYNC_TOKEN`，然后更新两台设备）。
2. **AI 对话历史仅手动同步**：`ai_chat_session` 会话数据不入自动同步白名单，
   仅在对话历史弹窗的「同步」按钮触发时同步（案例正文、资料、收藏、学习进度走自动同步）。
3. **无端到端加密**：Worker 可见明文 payload；如需更强隔离，请自行在
   Cloudflare 侧限制访问来源（Access 策略等）。
4. **changes 表无限增长**：为避免 tombstone 复活风险，首期不清理变更日志
   （D1 容量对案例量级足够；后续版本可引入受控的 tombstone 回收窗口）。
5. **进程退出即停**：自动调度不承诺操作系统级后台常驻。

