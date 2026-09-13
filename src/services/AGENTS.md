# SERVICES KNOWLEDGE BASE

## OVERVIEW
`src/services` 负责业务 IO 与数据边界：案例 CRUD、学习面板、本地偏好与 WebDAV 备份。

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 八字案例 CRUD | `baziCaseService.ts` | 抛错风格，含排序更新 |
| 奇门案例 CRUD | `qimenCaseService.ts` | 抛错风格，含分类数据 |
| 八字计算服务封装 | `bazi/baziCalculator.ts` | 领域输出聚合 |
| 资料与学习面板 | `profileService.ts` `learningPanelService.ts` | 业务侧读写 |

## CONVENTIONS
- case 服务沿用“日志 + throw Error”模式，调用方用 try/catch 兜底。
- 私有业务数据统一通过 `localPrivateStore` 读写；Tauri 使用 SQLite，浏览器使用 IndexedDB。

## ANTI-PATTERNS
- 不要新增 service 时绕开共享类型并返回不稳定数据形状。

## DATA BOUNDARY NOTES
- 新增字段先确认数据库表结构与前端类型同步。
- 批量接口要明确空输入语义（返回空数组/0），避免调用方猜测。
- 所有私有业务数据默认属于当前单一本地工作区，并明确空数据语义。

## NOTES
- service 层异常信息应面向上层可消费，避免只保留控制台日志而无业务语义。
