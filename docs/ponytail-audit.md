# Orbis 仓库过度设计审计（Ponytail Audit）

> 一次性全仓审计的可持续版本：每轮最多 10 条，追加记录直至跑完整个项目。
> 范围：过度设计与复杂度 only；正确性 bug、安全漏洞、性能问题不在范围内（应走普通 review）。
> 格式：`<safe-delete|verify-first> <tag> <问题>. Replace: <更简形式>. Evidence: <path:line + 实际引用>。`
> 统计口径：只数具体代码范围与 manifest 条目；未知记 `uncounted`。

## 第 1 轮（依赖 + 死代码 + 样板，覆盖：package.json / src 全局 / scripts / supabase）

1. `verify-first src/components/** 文件头样板注释（198 文件，3654 行）。Replace: 每文件保留 1 行职责说明或删除。Evidence: src/hooks/useMediaQuery.ts:1-21、src/lib/xuan-bazi/maps/baziJichuMap.ts:1-21 —— 19 行固定模板（模块定位/关键职责/主要导出/上游依赖/下游影响），全 src grep 统计 198 文件 / 3654 行，零信息增量。`
2. `safe-delete useGanZhiDiagram + useDayunLiunian 两个无消费者 hook（367 行）。Replace: 删除，需要时从 git 找回。Evidence: src/hooks/useGanZhiDiagram.ts:56、src/hooks/useDayunLiunian.ts:91 —— 全 src（含测试）grep 仅命中定义处。`
3. `safe-delete deps: classnames + @types/classnames（package.json:42-43）。Replace: 统一用已有 cn()（clsx + tailwind-merge，src/lib/utils.ts:21-23）。Evidence: 仅 4 文件 35 处用 classNames（HolidayCountdown/WannianliLayout/BaziPage/BaziCaseInfo），其余组件已用 cn()。`
4. `safe-delete deps: lunar-javascript（package.json:47）与手写声明 src/types/lunar-javascript.d.ts（46 行）。Replace: 只保留 lunar-typescript。Evidence: 全 src 无 import 'lunar-javascript'；实际 import 全是 lunar-typescript（src/services/bazi/baziCalculator.ts:21、src/utils/lunarUtil.ts:20），仅 baziCalculator.ts:180,213,271 三条过时注释提及。`
5. `safe-delete deps: ts-morph（package.json:73）与 xlsx（package.json:56）。Replace: 直接移除。Evidence: src/ 与 scripts/ grep 零命中；导入导出走自有 fileExportUtil.ts 与 wrangler CLI。`
6. `verify-first supabase/migrations 6 个 SQL 与代码零引用。Replace: 云端项目已废弃则整目录删除，仍在用则在 README 标注唯一用途。Evidence: supabase/migrations/*.sql（case_favorites、ai_model_services 等），src/package.json/scripts 全无 "supabase" 引用；实际数据层是 localPrivateStore（SQLite/IndexedDB）+ Cloudflare D1/R2（wrangler.jsonc:12）。`
7. `verify-first yagni: useAuth / useWorkspace 假认证层，6 个调用点读取恒真字段。Replace: 删除 hook，恒真分支直接去掉。Evidence: src/contexts/useAuth.ts:1-5（@deprecated，恒返回 isAuthenticated:true）、useWorkspace.ts:1-3；消费点 CaseStudyPage.tsx:41,65,71、BaziCaseList.tsx:70、CaseLibraryModal.tsx:105、DuanFaPage.tsx:58。`
8. `safe-delete yagni: settings/ 层 5 文件 502 行中 2 个完全无消费。Replace: 删除 baziJichuSetting.ts（83 行）、baziDaYunLiuNianSetting.ts（31 行）；其余 2 个 type 移入对应 Util，去掉 settings/index.ts barrel。Evidence: 仅 baziShenShaSetting:22、baziGanZhiLiuYiSetting:39 被 util import；BaziJichuSetting/createDefaultBaziJichuSetting 全仓零外部引用。收尾复查补充：settings/index.ts barrel 的消费者数量为 0（对照 maps 7、utils 11、sanyuan 9）——整个 barrel 可删。`
9. `shrink yagni: Bazi context 拆成 3 个文件（store / Provider / consumer hook）。Replace: 合并为 src/contexts/BaziContext.tsx 一个文件（约 60 行）。Evidence: baziContextStore.ts + BaziContext.tsx（仅 30 行实现）+ useBaziContext.ts（仅 useContext+throw），三者互相 import，无独立复用场景。`
10. `shrink useMediaQuery 的 SSR 与 Safari 14 分支是不存在场景的防御。Replace: 20 行 → 8 行（matchMedia + change 监听）。Evidence: src/hooks/useMediaQuery.ts:33-35（getServerSnapshot，本项目为 Vite CSR + Tauri WebView，无 SSR）、:36-39（addListener 兼容已死的 Safari 14）。`

