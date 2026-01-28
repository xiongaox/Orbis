# 案例学习：学习面板（收藏/最近/进度）+ 进度同步（Supabase）PRD

版本：v1.0

日期：2026-01-28

目标：交付给 AI 开发可直接执行（消除歧义、写死契约与验收）。

---

## 给 AI 开发的启动提示词（直接复制给开发 AI）

你在一个 React + TypeScript + Vite + Tailwind 的前端项目中工作，仓库路径为 `/Users/xiongaox/Downloads/Orbis`。

任务：在“案例学习”模块实现以下功能，并确保代码可构建、类型检查通过。

必须遵守的约束（不可猜）：

- 仅桌面端（暂不做移动端适配）。
- 仅登录用户可用：未登录时不显示学习面板 FAB、不显示文章详情页右上角收藏按钮。
- 模块范围：仅在“案例学习”模块内出现学习面板 FAB。
- 入口：
  - 学习面板入口：中间栏右下角 FAB（模块内常驻）。
  - 收藏入口：文章详情页中间栏右上角“收藏切换按钮”（只在文章详情页显示；列表页不显示）。
- 学习面板形态：Overlay 弹窗，左右分栏；左侧菜单固定 3 项（收藏文章/最近阅读/阅读进度），右侧为文章列表卡片。
- 进度：按滚动百分比 `progress_percent`（0-100）记录；保存节流（10s 或变化>=5%）；离开补写一次；恢复允许误差 ±5%。
- 已读判定：`progress_percent >= 90` 自动已读。
- 最近阅读：固定 5 条，按 `last_read_at` 倒序。
- 收藏上限：每用户最多 50 条；新增导致超限时自动移除最早收藏（按 `created_at` 升序删除），保证新收藏保留。
- Supabase：使用现有 Supabase（浏览器端 supabase-js 直连），需 RLS 仅允许用户访问自己的数据；收藏上限必须数据库兜底（触发器/函数/RPC 任选其一，但不能只靠前端）。

定位规则（用于“在哪里显示/钉在哪里/用什么当 article_id”）：

- 处于案例学习模块：`src/App.tsx` 内 `activeChart === 'xiaoliuren'` 时渲染 `CaseStudyPage`。
- “中间栏”容器：`src/components/Modules/CaseStudy/CaseStudyPage.tsx` 的中间栏 `<div className="w-[55%] ... relative ...">`。
- 文章详情页（是否有文章正在展示）：`CaseStudyPage.tsx` 内 `activeCase != null`。
- `article_id`：使用 `activeCase.id`；它在 `src/components/Modules/CaseStudy/hooks/useCaseStudy.ts` 中等于 md 文件的 path 字符串（`id: path`）。

交付物：

- Supabase SQL：新增表、索引、RLS、收藏上限 50 的数据库兜底（建议 trigger + deferrable + 按 user_id 锁）。
- 前端：学习面板（FAB + Modal + 菜单 + 列表卡片 + 分页/加载/错误态）、右上角收藏按钮、进度采集/保存/恢复、最近阅读/在读/已读筛选。
- 验收：按本文档“验收用例”逐条通过。

禁止：

- 不要引入 `as any` / `@ts-ignore` / `@ts-expect-error`。
- 不要把收藏上限做成仅前端删除。
- 不要实现移动端。

---

## 1. 背景与问题

- 案例文章约 400+，用户二次进入难快速找到上次阅读位置与重点文章。
- 目标通过“学习面板”统一提供：收藏集合、最近阅读、阅读进度（在读/已读）。

## 2. 目标与非目标

目标（MVP）：

- 登录用户可在案例学习模块任意页面打开学习面板，快速续看/回找。
- 登录用户阅读进度跨次/跨设备同步（Supabase）。
- 登录用户可收藏文章；收藏最多 50 条，自动淘汰最早收藏。

非目标（明确不做）：

- 移动端适配。
- 笔记/划线/评论/推荐/学习计划。
- 复杂排序、批量管理。

## 3. 体验与交互规范

### 3.1 入口

- 学习面板 FAB
  - 仅登录用户可见。
  - 仅在案例学习模块内可见。
  - 位置：中间栏右下角（锚定中间栏容器，而非整个 window）。
- 文章详情页右上角收藏按钮
  - 仅登录用户可见。
  - 仅当 `activeCase != null`（正在展示文章内容）时可见。
  - 点击：收藏/取消收藏当前文章。

### 3.2 学习面板（弹窗）

- 形态：Overlay 弹窗（遮罩 + 可关闭）。
- 关闭方式：右上角关闭按钮 / 点击遮罩 / ESC。
- 布局：左右分栏
  - 左栏：菜单（固定三项）
    - 收藏文章
    - 最近阅读
    - 阅读进度
  - 右栏：文章列表卡片（可滚动、分页加载）

### 3.3 右栏卡片规范（统一）

- 必显字段：标题
- 建议字段：进度百分比 / 已读标签 / 上次阅读时间
- 操作：
  - 继续阅读（进入文章并恢复进度）
  - 取消收藏（仅“收藏文章”菜单必须提供；其他菜单可选）

### 3.4 菜单内容规则

收藏文章：

- 数据：该用户收藏列表。
- 排序：`created_at` 倒序（最新收藏在前）。

最近阅读：

- 数据：固定 5 条。
- 排序：`last_read_at` 倒序。

阅读进度：

- 默认：只看“在读”
  - 在读定义：`0 < progress_percent < 90`
