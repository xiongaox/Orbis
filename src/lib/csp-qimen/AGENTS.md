# CSP QIMEN KNOWLEDGE BASE

## OVERVIEW
`src/lib/csp-qimen` 承载奇门遁甲排盘领域逻辑，含 WASM 初始化、结果转换、格局检测与常量治理。

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 奇门主计算服务 | `qimenService.ts` | 大文件，含多阶段转换 |
| 常量单一数据源 | `constants.ts` | 宫/门/星/五行共享常量 |
| 常量治理规范 | `CONSTANTS.md` | 迁移与复用规则 |
| 格局检测 | `patternDetector.ts` | 全局/局部格局识别 |
| 状态/十神辅助 | `qimenStatusUtils.ts` `qimenShiShenUtils.ts` | 展示层辅助计算 |
| WASM 资产与入口 | `wasm/` | 运行时依赖 |

## CONVENTIONS
- 跨文件复用常量统一放 `constants.ts`，命名 `UPPER_SNAKE_CASE`。
- 算法私有映射保持文件内私有，避免无边界外泄。
- 复用八字层公共常量时优先走公开导出，不走深层路径。

## ANTI-PATTERNS
- 不要在功能文件重声明等价的宫/门/星/五行映射。
- 不要把展示层状态逻辑与 WASM 细节强耦合。
- 不要让状态模块依赖无关工具实现，常量可解耦则解耦。

## CHANGE CHECKLIST
1. 先查 `constants.ts` 与 `CONSTANTS.md`，确认复用路径。
2. 涉及 `qimenService.ts` 变更时，检查结果结构是否影响 `Modules/Qimen`。
3. 变更后至少验证：`npx tsc -b`、`npm run build`。

## NOTES
- 若变更包含 `wasm/` 或初始化时序，需额外验证首屏加载与异常降级路径。