**第 1 轮小计：net: -4181 lines, -5 deps countable**（supabase 6 个 SQL 文件、context 合并与 useAuth 分支清理的增量行数 uncounted）。

## 第 2 轮（AI 服务栈 + AI Modal + 通用组件）

11. `shrink aiModelService 三段同构的协议 probe（约 95 行重复）。Replace: 抽一个 probeEndpoint(url, body, defaultModels, hint) 帮助函数，三处各留 5 行。Evidence: src/services/aiModelService.ts:247-277（anthropic-messages）、:278-310（responses）、:311-341（openai-compatible）—— 三段均为 POST+headers+解析+401/403 提示+超时兜底，仅 body 与默认模型表不同。`
12. `shrink QimenAiPromptModal 手写空亡计算与干支数组，违反本项目「UI 层不复制算法常量」约定。Replace: 复用 src/constants/ganZhi.ts 的 TIAN_GAN/DI_ZHI 与 csp-qimen 已有的空亡计算。Evidence: src/components/Modules/Qimen/QimenAiPromptModal.tsx:40-56 手写 STEMS/BRANCHES/getKongWang；对照 src/constants/ganZhi.ts:21 与 src/lib/csp-qimen/qimenService.ts（已含 kongWang）。`
13. `shrink AiChatDrawer 文件内嵌 CustomDropdown（约 80 行），与已有 UI/CustomSelect 同构（isOpen 状态 + click-outside 监听 + option 列表）。Replace: 删除内嵌实现，改用 src/components/UI/CustomSelect.tsx。Evidence: src/components/Common/AiChatDrawer.tsx:73-160（DropdownOption + CustomDropdown）与 src/components/UI/CustomSelect.tsx:1-67 逻辑一一对应，后者已有 4 个 SanYuan 消费者。`
14. `safe-delete yagni: src/utils/chartConfig.ts（49 行含 19 行头注释）仅一个消费者。Replace: chartMeta 内联进唯一调用方。Evidence: 全 src 仅 src/components/Common/PlaceholderChart.tsx 引用 chartConfig/chartMeta。`
15. `shrink useIsPadLandscape 双媒体查询近似重复 + UA/平台嗅探堆叠。Replace: 保留 `(orientation: landscape)` 或 `(min-aspect-ratio: 1/1)` 其一，UA 判定可留但两条 query 二选一。Evidence: src/hooks/useIsPadLandscape.ts:23-25 —— `orientation: landscape` 与 `min-aspect-ratio: 1/1` 覆盖同一横屏条件；下游 4 个消费者（useLayoutMode、DuanFaPage、BaziChart、PillarCards）。`

**第 2 轮小计：net: -约 320 lines, -0 deps countable**（probe 抽取 -约50、CustomDropdown -80、chartConfig -49、头注释随删减另计 uncounted）。备份栈核对结论：remoteBackupShared 已抽取共享层，webdav/s3/remoteBackup 职责不重复，PrivateDataBackupModal（配置+执行）与 RemoteBackupManagerModal（文件列表）为父子关系 —— 不是发现，不计入。

## 第 3 轮（Modules 业务模块 + lib 各域）

