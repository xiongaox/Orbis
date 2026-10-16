/**
 * 云同步编排服务（实施方案 T06）。
 *
 * 一次同步 = push 队列 → pull 增量 → 推进游标，失败可安全重试：
 * - push：分批上传 outbox，仅在服务端确认成功后删除队列项并更新版本镜像；
 *   镜像更新失败时，下次 push 会因 baseVersion 过期触发 409，按冲突策略自愈。
 * - pull：按 lastPulledSequence 分页拉取，remote-origin 落库，落库成功后才推进游标。
 * - 首次同步（lastPulledSequence 为 null）：先走 /sync/bootstrap，再把游标设为最大 sequence。
 *
 * HTTP 层只读复用 remoteBackupShared 的超时/重试约定；Tauri 端走 @tauri-apps/plugin-http
 * 规避 CORS，与 S3 请求一致。
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import {
  MAX_RETRIES,
  fetchWithTimeout,
  isTauriRuntime,
  wait,
} from './remoteBackupShared';
import {
  getOrCreateDeviceId,
  loadCloudSyncConfig,
  loadCloudSyncState,
  saveCloudSyncConfig,
  saveCloudSyncState,
  type CloudSyncConfig,
} from './cloudSyncStore';
import {
  createId,
  enqueueSyncMutation,
  localPrivateStore,
  SYNCABLE_RECORD_TYPES,
  type OutboxEntry,
  type PrivateRecordType,
} from './localPrivateStore';
import {
  BAZI_CASES_CHANGED_EVENT,
  QIMEN_CASES_CHANGED_EVENT,
  SANYUAN_CASES_CHANGED_EVENT,
} from '../data/caseConstants';

/** 与 Worker 端 MAX_MUTATIONS_PER_BATCH 一致：单次 push 的最大 mutation 数 */
const PUSH_BATCH_SIZE = 50;
/** 与 Worker 端默认分页大小一致：单次 pull 的最大 change 数 */
const PULL_PAGE_SIZE = 100;
/** 单次请求超时（毫秒），与 S3 远程备份一致 */
const SYNC_TIMEOUT_MS = 15_000;

// 自动调度参数（T08）：指数退避与连续失败上限
/** 首次失败后的退避基数（毫秒），此后每次翻倍 */
const AUTO_SYNC_BACKOFF_BASE_MS = 30_000;
/** 退避上限（毫秒） */
const AUTO_SYNC_BACKOFF_MAX_MS = 600_000;
/** 连续失败上限：超过则停止自动重试，仅保留手动「立即同步」 */
export const AUTO_SYNC_MAX_FAILURES = 5;

/** 冲突副本标记字段：案例类冲突时，本机内容另存为新记录并携带此字段指向原记录 */
export const CONFLICT_COPY_FIELD = 'conflict_copy_of';

/** 同步请求错误：携带 HTTP 状态与 Worker 错误码，retryable 标记是否可安全重试 */
export class CloudSyncHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'CloudSyncHttpError';
    this.status = status;
    this.code = code;
  }

  /** 网络/5xx/限流可重试；401 与其余 4xx 不可重试 */
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500 || this.status === 0;
  }
}

/** push 响应条目（§4.1.1 冻结格式） */
interface PushResultItem {
  mutationId: string;
  status: 'applied' | 'idempotent' | 'duplicate_content';
  serverVersion: number | null;
}

interface PushConflictItem {
  mutationId: string;
  type: string;
  recordId: string;
  serverVersion: number | null;
  deleted: number;
  payload: unknown;
}

interface PushResponse {
  results?: PushResultItem[];
  conflicts?: PushConflictItem[];
}

interface PullChange {
  sequence: number;
  type: string;
  recordId: string;
  serverVersion: number;
  deleted: number;
  payload: unknown;
}

interface PullResponse {
  changes?: PullChange[];
  hasMore?: boolean;
}

interface BootstrapRecord {
  type: string;
  recordId: string;
  payload: Record<string, unknown>;
  serverVersion: number;
}

