/**
 * 单工作区本地私有数据存储层。
 *
 * Tauri 使用 SQLite，浏览器使用 IndexedDB。底层保留旧 user_id 列仅用于
 * 兼容已有数据；公开记录、业务 API 和备份格式均不再包含账号信息。
 */
import Database from '@tauri-apps/plugin-sql';
import { BAZI_CASES_CHANGED_EVENT, QIMEN_CASES_CHANGED_EVENT, SANYUAN_CASES_CHANGED_EVENT } from '../data/caseConstants';

export type PrivateRecordType = 'bazi_case' | 'qimen_case' | 'sanyuan_case' | 'profile' | 'ai_model_service' | 'case_favorite' | 'case_progress' | 'webdav_config' | 's3_config' | 'backup_method'
  // 以下为从 localStorage 迁入 SQLite 的本地持久化数据
  | 'app_setting' // 通用设置：theme、布局、隐私开关、导航槽位、锁定盘、研判状态、AI 角色 prompt 等
  | 'ai_chat_sessions' // AI 研判对话历史（单条记录存整份会话数组）
  | 'auto_backup_state' // 自动备份调度状态（设备本地，不进备份）
  // 以下为云同步元数据（设备本地，实施方案 §4.4）
  | 'cloud_sync_config' // 云同步配置：启用开关、Worker 地址、同步密钥、工作区标识
  | 'cloud_sync_state'; // 云同步状态：deviceId、pull 游标、最近同步结果

export interface PrivateRecord {
  id: string;
  type: PrivateRecordType;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  sortOrder?: number;
}

export interface PrivateDataSnapshot {
  schemaVersion: number;
  exportedAt: string;
  records: PrivateRecord[];
}

/** 云同步 outbox 条目（实施方案 §4.4）：待推送的本地变更，字段与 push 请求体一致 */
export interface OutboxEntry {
  mutationId: string;
  type: string;
  recordId: string;
  operation: 'upsert' | 'delete';
  payload?: Record<string, unknown>;
  /** 该记录最近已知服务端版本；从未同步为 null */
  baseVersion: number | null;
}

/** cloud_sync_versions 镜像条目：record_type + record_id → 最近同步到的服务端版本 */
export interface SyncVersionEntry {
  recordType: string;
  recordId: string;
  serverVersion: number;
}

/**
 * 可同步记录类型白名单（与 Worker 端 SYNCABLE_RECORD_TYPES 一致，
 * 实施方案 §4.3）。其余类型（配置、会话、应用设置等）为设备本地，
 * 不进同步队列。
 */
export const SYNCABLE_RECORD_TYPES = new Set<string>([
  'bazi_case',
  'qimen_case',
  'sanyuan_case',
  'profile',
  'case_favorite',
  'case_progress',
]);

/** 写入口选项：remoteOrigin 标记远端回灌写入（pull 落库），不产生 outbox（防同步回环） */
export interface WriteOptions {
  remoteOrigin?: boolean;
}

/**
 * 设备本地配置类型：不进备份包，恢复其他设备的备份时也绝不删除本机这些记录
 * （备份里没有它们，覆盖式同步不能把本机备份凭据删掉）。
 */
export const DEVICE_LOCAL_CONFIG_RECORD_TYPES = new Set<string>([
  'webdav_config',
  's3_config',
  'backup_method',
  // 自动备份时间戳：跨设备覆盖会让一台设备的备份节奏干扰另一台（读到他人时间戳而跳过补跑），故不进备份
  'auto_backup_state',
  // 云同步配置与状态同属设备本地：同步凭据、游标与同步结果不跨设备覆盖
  'cloud_sync_config',
  'cloud_sync_state',
]);

/**
 * 云同步元数据（实施方案 §4.4 的四类设备本地状态）：
 * - cloud_sync_config / cloud_sync_state 存于 private_records，
 *   但快照与恢复均不感知（不进备份包、不被覆盖、不被删除）；
 * - cloud_sync_outbox / cloud_sync_versions 为独立表 / 独立 IDB store，
 *   结构上不经过 private_records，天然不进快照。
 */
export const CLOUD_SYNC_METADATA_RECORD_TYPES = new Set<string>([
  'cloud_sync_config',
  'cloud_sync_state',
]);