16. `safe-delete useDragSort.ts（120 行）+ 其内部第二层封装 useCaseDragSort，已被 @dnd-kit 取代。Replace: 删除，拖拽一律走 dnd-kit。Evidence: 全 src 引用仅 src/hooks/useDragSort.ts 自身与 src/hooks/AGENTS.md:13；实际拖拽消费者（Bazi/Qimen SortableCaseCard、CaseLibraryModal）全部用 @dnd-kit/sortable。`
17. `verify-first shrink Bazi 存在两张同构案例卡片（300 + 301 行）。Replace: 抽共享卡片骨架与 ELEMENT_TEXT_COLOR 表，或让 SortableCaseCard 包装 CaseCard 只加拖拽把手。Evidence: src/components/Modules/Bazi/SortableCaseCard.tsx:30-36 与 components/CaseList/CaseCard.tsx:58-64 逐字相同的五行色表；两者都调 getBaziPillarsFromDateString/getAgeFromBirth/dayGanColor（SortableCaseCard:170-178 vs CaseCard:100-122）。`
18. `shrink 全局 CustomEvent 常量散落 6 处、3 种命名风格。Replace: 收敛到单一 events 模块（或改用 React 回调/context），统一命名。Evidence: src/data/caseConstants.ts:21-22（kebab）、Qimen/QimenCaseLibraryModal.tsx:26（snake）、services/webdavBackupService.ts:38 与 s3BackupService.ts:48（kebab）、services/aiTaskStatusService.ts:30（冒号）、services/remoteBackupService.ts；全 src 15 处 dispatchEvent、43 处 addEventListener 消费。`
19. `verify-first notes/sanyuan 整个 npm 库源码副本入库（12 个 git 跟踪文件，约 940K，app.js/app.mjs/app.d.ts/README/PUBLISH.md）。Replace: 项目已有 src/lib/sanyuan（sanyuanService.ts 412 行）承担三元算法；notes 仅作参考则移出仓库或停止跟踪。Evidence: git ls-files notes = 12 文件；notes/sanyuan/package.json name=sanyuan-tianxing；src/lib/sanyuan 独立实现，无任何 import 指向 notes/。`
20. `verify-first shrink CaseStudy 模块复制了 Bazi 与 Qimen 两套图表组件（合计约 950 行），且与源模块半共享半复制。Replace: CaseStudy 复用 BaziChart/PillarCards 与 QimenChart/PalaceCell，通过 props 控制只读/精简态。Evidence: CaseStudy/components/CaseStudyBaziChart.tsx（270 行，:24 已 import Bazi 的 computePillarDetails/baziStyleMap）、SimplePillarCard.tsx（77 行）、CaseStudyQimenChart.tsx（246 行，:28 import Qimen 的 MA_XING_MAP）、CaseStudyPalaceCell.tsx（178 行，:20 import Qimen 的 QimenPalace 类型）、CaseStudyQimenHeader.tsx（178 行）—— 对照源组件 BaziChart.tsx（219）、QimenChart.tsx（212）、Qimen/components/PalaceCell.tsx（282）。`
21. `safe-delete yagni: WannianliLayoutProps.ts（50 行）为单一 layout 拆出的独立接口文件。Replace: 并入 WannianliLayout.tsx。Evidence: Wannianli/layouts 只有 WannianliLayout.tsx 一个实现（358 行），该 Props 文件仅被 WannianliPage 与该 Layout 引用；对比 CaseStudy/Qimen 各有 3 个 layout 共享 Props 才值得拆。`
22. `shrink DuanFaSidebar（65 行）与 ShuShuSidebar（67 行）逐行同构。Replace: 抽一个通用 NavSidebar(title, items, selectedId, onSelect, width, variant)。Evidence: CaseStudy/components/DuanFaSidebar.tsx:30-60 与 ShuShuSidebar.tsx:30-60 —— 标题栏、列表容器、激活态样式（bg-primary/10 + 左侧指示条）完全一致，仅数据源与侧栏宽度（160px vs 100px）不同。`

**第 3 轮小计：net: -约 1660 lines, -0 deps countable**（useDragSort -120、notes/sanyuan -约 940K 字节而非行数、图表套件与卡片骨架合并收益 uncounted）。核对结论（不是发现）：4 个案例库弹窗已通过 Common/CaseLibraryModal 泛型复用；csp-qimen/wasm（csp_wasm.cpp + build_wasm.sh）是真实在用的构建源码；JsonImportModal 已统一三端导入 UI。