interface BootstrapResponse {
  records?: BootstrapRecord[];
  currentSequence?: number;
}

interface HealthResponse {
  service?: string;
  version?: string;
}

/** syncNow 结果 */
export interface SyncRunResult {
  /** ok=同步完成；disabled=未配置或未启用；skipped=已有同步在跑 */
  status: 'ok' | 'disabled' | 'skipped';
  /** 本次推送生效的 mutation 数（含幂等与内容一致恢复） */
  pushed: number;
  /** 本次拉取并落库的 change 数 */
  pulled: number;
  /** 本次按冲突策略处理的 mutation 数 */
  conflicts: number;
}

/**
 * 自动同步完成（有数据流动：推送/拉取任一 > 0）时广播的事件，
 * detail 为 SyncRunResult。UI 层（AppShell 的 CloudSyncToastListener）
 * 据此弹出「已同步」提示；无变更的同步保持静默（避免轮询噪音）。
 */
export const CLOUD_SYNC_DONE_EVENT = 'cloud_sync_done';

export interface CloudSyncStatus {
  configured: boolean;
  enabled: boolean;
  deviceId: string | null;
  /** pull 游标；从未同步为 null */
  lastPulledSequence: number | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  /** 待推送的本地变更数 */
  pendingCount: number;
}

/** 读取云同步配置；未配置返回 null */
export async function readConfig(): Promise<CloudSyncConfig | null> {
  return loadCloudSyncConfig();
}

/** 保存云同步配置 */
export async function saveConfig(config: CloudSyncConfig): Promise<void> {
  await saveCloudSyncConfig(config);
}

/**
 * 测试连接：先验连通性与鉴权（/health），再验证工作区可读（/sync/bootstrap）。
 * 返回 Worker 服务信息。
 */
export async function testConnection(): Promise<{ service: string; version: string }> {
  const config = await readConfig();
  if (!config) throw new Error('请先填写云同步配置');
  assertWorkerUrl(config.workerUrl);
  const health = await cloudFetchJson<HealthResponse>(config, 'GET', '/health');
  // workspaceId 可读性：bootstrap 会在工作区不存在时返回 INVALID_WORKSPACE
  await cloudFetchJson<BootstrapResponse>(
    config,
    'GET',
    `/sync/bootstrap?workspaceId=${encodeURIComponent(config.workspaceId)}`,
  );
  return {
    service: health.service ?? 'cloud-sync',
    version: health.version ?? 'unknown',
  };
}

/** 读取同步状态总览（供设置界面展示） */
export async function getStatus(): Promise<CloudSyncStatus> {
  const [config, state, pendingCount] = await Promise.all([
    readConfig(),
    loadCloudSyncState(),
    localPrivateStore.countOutbox(),
  ]);
  return {
    configured: config !== null,
    enabled: config?.enabled ?? false,
    deviceId: state?.deviceId ?? null,
    lastPulledSequence: state?.lastPulledSequence ?? null,
    lastSyncAt: state?.lastSyncAt ?? null,
    lastSyncError: state?.lastSyncError ?? null,
    pendingCount,
  };
}

let syncInFlight = false;

// 自动调度记账（T08）：由 syncNow 的成败维护，syncNowAuto 据此门控
let consecutiveFailures = 0;
let lastFailureAt = 0;
let autoSyncPaused = false;

/**
 * 立即执行一次同步：首次走 bootstrap（空工作区时本机历史全量入队）
 * → push 队列 → pull 增量 → 推进游标。
 * 同一时刻只允许一次同步在跑（防重入）。
 *
 * 同时维护自动调度状态：成功（含幂等空跑）清零失败计数并解除暂停；
 * 401（密钥错误）立即暂停自动同步；其余错误累计连续失败，
 * 达到上限后同样暂停自动同步。手动「立即同步」成功后自动恢复。
 */
