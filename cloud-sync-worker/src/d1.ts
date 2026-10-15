/**
 * D1 数据访问层（实施方案 §4.2 三张表）。
 *
 * 原子性：单条变异的写入（records 条件 upsert + changes 追加 + mutations 幂等标记）
 * 在一个 env.DB.batch() 内完成（D1 batch 为单事务）。changes / mutations 的插入
 * 以「records 当前 server_version 等于本批次分配的新版本」为条件：并发竞争导致
 * 版本被其他设备推进时，三条语句均不生效，整体回退为冲突（§4.3 第 4 条）。
 */
import type { Env } from './env';

export interface StoredRecord {
  payloadJson: string;
  serverVersion: number;
  deleted: number;
}

/** records 条件 upsert：新建或当前版本匹配时写入并推进 server_version；RETURNING 返回新版本 */
const RECORDS_UPSERT_SQL = `
  INSERT INTO records (workspace_id, record_type, record_id, payload_json, server_version, deleted, updated_at, device_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(workspace_id, record_type, record_id) DO UPDATE SET
    payload_json = excluded.payload_json,
    server_version = excluded.server_version,
    deleted = excluded.deleted,
    updated_at = excluded.updated_at,
    device_id = excluded.device_id
  WHERE records.server_version = ?
  RETURNING server_version
`;

/** changes 追加：仅当 records 已是本批次分配的新版本时生效（与 upsert 同事务） */
const CHANGES_INSERT_SQL = `
  INSERT INTO changes (workspace_id, record_type, record_id, server_version, deleted, created_at)
  SELECT ?, ?, ?, ?, ?, ?
  WHERE (SELECT server_version FROM records
         WHERE workspace_id = ? AND record_type = ? AND record_id = ?) = ?
`;

/** mutations 幂等标记：条件同 changes（与 upsert 同事务） */
const MUTATIONS_INSERT_SQL = `
  INSERT INTO mutations (workspace_id, mutation_id, created_at)
  SELECT ?, ?, ?
  WHERE (SELECT server_version FROM records
         WHERE workspace_id = ? AND record_type = ? AND record_id = ?) = ?
`;

const PULL_CHANGES_SQL = `
  SELECT c.sequence AS sequence,
         c.record_type AS record_type,
         c.record_id AS record_id,
         c.server_version AS server_version,
         c.deleted AS deleted,
         CASE WHEN r.deleted = 1 THEN NULL ELSE r.payload_json END AS payload_json
  FROM changes c
  LEFT JOIN records r
    ON r.workspace_id = c.workspace_id
   AND r.record_type = c.record_type
   AND r.record_id = c.record_id
  WHERE c.workspace_id = ? AND c.sequence > ?
  ORDER BY c.sequence ASC
  LIMIT ?
`;

const BOOTSTRAP_SQL = `
  SELECT record_type, record_id, payload_json, server_version
  FROM records
  WHERE workspace_id = ? AND deleted = 0
`;

export interface WriteBatchResult {
  applied: boolean;
  serverVersion: number | null;
}

export interface ApplyWriteBatchArgs {
  workspaceId: string;
  recordType: string;
  recordId: string;
  payloadJson: string;
  newVersion: number;
  deleted: number;
  now: string;
  deviceId: string;
  /** 写入前读到的当前版本；新建记录传 null（DO UPDATE 分支的条件永不匹配） */
  expectedCurrentVersion: number | null;
  mutationId: string;
}

/**
 * 原子写入一条变异。条件未命中（并发竞争）时 applied=false，
 * 三条语句均不生效，调用方按冲突处理。
 */
