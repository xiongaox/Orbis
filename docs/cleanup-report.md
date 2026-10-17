# Orbis 历史包袱清理报告

> 执行日期：2026-10 · 分支 `Dev` · 依据 [cleanup-prompt.md](cleanup-prompt.md)
> 自检结果：`npm run lint` 0 error（1 条既有 warning）、`npx tsc -b` 通过、`npm test` 175/175 通过。
> 净变更：**-282 行 / -7 个依赖**，未新增任何代码。

---

## 一、已清理（【死】：证据充分，已执行）

### 1. `@dnd-kit` 三个零引用依赖
- **证据**：`grep -rn "dnd-kit" --include="*.ts" --include="*.tsx" src` 零命中；全仓仅 `package.json` 三行命中。
- **背景**：`SortableCaseCard.tsx` 顶部注释自述「拖拽手动排序已移除」，拖拽能力已换成手写左滑。
- **动作**：`npm uninstall @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`，连带移除 24 个包。

### 2. `package-lock.json` 腐烂条目
- **证据**：比对 `lockfilePackages[''].dependencies` 与包节点，4 个包已不被 `package.json` 声明却仍在 lockfile。
- **清理**：`classnames@2.5.1`、`xlsx@0.18.5`、`lunar-javascript@1.7.7`、`@types/classnames@2.3.0`（随上一条 `npm uninstall` 重算 lockfile 一并消失）。

### 3. 本机 `.env` 中的废弃变量
- **内容**：`VITE_AUTHOR_QR_URL=https://valpoint.oss-cn-guangzhou.aliyuncs.com/...`。
- **证据**：全仓 `grep -rn "VITE_"` 零命中；二维码已改为本地静态资源 `public/author-qr.png`（`Navbar.tsx:219`、`MobileProfileCenter.tsx:515` 直接引用）。
- **性质**：这是「二维码从 OSS/S3 外链加载」时代的残留，现已完全本地化。

### 4. 「已移除」僵尸注释与注释掉的死代码
| 位置 | 内容 | 说明 |
|---|---|---|
| `CaseStudyDayunPanel.tsx` | `{/* 小运已移除 */}`、`{/* 流月行已移除 */}` | 纯空注释，删除不改行为 |
| `duanfaData.ts` | 旧的「文件名到中文名称映射」段标题 + `(已移除：…)` | 该映射表已不存在 |
| `duanfaData.ts` | 注释掉的 4 行 H1 跳过逻辑 | 含已删除的 `skippedFirst` 变量引用，死代码 |

---

## 二、核实为「【活】/ 必要」，未清理

### 1. Supabase 残留：无需清理
- `supabase/migrations/`（6 个 SQL）与 `docs/database-schema.sql` **已不存在于仓库**，`docs/ponytail-audit-remaining.md` 的条目 1 状态已过期。
- `src/utils/qimenImportUtils.ts:111` 的 Supabase 注释对应的是**活跃的输入格式兼容逻辑**（CSV 导出时间戳 `+00` 无分钟位，不补全会导致导入丢记录），不是死分支，保留。
- `src/services/qimenCaseService.ts:123` 的 `LEGACY_UTC_SHIFTED_TEST_DATES` 是**幂等的历史数据修正**（18 条案例的时间回正），属数据兼容边界，保留。

### 2. D1 云同步与 WebDAV/S3 备份：两者都是产品功能
- D1 线：`cloudSyncService` / `cloudSyncStore` / `useCloudSyncScheduler` / `cloud-sync-worker/` 全部在调用链上（`Navbar.tsx:73`、`PrivateDataBackupModal.tsx:262`、`AiChatHistoryModal.tsx:50`）。
- WebDAV/S3 线：`remoteBackupService` 编排两种备份方式，被 `main.tsx:9` 与 `PrivateDataBackupModal.tsx` 使用。
- **未发现功能重复**。两者共用 `remoteBackupShared.ts`（超时/重试），这是合理复用，不是冗余抽象。

### 3. `cloud-sync-worker/` 的 lint/test 边界已正确配置
- `eslint.config.js` 的 `globalIgnores` 已含 `cloud-sync-worker`。
- `package.json` 的 `test` 已用 `--exclude 'cloud-sync-worker/**'`。
- 前后端白名单**不存在漂移**：前端拆成 `SYNCABLE_RECORD_TYPES`（6 类）+ `SYNC_MANUAL_TYPES`（`ai_chat_session`），Worker 端合并为 7 项数组，语义等价且常量注释已说明。

### 4. Rust 侧依赖全部在用
- 逐个核对 `src-tauri/src/` 的 `use` 语句：`serde`、`serde_json`、`log`、`tauri`、`ed25519-dalek`、`aes-gcm`、`argon2`、`rusqlite`、`sha2`、`hmac`、`pbkdf2`、`hex`、`flate2`、`winreg` 均有实际调用。
- `tauri-plugin-http/sql/dialog` 在 `lib.rs:74-76` 注册且前端有对应使用；`capabilities/default.json` 权限项与实际插件**一致**。