export async function syncNow(): Promise<SyncRunResult> {
  const config = await readConfig();
  if (!config || !config.enabled) {
    return { status: 'disabled', pushed: 0, pulled: 0, conflicts: 0 };
  }
  if (syncInFlight) {
    return { status: 'skipped', pushed: 0, pulled: 0, conflicts: 0 };
  }
  syncInFlight = true;
  try {
    const deviceId = await getOrCreateDeviceId();
    let state = await loadCloudSyncState();

    // 工作区身份检测（§4.3 第 10 条）：state 记录的上次同步身份与当前配置
    // 不一致（含旧版本状态无身份记录）时，旧游标对新工作区失效，重置为
    // 首次同步状态重新探测；身份曾有记录说明明确更换了工作区，旧版本镜像
    // 同样失效，一并清空后重新全量推送
    if (state) {
      const identityChanged = state.workerUrl !== config.workerUrl
        || state.workspaceId !== config.workspaceId;
      if (identityChanged) {
        if (state.workerUrl !== undefined) {
          await localPrivateStore.clearSyncVersions();
        }
        state = {
          ...state,
          workerUrl: config.workerUrl,
          workspaceId: config.workspaceId,
          lastPulledSequence: null,
          lastSyncError: null,
        };
        await saveCloudSyncState(state);
      }
    }

    let cursor: number | null = state?.lastPulledSequence ?? null;
    let pulled = 0;

    // 首次同步：bootstrap 全量拉取云端已有记录（新设备加入场景）
    if (cursor === null) {
      const bootstrap = await cloudFetchJson<BootstrapResponse>(
        config,
        'GET',
        `/sync/bootstrap?workspaceId=${encodeURIComponent(config.workspaceId)}`,
      );
      for (const record of bootstrap.records ?? []) {
        await applyRemoteUpsert(record.type, record.recordId, record.payload, record.serverVersion);
        pulled += 1;
      }
      cursor = bootstrap.currentSequence ?? 0;
    }

    // 按需补推：版本镜像缺失的本机记录从未被当前云端确认过，
    // 全量入队后随本次 push 上云（§4.3 第 9 条）
    await seedOutboxFromLocal();

    const { pushed, conflicts, pushedKeys } = await pushOutbox(config, deviceId);
    const incremental = await pullChanges(config, cursor, pushedKeys);
    pulled += incremental.pulled;
    cursor = incremental.cursor;

    const latestState = await loadCloudSyncState();
    await saveCloudSyncState({
      deviceId: latestState?.deviceId ?? deviceId,
      workerUrl: config.workerUrl,
      workspaceId: config.workspaceId,
      lastPulledSequence: cursor,
      lastSyncAt: new Date().toISOString(),
      lastSyncError: null,
    });
    // 同步拉到的远端变更已落库：广播案例变更事件，驱动各模块列表刷新。
    // remoteOrigin 写入不触发本地写入侧的事件，UI 依赖此通知（与 restore
    // 广播同模式，localPrivateStore.ts 的 restore 先例）。
    if (
      pulled > 0
      && typeof window !== 'undefined'
      && typeof window.dispatchEvent === 'function'
    ) {
      for (const eventName of [BAZI_CASES_CHANGED_EVENT, QIMEN_CASES_CHANGED_EVENT, SANYUAN_CASES_CHANGED_EVENT]) {
        window.dispatchEvent(new CustomEvent(eventName));
      }
    }
    consecutiveFailures = 0;
    lastFailureAt = 0;
    autoSyncPaused = false;
    return { status: 'ok', pushed, pulled, conflicts };
  } catch (error) {
    const message = describeError(error);
    const state = await loadCloudSyncState();
    if (state) {
      await saveCloudSyncState({ ...state, lastSyncError: message });
    }
    if (error instanceof CloudSyncHttpError && error.code === 'UNAUTHORIZED') {
      // 401：密钥错误，自动重试无意义，暂停自动同步直到用户修正后手动同步成功
      autoSyncPaused = true;
    } else {
      consecutiveFailures += 1;
      lastFailureAt = Date.now();
      if (consecutiveFailures >= AUTO_SYNC_MAX_FAILURES) {
        autoSyncPaused = true;
      }
    }
    throw error;
  } finally {
    syncInFlight = false;
  }
}

