# MODULES KNOWLEDGE BASE

## OVERVIEW
`src/components/Modules` 承载业务页面入口与模块级 UI 组合，覆盖 Bazi/Qimen/CaseStudy/Wannianli 四大域。

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 八字页面入口与布局 | `Bazi/BaziPage.tsx` | 组合图表、信息面板、流年联动 |
| 奇门页面入口与布局 | `Qimen/QimenPage.tsx` | Desktop/Pad/Mobile 三布局分流 |
| 奇门核心状态编排 | `Qimen/hooks/useQimenState.ts` | 计算、案例、弹窗、抽屉状态聚合 |
| 案例阅读与筛选 | `CaseStudy/` | 分类、搜索、多排盘切换 |
| 万年历页面状态 | `Wannianli/` | 日历网格、移动端详情逻辑 |

## CONVENTIONS
- 模块目录只做“页面级组合 + 交互编排”，纯计算优先放 `src/lib/*`。
- 通用布局能力优先复用 `src/hooks/useLayoutMode.ts`，不要重复写端侧判定。
- 模块内新增复杂状态时，优先抽到 `hooks/` 再由页面组件消费。
- 跨模块通用组件放 `src/components/Common` 或 `src/components/UI`，避免复制。

## ANTI-PATTERNS
- 不要在模块 UI 里硬编码八字/奇门映射表。
- 不要在页面组件里直接扩展 Supabase 查询链，改到 `src/services/*`。
- 不要把移动端/桌面端分支写成散落 if-else；统一走 layout 组件分层。

## BOUNDARIES
- `Bazi/`：八字可视化与案例交互，不承担底层排盘算法。
- `Qimen/`：奇门盘面与格局展示，不承担 WASM 初始化细节实现。
- `CaseStudy/`：案例阅读/筛选/展示，不承担案例解析底层实现。
- `Wannianli/`：历法视图与交互，不复制 `lunar` 适配层逻辑。
