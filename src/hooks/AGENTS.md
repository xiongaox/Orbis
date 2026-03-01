# HOOKS KNOWLEDGE BASE

## OVERVIEW
`src/hooks` 聚合跨组件状态与副作用编排，是 UI 与领域层之间的主要桥接层。

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 八字主状态编排 | `useBazi.ts` | 案例切换 + 排盘加载 |
| 大运流年联动 | `useDayunLiunian.ts` | 时间轴选择逻辑 |
| 干支图/流通交互 | `useGanZhiDiagram.ts` `useGanZhiLiuTong.ts` | 图结构交互态 |
| 布局判定 | `useLayoutMode.ts` `useIsPadLandscape.ts` | 多端 UI 分流基线 |
| 基础能力 hook | `useMediaQuery.ts` `useDragSort.ts` | 可复用基础逻辑 |

## CONVENTIONS
- hook 负责“状态与副作用”，纯函数计算优先下沉 `src/lib/*`。
- 对外返回值保持稳定对象形状，避免调用方大面积改造。
- 事件监听与订阅必须成对清理，避免模块切换后的泄漏。

## ANTI-PATTERNS
- 不要在 hook 内直接拼接大段 UI 文本或 JSX 片段。
- 不要在多个 hook 复制同一布局判定逻辑。
- 不要把异步错误吞掉；至少记录并回传可显示错误状态。

## SIDE-EFFECT CHECKLIST
1. 检查 `useEffect` 依赖是否完整。
2. 检查 window/document 访问是否有浏览器环境保护。
3. 检查事件监听是否在 cleanup 中移除。

## NOTES
- 若 hook 返回值被多个页面消费，优先保持向后兼容并通过新增字段扩展。