/**
 * 自动调度触发的同步入口：在 syncNow 基础上按退避与暂停状态门控。
 * 返回 null 表示本次触发被跳过（已暂停或处于退避窗口内）。
 */
export async function syncNowAuto(): Promise<SyncRunResult | null> {
  if (autoSyncPaused) return null;
  const backoffMs = Math.min(
    AUTO_SYNC_BACKOFF_BASE_MS * 2 ** Math.min(consecutiveFailures, 6),
    AUTO_SYNC_BACKOFF_MAX_MS,
  );
  if (lastFailureAt > 0 && Date.now() - lastFailureAt < backoffMs) {
    return null;
  }
  return syncNow();
}

// ---------------------------------------------------------------------------
// HTTP 层：Tauri / 浏览器分支 + 重试退避 + 错误分类
// ---------------------------------------------------------------------------

function assertWorkerUrl(workerUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(workerUrl);
  } catch {
    throw new Error('Worker 地址格式不正确');
  }
  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !isLocalhost) {
    throw new Error('Worker 地址必须为 HTTPS（仅本地开发允许 localhost）');
  }
}

/** 构造完整请求地址（去掉 Worker 地址末尾的斜杠） */
function joinUrl(workerUrl: string, path: string): string {
  return `${workerUrl.replace(/\/+$/, '')}${path}`;
}

/** 从错误值提取可读描述：Tauri 侧 reject 的可能是字符串而非 Error 实例，避免真实原因被吞成「未知错误」 */
function describeError(error: unknown): string {
    if (error instanceof Error) return error.message || error.name;
    if (typeof error === 'string') return error;
    return '未知错误';
}

/**
 * 发起一次同步 HTTP 请求并解析 JSON。
 * - 401：立即抛出 UNAUTHORIZED（不重试，由调用方停止自动重试并提示检查密钥）
 * - 409 与 2xx：返回解析后的 JSON（409 的冲突由 push 流程处理）
 * - 网络错误/5xx/429：按 MAX_RETRIES 指数退避重试
 * - 其余 4xx：立即抛出（客户端错误，重试无意义）
 */
