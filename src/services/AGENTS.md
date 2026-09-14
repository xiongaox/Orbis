# SERVICES KNOWLEDGE BASE

## OVERVIEW
`src/services` 负责业务 IO 与数据边界：案例 CRUD、学习面板、本地偏好与远程备份（WebDAV / S3 兼容存储）。

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 八字案例 CRUD | `baziCaseService.ts` | 抛错风格，含排序更新 |
| 奇门案例 CRUD | `qimenCaseService.ts` | 抛错风格，含分类数据 |
| 八字计算服务封装 | `bazi/baziCalculator.ts` | 领域输出聚合 |
| 资料与学习面板 | `profileService.ts` `learningPanelService.ts` | 业务侧读写 |
| 公共案例库（离线加密） | `publicCaseLibraryService.ts` | Tauri IPC（机器码/激活/本地密文读取）；浏览器端不可用 |
| 远程备份方式切换与自动备份 | `remoteBackupService.ts` | 聚合 WebDAV/S3，方法存 `backup_method` 记录 |
| WebDAV 备份 | `webdavBackupService.ts` | 配置存 `webdav_config` 记录 |
| S3 备份 | `s3BackupService.ts` | SigV4 签名见 `s3SigV4.ts`，配置存 `s3_config` 记录 |
| 备份共享工具 | `remoteBackupShared.ts` | 备份命名、路径校验、重试与超时 |

## CONVENTIONS
- case 服务沿用“日志 + throw Error”模式，调用方用 try/catch 兜底。
- 私有业务数据统一通过 `localPrivateStore` 读写；Tauri 使用 SQLite，浏览器使用 IndexedDB。
- 公共案例库走 Tauri IPC（Rust 层 `src-tauri/src/cases/`），验签、下载解密与落盘加密全在 Rust；前端不得把明文正文持久化。
- 远程备份服务（WebDAV/S3）共用 `remoteBackupShared.ts` 的备份文件命名、路径校验与重试语义；新增备份方式时先扩展共享层，并在 `localPrivateStore` 的 `PrivateRecordType` 与快照类型清单中登记配置记录。

## ANTI-PATTERNS
- 不要新增 service 时绕开共享类型并返回不稳定数据形状。

## DATA BOUNDARY NOTES
- 新增字段先确认数据库表结构与前端类型同步。
- 批量接口要明确空输入语义（返回空数组/0），避免调用方猜测。
- 所有私有业务数据默认属于当前单一本地工作区，并明确空数据语义。

## NOTES
- service 层异常信息应面向上层可消费，避免只保留控制台日志而无业务语义。