export async function applyWriteBatch(env: Env, args: ApplyWriteBatchArgs): Promise<WriteBatchResult> {
  const {
    workspaceId, recordType, recordId, payloadJson, newVersion, deleted, now, deviceId,
    expectedCurrentVersion, mutationId,
  } = args;
  const results = await env.DB.batch([
    env.DB.prepare(RECORDS_UPSERT_SQL).bind(
      workspaceId, recordType, recordId, payloadJson, newVersion, deleted, now, deviceId,
      expectedCurrentVersion,
    ),
    env.DB.prepare(CHANGES_INSERT_SQL).bind(
      workspaceId, recordType, recordId, newVersion, deleted, now,
      workspaceId, recordType, recordId, newVersion,
    ),
    env.DB.prepare(MUTATIONS_INSERT_SQL).bind(
      workspaceId, mutationId, now,
      workspaceId, recordType, recordId, newVersion,
    ),
  ]);
  const returned = results[0].results ?? [];
  if (returned.length === 0) {
    return { applied: false, serverVersion: null };
  }
  const row = returned[0] as { server_version: number };
  return { applied: true, serverVersion: Number(row.server_version) };
}

export async function getRecord(
  env: Env,
  workspaceId: string,
  recordType: string,
  recordId: string,
): Promise<StoredRecord | null> {
  const row = await env.DB
    .prepare(
      'SELECT payload_json, server_version, deleted FROM records WHERE workspace_id = ? AND record_type = ? AND record_id = ?',
    )
    .bind(workspaceId, recordType, recordId)
    .first<{ payload_json: string; server_version: number; deleted: number }>();
  return row
    ? { payloadJson: row.payload_json, serverVersion: row.server_version, deleted: row.deleted }
    : null;
}

export async function isMutationProcessed(env: Env, workspaceId: string, mutationId: string): Promise<boolean> {
  const row = await env.DB
    .prepare('SELECT 1 AS one FROM mutations WHERE workspace_id = ? AND mutation_id = ?')
    .bind(workspaceId, mutationId)
    .first();
  return row !== null;
}

export async function markMutationProcessed(
  env: Env,
  workspaceId: string,
  mutationId: string,
  now: string,
): Promise<void> {
  await env.DB
    .prepare('INSERT INTO mutations (workspace_id, mutation_id, created_at) VALUES (?, ?, ?)')
    .bind(workspaceId, mutationId, now)
    .run();
}

export interface ChangeRow {
  sequence: number;
  recordType: string;
  recordId: string;
  serverVersion: number;
  deleted: number;
  payloadJson: string | null;
}

/** 增量拉取：按 sequence 升序，多取一条用于判断 hasMore */
export async function listChanges(
  env: Env,
  workspaceId: string,
  after: number,
  limit: number,
): Promise<{ changes: ChangeRow[]; hasMore: boolean }> {
  const result = await env.DB
    .prepare(PULL_CHANGES_SQL)
    .bind(workspaceId, after, limit + 1)
    .all<{
      sequence: number;
      record_type: string;
      record_id: string;
      server_version: number;
      deleted: number;
      payload_json: string | null;
    }>();
  const hasMore = result.results.length > limit;
  const changes = result.results.slice(0, limit).map((row) => ({
    sequence: row.sequence,
    recordType: row.record_type,
    recordId: row.record_id,
    serverVersion: row.server_version,
    deleted: row.deleted,
    payloadJson: row.payload_json,
  }));
  return { changes, hasMore };
}

export async function listLiveRecords(
  env: Env,
  workspaceId: string,
): Promise<Array<{ recordType: string; recordId: string; payloadJson: string; serverVersion: number }>> {
  const result = await env.DB
    .prepare(BOOTSTRAP_SQL)
    .bind(workspaceId)
    .all<{ record_type: string; record_id: string; payload_json: string; server_version: number }>();
  return result.results.map((row) => ({
    recordType: row.record_type,
    recordId: row.record_id,
    payloadJson: row.payload_json,
    serverVersion: row.server_version,
  }));
}

export async function getMaxSequence(env: Env, workspaceId: string): Promise<number> {
  const row = await env.DB
    .prepare('SELECT COALESCE(MAX(sequence), 0) AS max_sequence FROM changes WHERE workspace_id = ?')
    .bind(workspaceId)
    .first<{ max_sequence: number }>();
  return row ? row.max_sequence : 0;
}