async function cloudFetchJson<T>(
  config: CloudSyncConfig,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const url = joinUrl(config.workerUrl, path);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.syncToken}`,
  };
  const init: RequestInit = method === 'POST'
    ? { method, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method, headers };

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await (isTauriRuntime()
        ? tauriFetch(url, init)
        : fetchWithTimeout(url, init, SYNC_TIMEOUT_MS));
      const text = await response.text();
      let json: unknown = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }
      if (response.status === 401) {
        throw new CloudSyncHttpError(401, 'UNAUTHORIZED', '鉴权失败：请检查同步密钥');
      }
      if (response.status === 409 || response.ok) {
        if (json === null || typeof json !== 'object') {
          throw new CloudSyncHttpError(response.status, 'BAD_RESPONSE', '同步响应格式异常');
        }
        return json as T;
      }
      const { code, message } = errorInfoOf(json);
      if (response.status === 429 || response.status >= 500) {
        throw new CloudSyncHttpError(
          response.status,
          code,
          `服务端暂时不可用（HTTP ${response.status}），将重试`,
        );
      }
      throw new CloudSyncHttpError(
        response.status,
        code,
        message || `同步请求被拒绝（HTTP ${response.status}）`,
      );
    } catch (error) {
      if (error instanceof CloudSyncHttpError && !error.retryable) throw error;
      lastError = error;
      if (attempt < MAX_RETRIES - 1) await wait(500 * 2 ** attempt);
    }
  }
  throw new CloudSyncHttpError(
    0,
    'NETWORK_ERROR',
    `网络错误：${describeError(lastError)}`,
  );
}

/** 从 Worker 错误响应 {error:{code,message}} 提取错误码与描述 */
function errorInfoOf(json: unknown): { code: string; message: string } {
  if (json && typeof json === 'object' && 'error' in json) {
    const error = (json as { error?: { code?: unknown; message?: unknown } }).error;
    if (error && typeof error === 'object') {
      return {
        code: typeof error.code === 'string' ? error.code : 'UNKNOWN',
        message: typeof error.message === 'string' ? error.message : '',
      };
    }
  }
  return { code: 'UNKNOWN', message: '' };
}

/**
 * 按需补推：本机存在但版本镜像缺失的记录（从未被当前云端确认过，§4.3 第 9 条）。
 *
 * 覆盖三类场景：首台设备启用云同步前的既有历史、本地调试残留
 * （旧 state 游标失效后重新探测）、更换工作区后镜像被清空重新全量推送。
 * 镜像缺失即 baseVersion 为 null，服务端按新建处理；镜像存在的记录
 * 不重复推送，正常增量同步零开销。
 *
 * 入队复用写入口的合并语义（同记录只保留最终状态）。
 */
async function seedOutboxFromLocal(): Promise<void> {
  const synced = new Set(
    (await localPrivateStore.listSyncVersions()).map((entry) => `${entry.recordType}:${entry.recordId}`),
  );
  for (const type of SYNCABLE_RECORD_TYPES) {
    for (const record of await localPrivateStore.list(type as PrivateRecordType)) {
      if (synced.has(`${type}:${record.id}`)) continue;
      await enqueueSyncMutation(type, record.id, 'upsert', record.payload);
    }
  }
}

// ---------------------------------------------------------------------------
// push：分批上传 outbox
// ---------------------------------------------------------------------------

async function pushOutbox(
  config: CloudSyncConfig,
  deviceId: string,
): Promise<{ pushed: number; conflicts: number; pushedKeys: Set<string> }> {
  let pushed = 0;
  let conflicts = 0;
  const pushedKeys = new Set<string>();
  for (;;) {
    // 每轮重新取队列：冲突处理可能产生新的待推送条目（冲突副本）
    const batch = (await localPrivateStore.listOutbox()).slice(0, PUSH_BATCH_SIZE);
    if (batch.length === 0) break;
    const result = await pushBatch(config, deviceId, batch);
    pushed += result.pushed;
    conflicts += result.conflicts;
    for (const key of result.pushedKeys) pushedKeys.add(key);
  }
  return { pushed, conflicts, pushedKeys };
}

async function pushBatch(
  config: CloudSyncConfig,
  deviceId: string,
  batch: OutboxEntry[],
): Promise<{ pushed: number; conflicts: number; pushedKeys: Set<string> }> {
  const response = await cloudFetchJson<PushResponse>(config, 'POST', '/sync/push', {
    workspaceId: config.workspaceId,
    deviceId,
    mutations: batch.map((entry) => ({
      type: entry.type,
      recordId: entry.recordId,
      operation: entry.operation,
      payload: entry.payload ?? null,
      mutationId: entry.mutationId,
      baseVersion: entry.baseVersion,
    })),
  });
  const entryByMutation = new Map(batch.map((entry) => [entry.mutationId, entry]));
  let pushed = 0;
  let conflicts = 0;
  const pushedKeys = new Set<string>();
  // 服务端已确认的 mutation（applied/idempotent/duplicate_content 均视为生效）：
  // 仅在此时才删除队列项并更新版本镜像
  for (const result of response.results ?? []) {
    const entry = entryByMutation.get(result.mutationId);
    if (!entry) continue;
    await localPrivateStore.removeOutboxEntry(result.mutationId);
    if (typeof result.serverVersion === 'number') {
      await localPrivateStore.setSyncVersion(entry.type, entry.recordId, result.serverVersion);
    }
    pushedKeys.add(`${entry.type}:${entry.recordId}`);
    pushed += 1;
  }
  for (const conflict of response.conflicts ?? []) {
    const entry = entryByMutation.get(conflict.mutationId);
    if (!entry) continue;
    await resolveConflict(entry);
    conflicts += 1;
  }
  return { pushed, conflicts, pushedKeys };
}

/**
 * 409 冲突处理（§4.3 第 5 条，分类型）：
 * - 案例类（*_case）且本地为内容修改：保留两份——远端原样保留，
 *   本机内容另存带「冲突副本」标记的新记录（put 自动入队，下轮同步推送副本）
 * - 其余情况（profile/case_favorite/case_progress 的 LWW 类型，或删除意图）：
 *   放弃本地修改并移除队列项；冲突写入的 sequence 必大于当前 pull 游标，
 *   随后的 pull 阶段会自然拉回远端版本并更新镜像
 */
async function resolveConflict(entry: OutboxEntry): Promise<void> {
  await localPrivateStore.removeOutboxEntry(entry.mutationId);
  if (entry.operation !== 'upsert' || !entry.type.endsWith('_case')) return;
  const copyId = createId();
  await localPrivateStore.put(
    entry.type as PrivateRecordType,
    { ...(entry.payload ?? {}), [CONFLICT_COPY_FIELD]: entry.recordId },
    copyId,
  );
}

// ---------------------------------------------------------------------------
// pull：分页拉取增量
// ---------------------------------------------------------------------------

/**
 * pull 增量分页：按传入游标拉取，落库成功后才推进游标
 * （落库失败时游标保持，下一轮重新拉取）。
 * 首次同步的 bootstrap 全量拉取由 syncNow 负责（§4.3 第 9 条）。
 *
 * echoKeys（本机刚推送的记录键 type:recordId）：pull 到这些键的变更
 * 是本机推送的回声（服务端先落库再进增量流），落库与游标推进照常
 * （不丢数据、不阻塞后续变更），但不计入 pulled——源设备的同步提示
 * 只显示「推送 N 条」，不把回声显示为「拉取」。
 */
async function pullChanges(
  config: CloudSyncConfig,
  initialCursor: number,
  echoKeys: Set<string> = new Set(),
): Promise<{ pulled: number; cursor: number }> {
  let cursor = initialCursor;
  let pulled = 0;

  // 增量分页：落库成功后才推进游标（落库失败时游标保持，下一轮重新拉取）
  for (;;) {
    const page: PullResponse = await cloudFetchJson<PullResponse>(
      config,
      'GET',
      `/sync/pull?workspaceId=${encodeURIComponent(config.workspaceId)}`
      + `&after=${cursor ?? 0}&limit=${PULL_PAGE_SIZE}`,
    );
    const changes = page.changes ?? [];
    if (changes.length === 0) break;
    for (const change of changes) {
      if (change.deleted === 1) {
        await localPrivateStore.remove(change.type as PrivateRecordType, change.recordId, { remoteOrigin: true });
      } else {
        await applyRemoteUpsert(change.type, change.recordId, change.payload, change.serverVersion);
      }
      if (!echoKeys.has(`${change.type}:${change.recordId}`)) {
        pulled += 1;
      }
    }
    // 游标推进到本页最后一条已落库的 change
    cursor = changes[changes.length - 1].sequence;
    if (!page.hasMore) break;
  }
  return { pulled, cursor: cursor ?? 0 };
}

/** pull 落库：remote-origin 写入（不进 outbox），并同步更新版本镜像 */
async function applyRemoteUpsert(
  type: string,
  recordId: string,
  payload: unknown,
  serverVersion: number,
): Promise<void> {
  await localPrivateStore.put(
    type as PrivateRecordType,
    (payload ?? {}) as Record<string, unknown>,
    recordId,
    undefined,
    { remoteOrigin: true },
  );
  await localPrivateStore.setSyncVersion(type, recordId, serverVersion);
}
