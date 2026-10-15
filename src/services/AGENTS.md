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
| 云同步元数据 | `cloudSyncStore.ts` | 设备本地同步配置/状态/deviceId；outbox 与版本镜像在 `localPrivateStore` 独立表 |
| 云同步编排 | `cloudSyncService.ts` | syncNow = push 队列→pull 增量→推进游标；HTTP 复用 `remoteBackupShared` 重试约定，Tauri 走 `@tauri-apps/plugin-http` |

## CONVENTIONS
- case 服务沿用“日志 + throw Error”模式，调用方用 try/catch 兜底。
- 私有业务数据统一通过 `localPrivateStore` 读写；Tauri 使用 SQLite，浏览器使用 IndexedDB。
- `localPrivateStore` 的写入口（`put`/`remove`/`clear`）统一拦截 `SYNCABLE_RECORD_TYPES` 白名单类型生成待同步 outbox 条目：同一记录待推送期间只保留最终状态（合并，baseVersion 取自 `cloud_sync_versions` 镜像）；`clear` 展开为逐条删除；`remoteOrigin: true` 的写入（pull 回灌）不入队以防同步回环。新增可同步类型时在此白名单与 Worker 端 `SYNCABLE_RECORD_TYPES` 同步登记。
- 公共案例库走 Tauri IPC（Rust 层 `src-tauri/src/cases/`），验签、下载解密与落盘加密全在 Rust；前端不得把明文正文持久化。
- 远程备份服务（WebDAV/S3）共用 `remoteBackupShared.ts` 的备份文件命名、路径校验与重试语义；新增备份方式时先扩展共享层，并在 `localPrivateStore` 的 `PrivateRecordType` 与快照类型清单中登记配置记录。
- 云同步元数据（实施方案 §4.4 四类：`cloud_sync_config`/`cloud_sync_state`/`cloud_sync_outbox`/`cloud_sync_versions`）是**设备本地数据**：config/state 存于 `private_records` 但被 `snapshot()` 与打包层排除，outbox/versions 为 `localPrivateStore` 内独立表/独立 IDB store；一律不进备份包、不参与恢复（`restore` 对 `CLOUD_SYNC_METADATA_RECORD_TYPES` 既不写入也不删除）。同步密钥（syncToken）等价于整个工作区的钥匙，禁止出现在日志、错误提示、备份导出与 toast 中。
- 云同步编排（`cloudSyncService.syncNow`）语义：**仅在服务端确认成功后**才移除 outbox 条目并更新版本镜像；pull **落库成功后才推进游标**；409 冲突按类型处理（§4.3 第 5 条）——`*_case` 生成带 `conflict_copy_of` 标记的冲突副本（新 UUID 记录，普通 put 入队下轮推送），LWW 类型（profile/case_favorite/case_progress）与删除意图直接放弃本地修改（冲突写入的 sequence 必大于 pull 游标，同轮 pull 阶段自然拉回远端版本）。`CloudSyncHttpError.code === 'UNAUTHORIZED'`（401）不可重试，调用方应停止自动重试并提示检查密钥。
- 备份恢复是**覆盖同步**：以备份为权威全集，本机有、备份没有的记录会被删除（`localPrivateStore.restore` 的 `syncTypes`）；`DEVICE_LOCAL_CONFIG_RECORD_TYPES`（webdav/s3/backup_method/auto_backup_state/云同步 config+state）永不进备份、恢复时也永不删除。备份含对话历史文件时会话按备份覆盖（replace），不含则保留本机。
  - **写入侧一律覆盖，禁止按 `updatedAt` 比较后跳过**：该时间戳由各设备本地时钟生成（`new Date().toISOString()`），跨设备比较在时钟有偏差时必然误判——手机慢几小时就会让「本机较新」恒成立，整包备份被静默跳过而界面仍提示恢复成功。恢复的语义是「还原到该备份的时点」，不是双向合并。
  - `restore` 返回的 `writtenRecordsCount` 必须来自实际写入操作；`RestoreSummary.restoredRecordsCount` 用它而非包内条数，否则不可靠的恢复仍会谎报成功。

## ANTI-PATTERNS
- 不要新增 service 时绕开共享类型并返回不稳定数据形状。

## DATA BOUNDARY NOTES
- 新增字段先确认数据库表结构与前端类型同步。
- 批量接口要明确空输入语义（返回空数组/0），避免调用方猜测。
- 所有私有业务数据默认属于当前单一本地工作区，并明确空数据语义。

## NOTES
- service 层异常信息应面向上层可消费，避免只保留控制台日志而无业务语义。
