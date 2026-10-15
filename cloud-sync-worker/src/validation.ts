import { ApiError } from './errors';
import {
  DEFAULT_PULL_LIMIT,
  MAX_BATCH_TOTAL_BYTES,
  MAX_ID_LENGTH,
  MAX_MUTATIONS_PER_BATCH,
  MAX_PAYLOAD_BYTES,
  MAX_PULL_LIMIT,
  SYNCABLE_RECORD_TYPES,
  WORKSPACE_ID_MAX_LENGTH,
  WORKSPACE_ID_PATTERN,
} from './constants';

/** push 变异条目（字段名与客户端 outbox 条目一致，实施方案 §4.4） */
export interface PushMutation {
  type: string;
  recordId: string;
  operation: 'upsert' | 'delete';
  payload?: unknown;
  mutationId: string;
  baseVersion: number | null;
}

/** POST /sync/push 请求体 */
export interface PushRequest {
  workspaceId: string;
  deviceId: string;
  mutations: PushMutation[];
}

/** 校验 workspaceId 格式与长度（实施方案 §5、T02 子步骤 3） */
export function validateWorkspaceId(workspaceId: unknown): string {
  if (typeof workspaceId !== 'string' || workspaceId.length === 0) {
    throw new ApiError('INVALID_WORKSPACE', '缺少工作区标识', 400);
  }
  if (workspaceId.length > WORKSPACE_ID_MAX_LENGTH || !WORKSPACE_ID_PATTERN.test(workspaceId)) {
    throw new ApiError(
      'INVALID_WORKSPACE',
      `非法的工作区标识：长度不超过 ${WORKSPACE_ID_MAX_LENGTH}，仅允许字母、数字、-、_`,
      400,
    );
  }
  return workspaceId;
}

/** 解析 JSON 请求体；失败抛 400 INVALID_JSON */
export function parseJsonBody(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError('INVALID_JSON', '请求体不是合法 JSON', 400);
  }
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ApiError('INVALID_REQUEST', `缺少必填字段：${field}`, 400);
  }
  if (value.length > MAX_ID_LENGTH) {
    throw new ApiError('INVALID_REQUEST', `字段超长：${field}`, 400);
  }
  return value;
}

/**
 * 校验 push 请求体（实施方案 T02 子步骤 2/3/4）：
 * 白名单记录类型、workspaceId 格式与长度、单批条数、单批总字节、单条 payload 大小。
 *
 * @param body      已解析的请求体
 * @param totalBytes 请求体原始字节数（用于单批总字节校验）
 */
export function validatePushRequest(body: unknown, totalBytes: number): PushRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError('INVALID_REQUEST', '请求体必须是对象', 400);
  }

  const request = body as Record<string, unknown>;
  const workspaceId = validateWorkspaceId(request.workspaceId);
  const deviceId = requireNonEmptyString(request.deviceId, 'deviceId');

  const mutations = request.mutations;
  if (!Array.isArray(mutations)) {
    throw new ApiError('INVALID_REQUEST', 'mutations 必须是数组', 400);
  }
  if (mutations.length > MAX_MUTATIONS_PER_BATCH) {
    throw new ApiError(
      'BATCH_TOO_LARGE',
      `单批条数超限：不超过 ${MAX_MUTATIONS_PER_BATCH} 条`,
      413,
    );
  }
  if (totalBytes > MAX_BATCH_TOTAL_BYTES) {
    throw new ApiError(
      'BATCH_TOO_LARGE',
      `单批总字节超限：不超过 ${MAX_BATCH_TOTAL_BYTES} 字节`,
      413,
    );
  }

  for (const mutation of mutations) {
    validateMutation(mutation);
  }

  return { workspaceId, deviceId, mutations: mutations as PushMutation[] };
}

function validateMutation(mutation: unknown): void {
  if (typeof mutation !== 'object' || mutation === null) {
    throw new ApiError('INVALID_REQUEST', '变异条目必须是对象', 400);
  }
  const item = mutation as Record<string, unknown>;

  const type = requireNonEmptyString(item.type, 'type');
  if (!(SYNCABLE_RECORD_TYPES as readonly string[]).includes(type)) {
    throw new ApiError('INVALID_RECORD_TYPE', `非法的记录类型：${type}`, 400);
  }

  requireNonEmptyString(item.recordId, 'recordId');
  requireNonEmptyString(item.mutationId, 'mutationId');

  const operation = item.operation;
  if (operation !== 'upsert' && operation !== 'delete') {
    throw new ApiError('INVALID_OPERATION', '非法的操作类型：仅支持 upsert / delete', 400);
  }

  const baseVersion = item.baseVersion;
  if (
    baseVersion !== null &&
    (typeof baseVersion !== 'number' || !Number.isInteger(baseVersion) || baseVersion < 0)
  ) {
    throw new ApiError('INVALID_REQUEST', 'baseVersion 必须是非负整数或 null', 400);
  }

  if (operation === 'upsert') {
    if (typeof item.payload !== 'object' || item.payload === null || Array.isArray(item.payload)) {
      throw new ApiError('INVALID_REQUEST', 'upsert 操作必须携带 payload 对象', 400);
    }
    const payloadBytes = new TextEncoder().encode(JSON.stringify(item.payload)).length;
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      throw new ApiError(
        'PAYLOAD_TOO_LARGE',
        `单条 payload 超限：不超过 ${MAX_PAYLOAD_BYTES} 字节`,
        413,
      );
    }
  }
}

/** pull 分页参数（T03 子步骤 6） */
export interface PullParams {
  after: number;
  limit: number;
}

export function parsePullParams(searchParams: URLSearchParams): PullParams {
  const afterRaw = searchParams.get('after');
  const after = afterRaw === null ? 0 : Number(afterRaw);
  if (!Number.isInteger(after) || after < 0) {
    throw new ApiError('INVALID_REQUEST', 'after 必须是非负整数', 400);
  }
  const limitRaw = searchParams.get('limit');
  const limit = limitRaw === null ? DEFAULT_PULL_LIMIT : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PULL_LIMIT) {
    throw new ApiError('INVALID_REQUEST', `limit 必须是 1 到 ${MAX_PULL_LIMIT} 的整数`, 400);
  }
  return { after, limit };
}