- 可切换：已读
  - 已读定义：`progress_percent >= 90`
- 排序：`last_read_at` 倒序。

## 4. 行为规则（写死）

### 4.1 进度百分比计算

- `progress_percent` 取值 0-100。
- 计算方式（参考逻辑，最终以实现为准但口径必须一致）：

```ts
scrollRange = scrollHeight - clientHeight
percent = scrollRange <= 0 ? 100 : (scrollTop / scrollRange) * 100
progress_percent = clamp(Math.round(percent), 0, 100)
```

### 4.2 保存策略

- 节流：每 10 秒最多写一次，或进度变化 >= 5% 立即写一次（两者取先到）。
- 离开页面/路由切换：补写一次。

### 4.3 恢复策略

- 进入文章详情页：若存在进度记录，按 `progress_percent` 恢复滚动位置。
- 恢复误差：允许 ±5%。

### 4.4 已读判定

- `progress_percent >= 90` => 已读（自动）。

### 4.5 收藏上限 50（强制规则）

- 每用户最多 50 条收藏。
- 新增收藏后若超限：按 `created_at` 升序删除最早收藏，直到剩 50 条。
- 必须数据库兜底（触发器/函数/RPC）。前端可做体验层提示，但不是唯一约束。

## 5. 数据与 Supabase 契约

### 5.1 `article_id` 口径

- `article_id` 类型：`text`。
- 取值：`activeCase.id`（md 文件 path 字符串）。

说明：当前代码中 `CaseItem.id` = path（见 `src/components/Modules/CaseStudy/hooks/useCaseStudy.ts` 的 `id: path`）。

### 5.2 表结构（建议）

`case_favorites`（收藏）：

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `article_id text not null`
- `created_at timestamptz not null default now()`
- `unique(user_id, article_id)`

索引：

- `(user_id, created_at desc)`
- `(user_id, article_id)`（如已 unique 则可省）

`case_progress`（进度）：

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `article_id text not null`
- `progress_percent smallint not null check (progress_percent between 0 and 100)`
- `last_read_at timestamptz not null default now()`
- `unique(user_id, article_id)`

索引：

- `(user_id, last_read_at desc)`
- `(user_id, progress_percent)`（支持在读/已读过滤）

### 5.3 RLS（最小权限）

- 两张表都启用 RLS。
- 仅允许登录用户访问自己的行：`auth.uid() = user_id`。

策略（示例口径）：

- SELECT: `USING (auth.uid() = user_id)`
- INSERT: `WITH CHECK (auth.uid() = user_id)`
- UPDATE: `USING (auth.uid() = user_id)`
- DELETE: `USING (auth.uid() = user_id)`

### 5.4 收藏上限 50 的数据库兜底（推荐方案）

推荐：`AFTER INSERT` 触发器 + 事务级 user 锁（避免并发）+ 删除最旧超额。

实现要点：

- 触发器函数建议 `SECURITY DEFINER` 且设置 `search_path`，并确保函数所有者为具备表权限的角色。
- 删除按 `created_at asc`，保证“前面收藏的”优先被移除。

（SQL 草案可由实现阶段补充进 `docs/database-schema.sql` 或单独 migration。）

## 6. 查询/接口口径（前端 supabase-js）

- 收藏态（详情页右上角按钮初始态）：
  - `select` 该用户 + article_id 是否存在收藏记录。
- 收藏列表：
  - `select` 收藏表按 `created_at desc` 分页。
- 最近阅读：
  - `select` 进度表按 `last_read_at desc` `limit 5`。
- 阅读进度：
  - 在读：`progress_percent > 0 and progress_percent < 90`，按 `last_read_at desc` 分页。
  - 已读：`progress_percent >= 90`，按 `last_read_at desc` 分页。
- 写进度：
  - `upsert`（冲突键：`user_id, article_id`）更新 `progress_percent` 与 `last_read_at`。

## 7. 失败与空态

- 列表加载失败：右栏展示失败态 + 重试按钮。
- 空态：分别展示“暂无收藏/暂无最近阅读/暂无在读”。
- 登录过期：隐藏入口（FAB、收藏按钮），并提示一次。

## 8. 验收用例（必须逐条通过）

1) 未登录进入案例学习模块：不出现 FAB；不出现详情页右上角收藏按钮。

2) 登录进入案例学习模块任意页面：FAB 出现在中间栏右下角。

3) 选择一篇文章进入详情：右上角收藏按钮出现；初始态与收藏表一致。

4) 阅读到约 30% 退出/切换文章，再回来：自动恢复到 30%±5%。

5) 滚动到 >=90%：该文章在“阅读进度-已读”出现，不在“在读”出现。

6) 最近阅读：固定最多 5 条，按 `last_read_at` 倒序；点击“继续阅读”可恢复进度。

7) 收藏/取消收藏：
  - 详情页右上角按钮可切换；面板“收藏文章”列表立即同步。

8) 收藏上限 50：
  - 当收藏第 51 条时，收藏总数仍为 50；新收藏存在；最早收藏被自动移除。

---

## 附：现有代码指针（帮助实现快速落位）

- 模块开关：`src/App.tsx`（`activeChart` 切换，`xiaoliuren` => `CaseStudyPage`）
- 案例学习页面：`src/components/Modules/CaseStudy/CaseStudyPage.tsx`
- 案例学习数据源与 `article_id`：`src/components/Modules/CaseStudy/hooks/useCaseStudy.ts`
- 登录态：`src/contexts/AuthContext.tsx`
