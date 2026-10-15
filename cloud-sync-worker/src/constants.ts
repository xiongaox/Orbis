/**
 * 服务端常量。
 *
 * 白名单（实施方案 §3.1）在客户端另维护一份并校验；两侧不一致时以本服务端拒绝为准。
 * 批量上限（§4.3 第 6 条）与 workspaceId 规则（§5）见各常量注释。
 */

export const SERVICE_NAME = 'orbis-cloud-sync';
export const SERVICE_VERSION = '0.1.0';

/** 纳入同步的记录类型白名单（实施方案 §3.1） */
export const SYNCABLE_RECORD_TYPES = [
  'bazi_case',
  'qimen_case',
  'sanyuan_case',
  'profile',
  'case_favorite',
  'case_progress',
] as const;

/** 单批上限（实施方案 §4.3 第 6 条；对齐 D1 平台上限的保守取值） */
export const MAX_MUTATIONS_PER_BATCH = 50;
export const MAX_BATCH_TOTAL_BYTES = 512 * 1024;
/** 单条 payload 上限：单批总字节的一半留量（保证至少两条大记录可同批，且该校验可独立触发） */
export const MAX_PAYLOAD_BYTES = 256 * 1024;

/** workspaceId 格式与长度（实施方案 §5） */
export const WORKSPACE_ID_MAX_LENGTH = 64;
export const WORKSPACE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** recordId / mutationId / deviceId 的防滥用 sanity 上限 */
export const MAX_ID_LENGTH = 512;
