# SERVICES KNOWLEDGE BASE

## OVERVIEW
`src/services` 负责业务 IO 与数据边界：认证、案例 CRUD、学习面板与用户资料服务。

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 认证流程 | `authService.ts` | 返回 `{ user/error }` 风格 |
| 八字案例 CRUD | `baziCaseService.ts` | 抛错风格，含排序更新 |
| 奇门案例 CRUD | `qimenCaseService.ts` | 抛错风格，含分类数据 |
| 八字计算服务封装 | `bazi/baziCalculator.ts` | 领域输出聚合 |
| 资料与学习面板 | `profileService.ts` `learningPanelService.ts` | 业务侧读写 |

## CONVENTIONS
- auth 服务沿用“返回 error 对象”模式，调用方自行分支处理。
- case 服务沿用“日志 + throw Error”模式，调用方用 try/catch 兜底。
- Supabase 入口优先统一使用 `src/lib/supabase.ts`，兼容离线降级。

## ANTI-PATTERNS
- 不要把 auth 与 case 的错误处理风格混用。
- 不要在组件中直接写 Supabase 查询替代 service 层。
- 不要新增 service 时绕开共享类型并返回不稳定数据形状。

## DATA BOUNDARY NOTES
- 新增字段先确认数据库表结构与前端类型同步。
- 批量接口要明确空输入语义（返回空数组/0），避免调用方猜测。
- 需要匿名/离线容错时，优先复用 `supabase.ts` 的代理行为。

## NOTES
- service 层异常信息应面向上层可消费，避免只保留控制台日志而无业务语义。
