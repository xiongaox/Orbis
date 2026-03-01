# XUAN BAZI KNOWLEDGE BASE

## OVERVIEW
`src/lib/xuan-bazi` 是八字领域核心库，采用 `maps / settings / utils` 三层组织，向上提供稳定的计算与解释能力。

## STRUCTURE
```text
xuan-bazi/
├── maps/      # 规则映射与大体量静态表
├── settings/  # 规则开关与策略配置
└── utils/     # 领域计算与组合输出
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 神煞规则数据源 | `maps/baziShenShaMap.ts` | 高体量映射，变更风险高 |
| 神煞计算流程 | `utils/baziShenShaUtil.ts` | 多规则组合核心 |
| 大运流年计算辅助 | `utils/baziDaYunLiuNianUtil.ts` | 与主计算结果强耦合 |
| 扩展解读与统计 | `utils/baziExtendUtil.ts` | 五行、节气、扩展视图数据 |
| 对外导出面 | `maps/index.ts` `settings/index.ts` `utils/index.ts` | 统一出口 |

## CONVENTIONS
- 常量优先集中在 `maps`，不要在 `utils` 内重复声明同义映射。
- 规则级变化先改 `settings`/`maps`，再调整 `utils` 组合逻辑。
- 新增领域能力时，先判断能否复用既有 map/key 命名体系。

## ANTI-PATTERNS
- 不要在 UI 层重新实现十神/神煞/纳音判定。
- 不要在多个 util 中散落复制同一组地支/天干映射。
- 不要直接改大映射表而不核对下游计算函数影响面。

## CHANGE CHECKLIST
1. 先搜现有 map 与 settings，确认不是重复定义。
2. 若改动会影响输出结构，同步检查调用方（`services/bazi`、`hooks`、`Modules/Bazi`）。
3. 变更后至少验证：`npx tsc -b`、`npm run build`。