type LegacyPrivateRecord = PrivateRecord & { userId?: string; user_id?: string };
type LegacySnapshot = { schemaVersion: number; exportedAt: string; records: LegacyPrivateRecord[]; auth?: unknown };

const DB_NAME = 'orbis-private.db';
const IDB_NAME = 'orbis-private';
const IDB_STORE = 'records';
/** 云同步版本镜像 / outbox 的独立 IDB store（不混入 records，快照天然不可见） */
const SYNC_VERSIONS_STORE = 'sync-versions';
const SYNC_OUTBOX_STORE = 'sync-outbox';
/**
 * 备份快照 schema 版本；导出供备份解包层校验旧格式快照。
 * v3 起新增云同步元数据独立表（快照记录格式未变）；
 * 恢复接受 1..SCHEMA_VERSION 的区间，保证 v1/v2 旧备份平滑可恢复。
 */
export const SCHEMA_VERSION = 3;
const DEFAULT_WORKSPACE = 'default';

type TauriDatabase = Awaited<ReturnType<typeof Database.load>>;
let tauriDatabasePromise: Promise<TauriDatabase> | null = null;

const isTauriRuntime = () => typeof window !== 'undefined' && Boolean(
  (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
);

const now = () => new Date().toISOString();

export function createId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sanitizePayload(payload: Record<string, unknown>) {
  const { user_id: _userId, userId: _legacyUserId, ...cleanPayload } = payload;
  void _userId;
  void _legacyUserId;
  return cleanPayload;
}

function normalizeRecord(record: LegacyPrivateRecord): PrivateRecord {
  return {
    id: record.id,
    type: record.type,
    payload: sanitizePayload(record.payload),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    sortOrder: record.sortOrder,
  };
}

async function getTauriDatabase() {
  if (!tauriDatabasePromise) {
    tauriDatabasePromise = Database.load(`sqlite:${DB_NAME}`).then(async (database) => {
      await database.execute(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL
        )
      `);
      await database.execute(`
        CREATE TABLE IF NOT EXISTS private_records (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE}',
          record_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sort_order INTEGER
        )
      `);
      await database.execute(`UPDATE private_records SET user_id = '${DEFAULT_WORKSPACE}' WHERE user_id IS NULL OR user_id = ''`);
      await database.execute('CREATE INDEX IF NOT EXISTS idx_private_records_scope ON private_records(user_id, record_type, updated_at)');
      // 云同步元数据独立表（schema 升级，IF NOT EXISTS 保证老库平滑升级、可重复执行）
      await database.execute(`
        CREATE TABLE IF NOT EXISTS cloud_sync_versions (
          record_type TEXT NOT NULL,
          record_id TEXT NOT NULL,
          server_version INTEGER NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (record_type, record_id)
        )
      `);
      await database.execute(`
        CREATE TABLE IF NOT EXISTS cloud_sync_outbox (
          mutation_id TEXT PRIMARY KEY,
          record_type TEXT NOT NULL,
          record_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          payload_json TEXT,
          base_version INTEGER,
          enqueued_at TEXT NOT NULL
        )
      `);
      await database.execute(
        'INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES ($1, $2)',
        [SCHEMA_VERSION, now()],
      );
      return database;
    });
  }
  return tauriDatabasePromise;
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前环境不支持 IndexedDB'));
      return;
    }
    const request = indexedDB.open(IDB_NAME, SCHEMA_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(IDB_STORE)
        ? request.transaction?.objectStore(IDB_STORE)
        : db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      if (store && !store.indexNames.contains('scope')) store.createIndex('scope', ['userId', 'type'], { unique: false });
      // schema 升级（SCHEMA_VERSION 2 → 3）时创建云同步独立 store；
      // 幂等创建保证可重复执行、老库平滑升级
      if (!db.objectStoreNames.contains(SYNC_VERSIONS_STORE)) {
        db.createObjectStore(SYNC_VERSIONS_STORE, { keyPath: ['recordType', 'recordId'] });
      }
      // outbox 以自增 seq 为主键：getAll() 即入队顺序；mutationId 域唯一（入队幂等去重）
      if (!db.objectStoreNames.contains(SYNC_OUTBOX_STORE)) {
        db.createObjectStore(SYNC_OUTBOX_STORE, { keyPath: 'seq', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('打开本地数据库失败'));
  });
}

const memoryRecords = new Map<string, PrivateRecord>();
/** 内存回退（无 IndexedDB 环境，如测试）：cloud_sync_versions 版本镜像 */
const memorySyncVersions = new Map<string, number>();
/** 内存回退：cloud_sync_outbox（Map 保持插入顺序，与 SQLite rowid / IDB 自增 seq 语义一致） */
const memoryOutbox = new Map<string, OutboxEntry>();

function syncVersionKey(recordType: string, recordId: string): string {
  return `${recordType} ${recordId}`;
}

type StoredRecord = PrivateRecord & { userId?: string };

/**
 * 列出本地全部记录（不按类型过滤）。
 * 备份快照专用：避免依赖手写类型清单而在新增术数时漏备份。
 */
async function listAllRecords(): Promise<PrivateRecord[]> {
  if (isTauriRuntime()) {
    const db = await getTauriDatabase();
    const rows = await db.select<Array<{ id: string; record_type: PrivateRecordType; payload: string; created_at: string; updated_at: string; sort_order?: number }>>(
      'SELECT id, record_type, payload, created_at, updated_at, sort_order FROM private_records ORDER BY record_type, COALESCE(sort_order, 2147483647), updated_at DESC',
    );
    return rows.map(fromRow);
  }
  if (typeof indexedDB === 'undefined') return [...memoryRecords.values()];
  await migrateIndexedRecords();
  const records = await withIndexedStore<StoredRecord[]>('readonly', IDB_STORE, (store) => store.getAll());
  return records.map(normalizeRecord).sort((a, b) => a.type.localeCompare(b.type)
    || (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER));
}

async function withIndexedStore<T>(mode: IDBTransactionMode, storeName: string, action: (store: IDBObjectStore) => IDBRequest<T>) {
  if (typeof indexedDB === 'undefined') throw new Error('当前环境不支持 IndexedDB');
  const db = await openIndexedDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('本地数据库操作失败'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error ?? new Error('本地数据库事务失败'));
  });
}

async function migrateIndexedRecords() {
  if (typeof indexedDB === 'undefined') return;
  const records = await withIndexedStore<StoredRecord[]>('readonly', IDB_STORE, (store) => store.getAll());
  const needsMigration = records.filter((record) => record.userId !== DEFAULT_WORKSPACE || 'user_id' in record.payload || 'userId' in record.payload);
  if (!needsMigration.length) return;
  await withIndexedStore('readwrite', IDB_STORE, (store) => {
    for (const record of needsMigration) store.put({ ...normalizeRecord(record), userId: DEFAULT_WORKSPACE });
    return store.getAll();
  });
}

function fromRow(row: { id: string; record_type: PrivateRecordType; payload: string; created_at: string; updated_at: string; sort_order?: number }): PrivateRecord {
  return normalizeRecord({
    id: row.id,
    type: row.record_type,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order ?? undefined,
  });
}

export const localPrivateStore = {
  async list(type: PrivateRecordType): Promise<PrivateRecord[]> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      const rows = await db.select<Array<{ id: string; record_type: PrivateRecordType; payload: string; created_at: string; updated_at: string; sort_order?: number }>>(
        'SELECT id, record_type, payload, created_at, updated_at, sort_order FROM private_records WHERE record_type = $1 ORDER BY COALESCE(sort_order, 2147483647), updated_at DESC',
        [type],
      );
      return rows.map(fromRow);
    }
    if (typeof indexedDB === 'undefined') return [...memoryRecords.values()].filter((record) => record.type === type);
    await migrateIndexedRecords();
    const records = await withIndexedStore<StoredRecord[]>('readonly', IDB_STORE, (store) => store.getAll());
    return records.filter((record) => record.type === type).map(normalizeRecord).sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER));
  },

  async get(type: PrivateRecordType, id: string): Promise<PrivateRecord | null> {
    const records = await this.list(type);
    return records.find((record) => record.id === id) ?? null;
  },

  async put(type: PrivateRecordType, payload: Record<string, unknown>, id = String(payload.id ?? createId()), sortOrder?: number, options?: WriteOptions): Promise<PrivateRecord> {
    const previous = await this.get(type, id);
    const record: PrivateRecord = {
      id,
      type,
      payload: { ...sanitizePayload(payload), id },
      createdAt: previous?.createdAt ?? String(payload.created_at ?? now()),
      updatedAt: now(),
      sortOrder: sortOrder ?? (typeof payload.sort_order === 'number' ? payload.sort_order : previous?.sortOrder),
    };
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute(
        `INSERT INTO private_records(id, user_id, record_type, payload, created_at, updated_at, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, payload = excluded.payload, updated_at = excluded.updated_at, sort_order = excluded.sort_order`,
        [record.id, DEFAULT_WORKSPACE, record.type, JSON.stringify(record.payload), record.createdAt, record.updatedAt, record.sortOrder ?? null],
      );
    } else if (typeof indexedDB === 'undefined') {
      memoryRecords.set(record.id, record);
    } else {
      await withIndexedStore('readwrite', IDB_STORE, (store) => store.put({ ...record, userId: DEFAULT_WORKSPACE }));
    }
    // 本地写入成功后入队待同步变更（远端回灌写入除外）
    if (!options?.remoteOrigin) {
      await enqueueSyncMutation(type, id, 'upsert', record.payload);
    }
    return record;
  },

  async remove(type: PrivateRecordType, id: string, options?: WriteOptions) {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute('DELETE FROM private_records WHERE id = $1 AND record_type = $2', [id, type]);
    } else if (typeof indexedDB === 'undefined') {
      memoryRecords.delete(id);
    } else {
      await withIndexedStore('readwrite', IDB_STORE, (store) => store.delete(id));
    }
    if (!options?.remoteOrigin) {
      await enqueueSyncMutation(type, id, 'delete', undefined);
    }
  },

  async clear(type: PrivateRecordType, options?: WriteOptions) {
    // clear 语义：为每条现存记录生成删除操作；清空后无法再列举，故先取
    const existing = !options?.remoteOrigin && SYNCABLE_RECORD_TYPES.has(type)
      ? await this.list(type)
      : [];
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute('DELETE FROM private_records WHERE record_type = $1', [type]);
    } else if (typeof indexedDB === 'undefined') {
      for (const [id, record] of memoryRecords) if (record.type === type) memoryRecords.delete(id);
    } else {
      const records = await withIndexedStore<StoredRecord[]>('readonly', IDB_STORE, (store) => store.getAll());
      await withIndexedStore('readwrite', IDB_STORE, (store) => {
        for (const record of records) if (record.type === type) store.delete(record.id);
        return store.getAll();
      });
    }
    for (const record of existing) {
      await enqueueSyncMutation(type, record.id, 'delete', undefined);
    }
  },

  /** 读取某条记录最近同步到的服务端版本；从未同步为 null */
  async getSyncVersion(recordType: string, recordId: string): Promise<number | null> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      const rows = await db.select<Array<{ server_version: number }>>(
        'SELECT server_version FROM cloud_sync_versions WHERE record_type = $1 AND record_id = $2',
        [recordType, recordId],
      );
      return rows.length > 0 ? rows[0].server_version : null;
    }
    if (typeof indexedDB === 'undefined') {
      return memorySyncVersions.get(syncVersionKey(recordType, recordId)) ?? null;
    }
    const rows = await withIndexedStore<Array<{ recordType: string; recordId: string; serverVersion: number }>>(
      'readonly', SYNC_VERSIONS_STORE, (store) => store.getAll(),
    );
    const hit = rows.find((row) => row.recordType === recordType && row.recordId === recordId);
    return hit ? hit.serverVersion : null;
  },

  /** 写入（覆盖）某条记录的版本镜像 */
  async setSyncVersion(recordType: string, recordId: string, serverVersion: number): Promise<void> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute(
        `INSERT INTO cloud_sync_versions (record_type, record_id, server_version, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT(record_type, record_id) DO UPDATE SET server_version = excluded.server_version, updated_at = excluded.updated_at`,
        [recordType, recordId, serverVersion, now()],
      );
      return;
    }
    if (typeof indexedDB === 'undefined') {
      memorySyncVersions.set(syncVersionKey(recordType, recordId), serverVersion);
      return;
    }
    await withIndexedStore('readwrite', SYNC_VERSIONS_STORE, (store) => store.put({ recordType, recordId, serverVersion, updatedAt: now() }));
  },

  /** 按类型批量读取版本镜像；不传类型则读取全部 */
  async listSyncVersions(recordType?: string): Promise<SyncVersionEntry[]> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      const rows = recordType === undefined
        ? await db.select<Array<{ record_type: string; record_id: string; server_version: number }>>(
          'SELECT record_type, record_id, server_version FROM cloud_sync_versions',
        )
        : await db.select<Array<{ record_type: string; record_id: string; server_version: number }>>(
          'SELECT record_type, record_id, server_version FROM cloud_sync_versions WHERE record_type = $1',
          [recordType],
        );
      return rows.map((row) => ({ recordType: row.record_type, recordId: row.record_id, serverVersion: row.server_version }));
    }
    if (typeof indexedDB === 'undefined') {
      return [...memorySyncVersions.entries()]
        .map(([key, serverVersion]) => {
          const [type, id] = key.split(' ');
          return { recordType: type, recordId: id, serverVersion };
        })
        .filter((entry) => recordType === undefined || entry.recordType === recordType);
    }
    const rows = await withIndexedStore<Array<{ recordType: string; recordId: string; serverVersion: number }>>(
      'readonly', SYNC_VERSIONS_STORE, (store) => store.getAll(),
    );
    return rows
      .filter((row) => recordType === undefined || row.recordType === recordType)
      .map((row) => ({ recordType: row.recordType, recordId: row.recordId, serverVersion: row.serverVersion }));
  },

  /** 清空全部版本镜像（更换工作区时旧镜像失效，实施方案 §4.3 第 10 条） */
  async clearSyncVersions(): Promise<void> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute('DELETE FROM cloud_sync_versions');
      return;
    }
    if (typeof indexedDB === 'undefined') {
      memorySyncVersions.clear();
      return;
    }
    await withIndexedStore('readwrite', SYNC_VERSIONS_STORE, (store) => store.clear());
  },

  /** 追加一条待同步变更（同一 mutationId 重复入队不产生重复项） */
  async enqueueOutbox(entry: OutboxEntry): Promise<void> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute(
        `INSERT INTO cloud_sync_outbox (mutation_id, record_type, record_id, operation, payload_json, base_version, enqueued_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT(mutation_id) DO NOTHING`,
        [
          entry.mutationId, entry.type, entry.recordId, entry.operation,
          entry.payload === undefined ? null : JSON.stringify(entry.payload),
          entry.baseVersion, now(),
        ],
      );
      return;
    }
    if (typeof indexedDB === 'undefined') {
      memoryOutbox.set(entry.mutationId, entry);
      return;
    }
    const existing = await withIndexedStore<Array<{ mutationId: string }>>(
      'readonly', SYNC_OUTBOX_STORE, (store) => store.getAll(),
    );
    if (existing.some((row) => row.mutationId === entry.mutationId)) return;
    await withIndexedStore('readwrite', SYNC_OUTBOX_STORE, (store) => store.put({ ...entry }));
  },

  /** 按入队顺序批量取全部待同步变更 */
  async listOutbox(): Promise<OutboxEntry[]> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      const rows = await db.select<Array<{
        mutation_id: string; record_type: string; record_id: string; operation: string; payload_json: string | null; base_version: number | null;
      }>>('SELECT mutation_id, record_type, record_id, operation, payload_json, base_version FROM cloud_sync_outbox ORDER BY rowid');
      return rows.map((row) => ({
        mutationId: row.mutation_id,
        type: row.record_type,
        recordId: row.record_id,
        operation: row.operation as 'upsert' | 'delete',
        payload: row.payload_json === null ? undefined : (JSON.parse(row.payload_json) as Record<string, unknown>),
        baseVersion: row.base_version,
      }));
    }
    if (typeof indexedDB === 'undefined') {
      return [...memoryOutbox.values()];
    }
    const rows = await withIndexedStore<Array<OutboxEntry>>('readonly', SYNC_OUTBOX_STORE, (store) => store.getAll());
    return rows.map((row) => ({ ...row }));
  },

  /** 按 mutationId 删除一条 outbox 条目（推送成功后调用） */
  async removeOutboxEntry(mutationId: string): Promise<void> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute('DELETE FROM cloud_sync_outbox WHERE mutation_id = $1', [mutationId]);
      return;
    }
    if (typeof indexedDB === 'undefined') {
      memoryOutbox.delete(mutationId);
      return;
    }
    const rows = await withIndexedStore<Array<OutboxEntry & { seq?: number }>>(
      'readonly', SYNC_OUTBOX_STORE, (store) => store.getAll(),
    );
    const target = rows.find((row) => row.mutationId === mutationId);
    const seq = target?.seq;
    if (seq === undefined) return;
    await withIndexedStore('readwrite', SYNC_OUTBOX_STORE, (store) => store.delete(seq));
  },

  /** 清空 outbox（仅在确认全部推送成功后调用） */
  async clearOutbox(): Promise<void> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute('DELETE FROM cloud_sync_outbox');
      return;
    }
    if (typeof indexedDB === 'undefined') {
      memoryOutbox.clear();
      return;
    }
    await withIndexedStore('readwrite', SYNC_OUTBOX_STORE, (store) => store.clear());
  },

  /** outbox 待同步条数 */
  async countOutbox(): Promise<number> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      const rows = await db.select<Array<{ cnt: number }>>('SELECT COUNT(*) AS cnt FROM cloud_sync_outbox');
      return rows[0]?.cnt ?? 0;
    }
    if (typeof indexedDB === 'undefined') {
      return memoryOutbox.size;
    }
    const rows = await withIndexedStore<Array<unknown>>('readonly', SYNC_OUTBOX_STORE, (store) => store.getAll());
    return rows.length;
  },

  async snapshot(): Promise<PrivateDataSnapshot> {
    // 不按手写类型清单逐类查询：新增术数（新 case 类型）时若漏同步清单，
    // 该术数案例会静默不进备份包；直接列全部记录可彻底避免这类遗漏。
    // 云同步元数据（config/state）为设备本地状态，快照不感知；
    // outbox/versions 为独立表，结构上不经过 private_records。
    const records = (await listAllRecords()).filter(
      (record) => !CLOUD_SYNC_METADATA_RECORD_TYPES.has(record.type),
    );
    return { schemaVersion: SCHEMA_VERSION, exportedAt: now(), records };
  },

  /**
   * 恢复备份。
   *
   * 写入规则：备份为权威，备份内记录一律写入（覆盖本机同 id 记录）。
   * 早期实现按 updatedAt 比较、本机较新则跳过；但 updatedAt 来自各设备本地时钟，
   * 手机时钟偏差会让「本机较新」恒成立，备份被整包静默跳过而界面仍报成功。
   * 恢复的语义是「还原到该备份的时点」，故不再比较时间戳。
   * 同步规则（options.syncTypes）：调用方声明需要完全同步的类型下，
   * 本机有、备份没有的记录会被删除，使恢复结果与备份一致
   * （避免多端各自累积、案例库越并越乱）；设备本地配置类型永不删除。
   * 云同步元数据（config/state）既不写入也不删除——它们是设备本地状态，
   * 快照本就不含它们；此处防御外部手工构造的备份包混入。
   */
  async restore(
    snapshot: PrivateDataSnapshot | LegacySnapshot,
    options?: { syncTypes?: Iterable<string> },
  ): Promise<{ writtenRecordsCount: number; removedRecordsCount: number }> {
    const schemaVersion = snapshot?.schemaVersion;
    if (!snapshot || !Array.isArray(snapshot.records) || typeof schemaVersion !== 'number'
      || schemaVersion < 1 || schemaVersion > SCHEMA_VERSION) throw new Error('备份文件版本不受支持');
    const records = snapshot.records.map((record) => normalizeRecord({
      ...record,
      id: normalizeLegacyId(record),
      payload: normalizeLegacyPayload(record),
    }));
    const syncedIds = new Map<string, Set<string>>();
    for (const record of records) {
      let ids = syncedIds.get(record.type);
      if (!ids) {
        ids = new Set<string>();
        syncedIds.set(record.type, ids);
      }
      ids.add(record.id);
    }
    // 备份为权威：一律写入。这里不再比较 updatedAt —— 该值由各设备本地时钟生成，
    // 跨设备比较在时钟有偏差时必然误判（手机慢几小时就会导致整包被跳过）。
    let writtenRecordsCount = 0;
    for (const record of records) {
      if (CLOUD_SYNC_METADATA_RECORD_TYPES.has(record.type)) continue;
      await this.put(record.type, record.payload, record.id, record.sortOrder);
      writtenRecordsCount += 1;
    }
    let removedRecordsCount = 0;
    for (const type of options?.syncTypes ?? []) {
      if (DEVICE_LOCAL_CONFIG_RECORD_TYPES.has(type)) continue;
      const keepIds = syncedIds.get(type) ?? new Set<string>();
      for (const local of await this.list(type as PrivateRecordType)) {
        if (!keepIds.has(local.id)) {
          await this.remove(type as PrivateRecordType, local.id);
          removedRecordsCount += 1;
        }
      }
    }
    // 各模块案例列表只在挂载时取数，恢复后不会自行重载（此前仅弹「已恢复」提示，
    // 界面仍是空列表，看起来像恢复失败）。统一在此广播变更事件，覆盖 S3/WebDAV/本地文件全部恢复入口。
    if (typeof window !== 'undefined') {
      for (const eventName of [BAZI_CASES_CHANGED_EVENT, QIMEN_CASES_CHANGED_EVENT, SANYUAN_CASES_CHANGED_EVENT]) {
        window.dispatchEvent(new CustomEvent(eventName));
      }
    }
    return { writtenRecordsCount, removedRecordsCount };
  },
};

/**
 * 拦截本地写入生成待同步变更（T05，实施方案 §4.3）。
 *
 * 合并语义：同一记录在待推送期间只保留最终状态——后一次写入覆盖前一次
 * 的内容与操作（删除后重建合并为 upsert），baseVersion 始终取自版本镜像
 * （镜像只在推送成功后更新）。若不合并，同一记录的多次本地写入会携带
 * 相同的过期 baseVersion，在服务端批量推送时集体 409。
 *
 * 恢复备份走默认入队（T00 结论：恢复结果也应同步到其他设备）。
 */
export async function enqueueSyncMutation(
  type: string,
  recordId: string,
  operation: 'upsert' | 'delete',
  payload: Record<string, unknown> | undefined,
): Promise<void> {
  if (!SYNCABLE_RECORD_TYPES.has(type)) return;
  const baseVersion = await localPrivateStore.getSyncVersion(type, recordId);
  const pending = await localPrivateStore.listOutbox();
  for (const entry of pending) {
    if (entry.type === type && entry.recordId === recordId) {
      await localPrivateStore.removeOutboxEntry(entry.mutationId);
    }
  }
  await localPrivateStore.enqueueOutbox({
    mutationId: createId(),
    type,
    recordId,
    operation,
    payload,
    baseVersion,
  });
}

function normalizeLegacyPayload(record: LegacyPrivateRecord) {
  const payload = sanitizePayload(record.payload);
  if (record.type === 'case_favorite' || record.type === 'case_progress') {
    const articleId = typeof payload.article_id === 'string' ? payload.article_id : record.id.split(':').at(-1);
    if (articleId) payload.id = articleId;
  }
  if (record.type === 'webdav_config' || record.type === 's3_config' || record.type === 'backup_method') payload.id = record.type;
  return payload;
}

function normalizeLegacyId(record: LegacyPrivateRecord) {
  if (record.type === 'webdav_config' || record.type === 's3_config' || record.type === 'backup_method') return record.type;
  if (record.type === 'case_favorite' || record.type === 'case_progress') {
    return typeof record.payload.article_id === 'string' ? record.payload.article_id : record.id.split(':').at(-1) ?? record.id;
  }
  return record.id;
}