### 5. `SortableCaseCard.tsx` 仍在用（仅命名遗留）
- 被 `BaziCaseLibraryModal.tsx:6` 引用。文件名的 `Sortable` 是拖拽时代的遗迹，但**改名属重构不是清理**，且会牵动 3 处注释交叉引用，未执行。

---

## 三、待你裁决（【疑】）

### 1. `vite.config.ts` 的 `/api` → `localhost:8000` 代理 —— ✅ 已删除
- **证据**：`grep -rn "localhost:8000|['\"]/api/" src/` **零命中**。
- **来历已查明**：由提交 `7c4ceb0`（2025-12-31）引入，同提交新增 `api/main.py`（Python 后端）+ `api/requirements.txt`，代理 `url` 头注释原样保留在 `vite.config.ts` 顶部。**与 Cloudflare Worker 无关**（worker 本地开发走 `wrangler dev`，默认端口 8787，未配置 port）。
- `api/` 目录早已不存在，8000 端口当前无监听。
- **已执行**：删除 `server.proxy` 整个块。

### 2. `tauri-plugin-log` 在正式包中永不启用 —— ✅ 已修复
- **现状**：`lib.rs:93-99` 用 `if cfg!(debug_assertions)` 包裹插件注册。
- **后果**：正式构建中全部 `log::warn!` 无 handler 承接（Rust `log` crate 在无 logger 时静默丢弃），涉及 9 处调用，其中 `machine_id.rs:15`（硬件指纹读取失败回退弱指纹）、`commands.rs:118/128`（激活状态读取与案例包同步失败）属**安全层告警**。
- **已执行**：移除 `cfg!(debug_assertions)` 条件，正式包也注册日志插件。落盘位置为插件默认平台目录（macOS `~/Library/Logs/<bundle-id>/`、Windows `%LOCALAPPDATA%\<bundle-id>\logs`、Android `/data/data/<pkg>/logs`）。
- **附带加固**：插件默认 `RotationStrategy::KeepAll` + 单文件 40KB，用户机长期运行会无限堆积日志文件。已显式改为 `max_file_size(200_000)` + `KeepSome(5)`，上限约 1MB。

### 3. `.env` 与 `.env.example` 已无有效变量
- 本机 `.env` 现只剩注释；`.env.example` 记录的 `ORBIS_CASE_SIGN_PUBLIC_KEY` 是 Rust **构建期**变量（`build.rs` 读取），不是 Vite 前端变量。
- **决策**：是否把 `.env.example` 重命名为 `BUILD_ENV.md` 或在文件头注明「本文件不是 Vite 环境变量」？当前文件名容易误导。

---

## 四、第二轮清理（按用户裁决执行）

| 决定 | 执行内容 |
|---|---|
| 生肖直接用新的 | 删除 `public/zodiac/` 12 个中文名 svg（兔/猴/狗/鼠/龙/猪/鸡/马/虎/羊/蛇/牛），保留 12 个 ASCII 名；同步移除 `userUtil.ts` 中「为兼容旧缓存客户端而保留中文副本」的过期注释 |
| 保留 | `public/logo2.svg` 未删 |
| `/api` 代理删除 | 见上文第三节第 1 条 |
| 合并校验脚本 | `verify-case-library-full.ts` 合并进 `verify-case-library.ts`，用 `--full` 切换；`package.json` 的 `cases:verify:full` 改为 `tsx scripts/verify-case-library.ts --full`；删除原 43 行文件 |
| 文档更新 | `docs/ponytail-audit-remaining.md` 中「条6+28 Supabase」「条27 zodiac 中文副本」两条标记为已解决并附核实结论 |

### 关于 Supabase（用户疑问答复）
代码层**已彻底移除**，不存在遗漏：
- `supabase/` 目录、`docs/database-schema.sql`、`src/lib/supabase.ts`、`src/services/authService.ts`、`src/contexts/AuthContext.tsx`、`src/components/Auth/AuthModal.tsx` 全部不在仓库。
- `package.json` 无任何 `@supabase/*` 依赖。
- `src/` 内仅剩 2 处 `supabase` 字样，均在 `src/lib/appChangelog.ts` 的**更新日志文案**里（v2.0.0「由 Vite 网页版〈Supabase 数据库 + Vercel/Cloudflare〉转向本地应用」、v2.0.5「历史抹除 supabase/workers 路径」），属产品版本记录，不该删。
- 另有 2 处含 `Supabase` 注释的**活跃代码**：`qimenImportUtils.ts:111`（CSV 时间戳 `+00` 兼容，缺它导入会丢记录）、`qimenCaseService.ts` 的 `LEGACY_UTC_SHIFTED_TEST_DATES`（18 条历史案例时间幂等修正）。这两处是「当年用 Supabase 时导入的数据」留下的兼容逻辑，不是 Supabase 客户端。

---

## 五、执行顺序与回滚

改动均未提交，工作区可见：
```bash
git diff --stat     # 21 files, +83 / -424 行
```
建议按「依赖清理」「资源与脚本清理」分两个 commit，回滚直接 `git revert`。

**未构建安装包**（遵循 AGENTS.md：AI 默认交付代码改动 + 静态自检，构建需你明确要求）。
