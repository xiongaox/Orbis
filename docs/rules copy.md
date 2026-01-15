## Prompt 指令：

请调用 component-refactoring 技能，对我的 整个 src 目录 执行一次深度重构审计。

## 审计目标：

1. 逻辑下沉： 找出所有直接在 UI 组件（.tsx 文件）中编写的复杂业务逻辑（如 lunar-typescript 的干支计算、数据过滤等），并列出需要提取到 src/hooks/ 或 src/utils/ 的清单。

2. 重复消除： 识别不同组件之间重复的代码片段，建议提取为通用的公共组件（Common Components）。

3. 状态管理评估： 检查 Props 传递链路，识别是否存在严重的 Prop Drilling（如 BaziPage 及其子组件），并评估是否需要引入 React Context 或全局状态。

4. 依赖规范： 检查 API 调用是否统一使用了 src/services/，是否存在组件直接调用底层库（如 Supabase 或 Lunar）的情况。

## 输出要求：

请先给我一份重构优先级报告，按‘高/中/低’风险列出需要优化的文件，暂时不要直接修改代码。