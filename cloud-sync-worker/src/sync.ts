/**
 * 同步语义实现（实施方案 §4.3）：服务端序号权威、mutation 幂等、软删除、
 * 乐观并发（409）、内容一致恢复、工作区隔离。
 */
import type { Env } from './env';
import type { PushMutation, PushRequest } from './validation';
import {
  applyWriteBatch,
  getMaxSequence,
  getRecord,
  isMutationProcessed,
  listChanges,
  listLiveRecords,
  markMutationProcessed,
  type ChangeRow,
} from './d1';

/** push 单条结果：applied（已写入）/ idempotent（幂等重放）/ duplicate_content（内容已一致） */
export interface PushResult {
  mutationId: string;
  status: 'applied' | 'idempotent' | 'duplicate_content';
  serverVersion: number | null;
}

/** push 冲突条目：客户端据此按类型策略处理（§4.3 第 5 条） */
export interface PushConflict {
  mutationId: string;
  type: string;
  recordId: string;
  serverVersion: number | null;
  deleted: number;
  payload: unknown;
}

export interface PushOutcome {
  results: PushResult[];
  conflicts: PushConflict[];
}

export interface PullChange {
  sequence: number;
  type: string;
  recordId: string;
  serverVersion: number;
  deleted: number;
  payload: unknown;
}

export interface PullOutcome {
  changes: PullChange[];
  hasMore: boolean;
  nextCursor: number | null;
  currentSequence: number;
}

export interface BootstrapRecord {
  type: string;
  recordId: string;
  payload: unknown;
  serverVersion: number;
}

export interface BootstrapOutcome {
  records: BootstrapRecord[];
  currentSequence: number;
}

export async function processPush(env: Env, request: PushRequest): Promise<PushOutcome> {
  const results: PushResult[] = [];
  const conflicts: PushConflict[] = [];
  for (const mutation of request.mutations) {
    const outcome = await applyMutation(env, request.workspaceId, request.deviceId, mutation);
    if (outcome.kind === 'conflict') {
      conflicts.push(outcome.conflict);
    } else {
      results.push(outcome.result);
    }
  }
  return { results, conflicts };
}

type MutationOutcome =
  | { kind: 'ok'; result: PushResult }
  | { kind: 'conflict'; conflict: PushConflict };

