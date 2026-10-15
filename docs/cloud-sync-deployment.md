# Orbis 云同步：自部署与使用指南

Orbis 的云同步是**用户自部署**组件：Cloudflare Worker + D1 数据库，
运行在**你自己的 Cloudflare 账号**下。数据、费用与可用性均由你的账号承担，
与 Orbis 官方无关。同步协议与数据模型见 `docs/cloud-sync-implementation-plan.md` 第 4 节。

> Worker 端代码在 `cloud-sync-worker/`（详见其 `README.md`），
> 本文档面向「从零部署到两台设备跑通」的完整流程。

## 前置条件

- 一个 Cloudflare 账号（免费版即可）
- 本机安装 Node.js 18+ 与 wrangler CLI（`npm install -g wrangler`）
- Orbis 桌面端或网页版（云同步设置在「头像菜单 → 云同步」或移动端「个人中心 → 数据与服务 → 云同步」）

## 一、部署服务端（约 10 分钟）

1. **登录 Cloudflare**：

   ```bash
   wrangler login
   ```

2. **创建 D1 数据库**（名字可自定，下文以 `orbis` 为例）：

   ```bash
   wrangler d1 create orbis
   ```

3. **生成部署配置**：进入 `cloud-sync-worker/` 目录，复制模板并填入 database_id：

   ```bash
   cd cloud-sync-worker
   cp wrangler.toml.example wrangler.toml
   # 编辑 wrangler.toml，把两处 REPLACE_WITH_YOUR_D1_DATABASE_ID
   # 换成 wrangler d1 list 查到的真实值
   ```

   > `wrangler.toml` 含真实 database_id，已被 gitignore，不会进入仓库。

4. **建表**（migration 全部 `IF NOT EXISTS`，可重复执行）：

   ```bash
   wrangler d1 migrations apply orbis --remote
   ```

5. **设置同步密钥**——它等价于整个工作区的钥匙，请用强随机串（如 `openssl rand -base64 32`），
   勿与任何人共享：

   ```bash
   wrangler secret put SYNC_TOKEN
   ```

6. **部署**：

   ```bash
   wrangler deploy
   ```

7. 部署成功后，Worker 地址形如
   `https://<worker-name>.<account-subdomain>.workers.dev`（部署命令的输出中可查）。

## 二、配置两台设备

在**每台设备**的「云同步」设置中填写三项：

| 字段 | 说明 |
|------|------|
| Worker 地址 | 上一步的 `https://...workers.dev` 地址（必须 HTTPS；仅本地开发允许 `http://localhost`） |
| 同步密钥 | 第 5 步设置的 SYNC_TOKEN |
| 工作区标识 | **首次配置必填、不默认生成**；两台设备必须填**同一个值**（如 `family`），否则数据互不可见 |

填好后点「测试连接」：显示「连接正常」即部署成功。
打开「启用云同步」开关即可开始自动同步。

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
2. **AI 对话历史不同步**：`ai_chat_sessions` 等会话数据为设备本地，不进同步白名单
   （案例正文、资料、收藏、学习进度同步）。
3. **无端到端加密**：Worker 可见明文 payload；如需更强隔离，请自行在
   Cloudflare 侧限制访问来源（Access 策略等）。
4. **changes 表无限增长**：为避免 tombstone 复活风险，首期不清理变更日志
   （D1 容量对案例量级足够；后续版本可引入受控的 tombstone 回收窗口）。
5. **进程退出即停**：自动调度不承诺操作系统级后台常驻。

## 六、本地开发与自测

如需在本机调试 Worker（客户端填 `http://localhost:8787`）：

```bash
cd cloud-sync-worker
npm install --legacy-peer-deps   # npm 10.9.x 的 arborist 解析 vitest peer 依赖会崩溃
cp wrangler.toml.example wrangler.toml
echo "SYNC_TOKEN=local-dev-token" > .dev.vars   # 本地开发密钥（gitignored）
npm run dev                                        # wrangler dev（默认 http://127.0.0.1:8787）
```

协议级集成测试（真实 D1 本地模式，含双设备端到端场景矩阵）：

```bash
node scripts/integration-test.mjs
```
