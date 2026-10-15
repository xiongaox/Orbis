# Orbis 云同步 Worker（用户自部署组件）

这是 Orbis 的**云同步服务端**，基于 Cloudflare Worker + D1。

> **用户自部署**：Worker 与 D1 部署在你自己的 Cloudflare 账号下，
> 数据、费用与可用性均由你自己的账号承担，与 Orbis 官方无关。
> 协议与数据模型见主仓 `docs/cloud-sync-implementation-plan.md` 第 4 节。

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