async function applyMutation(
  env: Env,
  workspaceId: string,
  deviceId: string,
  mutation: PushMutation,
): Promise<MutationOutcome> {
  const now = new Date().toISOString();

  // 1. mutation 幂等：已处理过的 mutationId 直接返回成功，不重复写入（§4.3 第 2 条）
  if (await isMutationProcessed(env, workspaceId, mutation.mutationId)) {
    const current = await getRecord(env, workspaceId, mutation.type, mutation.recordId);
    return ok({
      mutationId: mutation.mutationId,
      status: 'idempotent',
      serverVersion: current?.serverVersion ?? null,
    });
  }

  // 2. 乐观并发检测：baseVersion 必须等于服务端当前版本（§4.3 第 4 条、第 8 条）
  const current = await getRecord(env, workspaceId, mutation.type, mutation.recordId);
  if (current !== null) {
    const versionMatches = mutation.baseVersion !== null && mutation.baseVersion === current.serverVersion;
    if (!versionMatches) {
      // 内容一致恢复：远端已是推送内容（覆盖崩溃窗口与重复推送），视为生效
      if (isContentIdentical(mutation, current)) {
        await markMutationProcessed(env, workspaceId, mutation.mutationId, now);
        return ok({
          mutationId: mutation.mutationId,
          status: 'duplicate_content',
          serverVersion: current.serverVersion,
        });
      }
      return conflictOf(mutation, current.serverVersion, current.deleted, current.payloadJson);
    }
  } else if (mutation.baseVersion !== null) {
    // 客户端持有某版本，但服务端无此记录 → 冲突（客户端重新拉取后对账）
    return {
      kind: 'conflict',
      conflict: {
        mutationId: mutation.mutationId,
        type: mutation.type,
        recordId: mutation.recordId,
        serverVersion: null,
        deleted: 0,
        payload: null,
      },
    };
  }

  // 3. 原子写入：records 条件 upsert + changes + mutations（单事务，§4.3 第 1 条）
  const isDelete = mutation.operation === 'delete';
  const newVersion = (current?.serverVersion ?? 0) + 1;
  // 删除保留最后已知内容于墓碑中；新增/更新写入推送内容
  const payloadJson = isDelete ? (current?.payloadJson ?? '{}') : JSON.stringify(mutation.payload);
  const write = await applyWriteBatch(env, {
    workspaceId,
    recordType: mutation.type,
    recordId: mutation.recordId,
    payloadJson,
    newVersion,
    deleted: isDelete ? 1 : 0,
    now,
    deviceId,
    expectedCurrentVersion: current?.serverVersion ?? null,
    mutationId: mutation.mutationId,
  });

  if (!write.applied) {
    // 并发竞争：版本已被其他设备推进 → 按冲突处理（附带当前内容）
    const latest = await getRecord(env, workspaceId, mutation.type, mutation.recordId);
    if (latest !== null && isContentIdentical(mutation, latest)) {
      return ok({
        mutationId: mutation.mutationId,
        status: 'duplicate_content',
        serverVersion: latest.serverVersion,
      });
    }
    if (latest === null) {
      return {
        kind: 'conflict',
        conflict: {
          mutationId: mutation.mutationId,
          type: mutation.type,
          recordId: mutation.recordId,
          serverVersion: null,
          deleted: 0,
          payload: null,
        },
      };
    }
    return conflictOf(mutation, latest.serverVersion, latest.deleted, latest.payloadJson);
  }

  return ok({ mutationId: mutation.mutationId, status: 'applied', serverVersion: write.serverVersion });
}

function ok(result: PushResult): MutationOutcome {
  return { kind: 'ok', result };
}

function conflictOf(
  mutation: PushMutation,
  serverVersion: number | null,
  deleted: number,
  payloadJson: string,
): MutationOutcome {
  return {
    kind: 'conflict',
    conflict: {
      mutationId: mutation.mutationId,
      type: mutation.type,
      recordId: mutation.recordId,
      serverVersion,
      deleted,
      payload: deleted === 1 ? null : safeJsonParse(payloadJson),
    },
  };
}

/** 内容一致性比较：canonical JSON（键序无关），用于内容一致恢复 */
function isContentIdentical(
  mutation: PushMutation,
  current: { serverVersion: number; deleted: number; payloadJson: string },
): boolean {
  if (mutation.operation === 'delete') {
    return current.deleted === 1;
  }
  if (current.deleted === 1) {
    return false;
  }
  return canonicalJson(mutation.payload) === canonicalJson(safeJsonParse(current.payloadJson));
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function processPull(
  env: Env,
  workspaceId: string,
  after: number,
  limit: number,
): Promise<PullOutcome> {
  const { changes, hasMore } = await listChanges(env, workspaceId, after, limit);
  const nextCursor = changes.length > 0 ? changes[changes.length - 1].sequence : null;
  const currentSequence = await getMaxSequence(env, workspaceId);
  return {
    changes: changes.map((change: ChangeRow) => ({
      sequence: change.sequence,
      type: change.recordType,
      recordId: change.recordId,
      serverVersion: change.serverVersion,
      deleted: change.deleted,
      payload: change.payloadJson === null ? null : safeJsonParse(change.payloadJson),
    })),
    hasMore,
    nextCursor,
    currentSequence,
  };
}

export async function processBootstrap(env: Env, workspaceId: string): Promise<BootstrapOutcome> {
  const records = await listLiveRecords(env, workspaceId);
  const currentSequence = await getMaxSequence(env, workspaceId);
  return {
    records: records.map((record) => ({
      type: record.recordType,
      recordId: record.recordId,
      payload: safeJsonParse(record.payloadJson),
      serverVersion: record.serverVersion,
    })),
    currentSequence,
  };
}