## 第 4 轮（src-tauri / workers / scripts / 配置层）

23. `verify-first vercel.json 死部署配置。Replace: 删除（部署已走 Cloudflare：wrangler.jsonc + scripts/deploy.mjs）。Evidence: 全仓 grep "vercel" 仅命中 vercel.json 自身；README/docs/AGENTS/.github 均无 Vercel 提及，无 .vercel 目录，无 vercel CLI 脚本。`
24. `safe-delete package.json:25-26 的 test:normal / test:admin 死脚本。Replace: 删除。Evidence: 指向 src-tauri/target/debug/orbis-normal 与 orbis-admin —— Cargo 包名为 app（src-tauri/Cargo.toml:1），仓库无任何构建步骤产出 orbis-normal/orbis-admin 二进制，README/docs/CI 零引用。`
25. `safe-delete src/components/Layout/RealtimeClock.tsx（57 行）死组件。Replace: 删除。Evidence: 全 src 对 "RealtimeClock" 组件的 import 零命中；同名的 getRealtimeClockData 是 lunarUtil.ts:177 的函数，BaziPage 直接用它，与该组件无关。`
26. `safe-delete public/github.svg 与 public/wechat.svg 零引用死资源。Replace: 删除。Evidence: grep "github.svg"/"wechat.svg" 在 src/ 与 index.html 均 0 命中（对照：author-qr.png 在 Navbar.tsx:268、logo/zodiac/aiicon 均有引用）。`
27. `verify-first public/zodiac 中文名副本 12 个 svg 是 Web 缓存兼容包袱。Replace: 若不再需要给缓存旧代码的浏览器客户端兼容（主线已是 Tauri 桌面/安卓离线包），删除中文副本，仅保留英文名文件。Evidence: src/utils/userUtil.ts:29-30 注释自述「中文名副本用于兼容仍缓存着旧代码的客户端，避免裂图」；public/zodiac 下 中文.svg 与 snake.svg 等 12+12 成对存在。`
28. `verify-first docs/database-schema.sql（Supabase auth.users/profiles 时代 schema）与第 6 条同属废弃云端栈。Replace: 与 supabase/migrations 一并处置（同删或同保留）。Evidence: 文件头自述「在 Supabase Dashboard -> SQL Editor 执行」，全仓无代码引用；实际数据层为 localPrivateStore + Cloudflare D1/R2。`
29. `shrink scripts/verify-case-library.ts（15 行）与 verify-case-library-full.ts（43 行）是两个近似脚本。Replace: 合并为一个脚本加 --full 参数。Evidence: package.json:14-15 两条相邻 script；两脚本同为拉取 /api/public/cases 目录做校验，仅「抽样 vs 全量 + 落盘报告」差异。`

**第 4 轮小计：net: -约 130 lines + 4 资产文件, -0 deps countable**（src-tauri Rust 侧核对结论：1381 行结构紧凑，Cargo 依赖 aes-gcm/ed25519-dalek/flate2/hmac/pbkdf2/sha2/hex/argon2/rusqlite/winreg 全部真实在用，不是发现；workers/case-library 133 行 + 1 条迁移是活跃的案例库 API，保留；eslint/tailwind/vite 配置均被真实使用）。

## 第 5 轮（Common / UI 组件层 + 测试 + 零引用复查）

30. `safe-delete 死组件批（3 文件，360 行）：Bazi/InsightPanelParts.tsx（242 行）、Bazi/components/CaseList/CaseSearch.tsx（41 行）、CaseStudy/components/SimplePillarCard.tsx（77 行）。Replace: 删除。Evidence: 全 src 零 import；SimplePillarCard 尤其多余 —— 唯一"用法"是 CaseStudyBaziChart.tsx:35 自己内部另定义了同名 function，外部文件从未被引用。`
31. `safe-delete 死逻辑批（2 文件，276 行）：hooks/useCaseActions.ts（164 行）、lib/xuan-bazi/utils/liunianStatusUtil.ts（112 行）。Replace: 删除。Evidence: 两文件全 src 零 import；liunianStatusUtil 连 xuan-bazi/utils/index.ts barrel 都没有 re-export（index 只导 4 个 Util）。`
32. `核对结论（非发现）：services / contexts / Common / UI 层零引用复查仅命中已列条目（useWorkspace 并入第 7 条、RealtimeClock 见第 25 条）；10 个测试文件（1090 行）全部针对 service 层真实逻辑；public 除已列两个 svg 外均有引用；.DS_Store 未入库。`

