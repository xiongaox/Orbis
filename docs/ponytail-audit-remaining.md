# Ponytail 审计·剩余工作清单（重启用）

> 来源：`docs/ponytail-audit.md`（32 条全仓审计）。
> 状态：两批 safe-delete + 重构已提交（`f956176` 报告 / `3ea55df` 第一批 / `c62908f` 第二批，**均未推送**）。
> 本文档记录**未执行与部分执行**的条目。用户点名重启某项时，按对应条目的「重启步骤」执行；
> 每项完成后照例跑 `npm run lint && npx tsc -b && npm run build`，涉及 UI 视觉的改动由用户人工验收。

---

## A. 等用户/跨分支决策（不自行启动）

### 1. 条6+28：废弃 Supabase 云端栈
- **内容**：删除 `supabase/migrations/`（6 个 SQL：case_favorites、case_progress、sanyuan_cases、ai_model_services 等）与 `docs/database-schema.sql`（auth.users/profiles 时代 schema）。本分支全仓零引用。
- **为何未做**：`main` 分支仍是 Web 线，可能在用 Supabase；在本分支删除会随将来合并影响 main。
- **重启步骤**：① 在 `main` 分支核对 `grep -rn supabase src package.json` 与线上部署链路；② 确认废弃后，于当前分支 `git rm -r supabase docs/database-schema.sql`；③ 若 main 尚在用，改为在 main 分支单独处置，本分支不动。

### 2. 条27：public/zodiac 中文名副本（12 个 svg）
- **内容**：`public/zodiac/` 下中文文件名（马.svg 等）与英文名（horse.svg 等）成对存在，中文副本仅为兼容缓存旧代码的浏览器客户端（见 `src/utils/userUtil.ts` 的 ZODIAC_FILE_BY_NAME 注释）。
- **为何未做**：主站旧客户端由 main 分支服务；删除影响线上兼容，且属跨分支决策。
- **重启步骤**：① 确认线上 orbis 主站是否仍需兼容旧缓存客户端；② 不需要则删 12 个中文 svg 并简化 `userUtil.ts` 的中文名映射；③ 自检 + 用户视觉验收头像图标。

---

## B. 评估后判定「成本大于收益」（重启需用户明确要求）

### 3. 条20：CaseStudy 复制 Bazi/Qimen 图表套件（约 872 行）
- **内容**：`CaseStudy/components/` 下 CaseStudyBaziChart(270)、CaseStudyQimenChart(246)、CaseStudyPalaceCell(178)、CaseStudyQimenHeader(178) 与源模块组件半共享半复制（已复用 computePillarDetails、qimenStatusUtils、MA_XING_MAP，重复的是布局样式）。
- **为何未做**：两套 PalaceCell props 集与视觉交互显著不同（Qimen 版有双击手势、马星标记、边框；CaseStudy 版纯背景色无边框）；合并会产出 15+ 开关 props 的巨型组件，视觉差异必须人工验收。
- **重启步骤**：① 先做 props 差异矩阵（列出两套组件全部 props 与样式分叉点）；② 若走合并，设计 variant 枚举（如 `variant="chart" | "reader"`）而非布尔开关丛林；③ 分组件逐个替换（先 PalaceCell 后 Chart），每换一个跑自检；④ 用户视觉验收案例阅读页的奇门/八字盘面。**预期收益 -400~872 行，预期风险：案例阅读主功能视觉回归。**

### 4. 条13：AiChatDrawer 内嵌 CustomDropdown（约 80 行）
- **内容**：`src/components/Common/AiChatDrawer.tsx` 内嵌 CustomDropdown（isOpen + click-outside + 列表），与 `src/components/UI/CustomSelect.tsx` 同构。
- **为何未做**：两者样式结构不同（button 内 label+value+icon 组合 vs 表单式 select），直接替换改变 AI 抽屉外观。
- **重启步骤**：① 给 CustomSelect 增加 `label`/`icon`/`compact` 变体能力；② 或用户确认「样式变了也行」后直接换；③ 视觉验收 AI 抽屉顶部下拉。

### 5. 条15：useIsPadLandscape 双媒体查询简化（约 -10 行）
- **内容**：`(orientation: landscape)` 与 `(min-aspect-ratio: 1/1)` 覆盖同一横屏条件，二选一即可。
- **为何未做**：两条 query 在方屏/临界比例下行为有细微差别，删减会移动 pad 布局判定边界，收益 10 行、风险不划算。
- **重启步骤**：① 确认目标设备（iPad 方屏场景是否存在）；② 删一条后用 dev 模式转到 pad 尺寸验证三端布局；③ 用户视觉验收。

### 6. 条17（残余）：Bazi 双 CaseCard 骨架合并
- **已完成部分**：手写五行色表已删，统一走 `getElementTextColor`（第二批）。
- **剩余**：`SortableCaseCard.tsx`（287 行）与 `components/CaseList/CaseCard.tsx`（约 280 行）的卡片骨架仍各写一份（四柱渲染、年龄、姓名行结构相似，容器交互不同：一个拖拽把手、一个左滑）。
- **重启步骤**：① 抽共享子组件 `<CaseCardBody pillars age name gender ...>`（只抽静态展示区，不碰交互层）；② SortableCaseCard 与 CaseCard 各自保留手势外壳；③ 自检 + 视觉验收侧栏列表与案例库弹窗。

---

## C. 附带状态（非审计条目）

- **三个提交未推送**：`f956176`、`3ea55df`、`c62908f`（分支 `codex/tauri-migration`，领先 origin 16+3 提交）。用户点名推送时执行 `git push`。
- **工作区**：`src/components/Modules/Qimen/components/CaseInfoCard.tsx` 有用户在途修改（隐私掩码功能），与审计无关，任何后续提交都不得卷入。
- **未跟踪**：`.omo/`、`design-demos/`（保持不动）。
- **既有 lint warning**（非本次引入，可顺手修）：`src/components/Modules/CaseStudy/hooks/useCaseStudy.ts:334` exhaustive-deps 缺 `allCases` 依赖。
