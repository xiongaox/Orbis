/**
 * 服务端常量。
 *
 * 白名单（实施方案 §3.1）在客户端另维护一份并校验；两侧不一致时以本服务端拒绝为准。
 * 批量上限（§4.3 第 6 条）与 workspaceId 规则（§5）见各常量注释。
 */

export const SERVICE_NAME = 'orbis-cloud-sync';
export const SERVICE_VERSION = '0.1.0';

/**
 * 纳入同步的记录类型白名单（实施方案 §3.1）。
 *
 * `ai_chat_session` 为「仅手动同步」类型（§4.3 第 11 条，每会话一条记录）：
 * 客户端写入口不自动入队、不定时补推，只由对话历史弹窗的「同步」按钮显式触发；
 * 服务端此处只需放行校验。旧版整份数组类型 `ai_chat_sessions` 已废弃（客户端预载时迁移拆分）。
 */
export const SYNCABLE_RECORD_TYPES = [
  'bazi_case',
  'qimen_case',
  'sanyuan_case',
  'profile',
  'case_favorite',
  'case_progress',
  'ai_chat_session',
] as const;

/** 单批上限（实施方案 §4.3 第 6 条；对齐 D1 平台上限的保守取值） */
export const MAX_MUTATIONS_PER_BATCH = 50;
/** 单批总字节上限：必须 ≥ 单条上限，否则大记录无法单独成批推送 */
export const MAX_BATCH_TOTAL_BYTES = 2 * 1024 * 1024;
/**
 * 单条 payload 上限：D1 单行/单值硬上限 2 MB（developers.cloudflare.com/d1/platform/limits）
 * 的一半留量：单个 AI 会话（ai_chat_session）通常只有数十 KB，1 MB 足以覆盖
 * 异常冗长的单会话，同时留出 D1 2 MB 硬上限的安全余量。原先的 256 KB 保守值
 * 在真实数据上直接拒绝了推送（见 §13.3 修订记录）。
 */
export const MAX_PAYLOAD_BYTES = 1024 * 1024;

/** workspaceId 格式与长度（实施方案 §5） */
export const WORKSPACE_ID_MAX_LENGTH = 64;
export const WORKSPACE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** pull 分页默认值与上限（T03 子步骤 6） */
export const DEFAULT_PULL_LIMIT = 100;
export const MAX_PULL_LIMIT = 200;

/** recordId / mutationId / deviceId 的防滥用 sanity 上限 */
export const MAX_ID_LENGTH = 512;