**第 5 轮小计：net: -636 lines, -0 deps countable。**

## 收尾（合并去重 + 排序 + 总计）

### 修正与去重
- 第 20 条的证据更正：SimplePillarCard.tsx 实为死文件（第 30 条），CaseStudy 图表套件实际复制量为 CaseStudyBaziChart(270) + CaseStudyQimenChart(246) + CaseStudyPalaceCell(178) + CaseStudyQimenHeader(178) = 872 行。
- 第 6 条与第 28 条同属废弃 Supabase 云端栈，可作为一次处置：supabase/migrations（6 SQL）+ docs/database-schema.sql。
- 第 7 条包含 useAuth 与 useWorkspace 两个假认证 wrapper（useWorkspace 零真实行为且仅 1 个间接消费面）。
- 排除项（按审计规则不计）：dist/、src-tauri/target*、casePreviews.generated.ts、node_modules、src/data/cases 语料。

### 按收益排序（Top 10，即首轮报告的优先级不变）
1. 条1 头样板注释 -3654 行（198 文件）
2. 条30+31+2+16+25+8+14 死文件/死代码合计 -1762 行（InsightPanelParts 242、CaseSearch 41、SimplePillarCard 77、useCaseActions 164、liunianStatusUtil 112、useGanZhiDiagram 190、useDayunLiunian 177、useDragSort 120、RealtimeClock 57、settings 死文件 114、chartConfig 49、lunar-javascript.d.ts 46）
3. 条20 CaseStudy 图表套件复制（verify-first，约 872 行可合并）
4. 条17 Bazi 双 CaseCard（verify-first，约 600 行可合并）
5. 条19 notes/sanyuan 940K 仓库副本（verify-first）
6. 条3/4/5/23/24 依赖与死配置：classnames、@types/classnames、lunar-javascript、ts-morph、xlsx（-5 deps）+ vercel.json + test:normal/test:admin
7. 条3+13 两套类名工具、两套下拉组件统一
8. 条12/18/22 UI 层重复：手写空亡、散落事件常量、同构侧栏
9. 条11/15/9 小型 shrink：三段 probe、双媒体查询、context 三文件
10. 条6+28 废弃 Supabase 栈处置

### 总计
确定可删（safe-delete 与死配置，直接口径）：
- 条1 -3654、条2 -367、条4 -46、条8 -114、条14 -49、条16 -120、条21 -40、条23 -7、条24 -2、条25 -57、条29 -40、条30 -360、条31 -276
- `net: -5132 lines, -5 deps countable`（classnames、@types/classnames、lunar-javascript、ts-morph、xlsx）
- 另计非行资产：public 2 个 svg、public/zodiac 12 个中文副本（条27 视 Web 兼容结论）、supabase 6 SQL + docs/database-schema.sql、notes/sanyuan 12 个 git 跟踪文件（约 940K）

verify-first / shrink 的进一步合并收益（未计入上表，uncounted）：约 -1200 ~ -1500 lines（条20 约 -400~872、条17 约 -250、条13 -80、条11 -50、条9 -40、条7 -60、条22 -50、条18 -30、条12 -15、条15 -10 及其余小项）。

**审计覆盖声明**：src/（components/hooks/lib/services/contexts/utils/types/constants/data 非语料部分）、scripts/、src-tauri/src + Cargo.toml、workers/、supabase/、docs/、notes/、public/、根配置（package.json/vite/eslint/tailwind/tsconfig/wrangler/vercel/CI）。未逐行阅读：src/data/cases 语料（约 747 个 Markdown，属内容资产非代码）、src-tauri/src 仅做依赖与结构核对（1381 行，未逐行审）、dist-cases 与构建产物。
