/**
 * 单工作区本地私有数据存储层。
 *
 * Tauri 使用 SQLite，浏览器使用 IndexedDB。底层保留旧 user_id 列仅用于
 * 兼容已有数据；公开记录、业务 API 和备份格式均不再包含账号信息。
 */
import Database from '@tauri-apps/plugin-sql';
import { BAZI_CASES_CHANGED_EVENT, QIMEN_CASES_CHANGED_EVENT, SANYUAN_CASES_CHANGED_EVENT } from '../data/caseConstants';

export type PrivateRecordType = 'bazi_case' | 'qimen_case' | 'sanyuan_case' | 'profile' | 'ai_model_service' | 'case_favorite' | 'case_progress' | 'webdav_config' | 's3_config' | 'backup_method';

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

type LegacyPrivateRecord = PrivateRecord & { userId?: string; user_id?: string };
type LegacySnapshot = { schemaVersion: number; exportedAt: string; records: LegacyPrivateRecord[]; auth?: unknown };

const DB_NAME = 'orbis-private.db';
const IDB_NAME = 'orbis-private';
const IDB_STORE = 'records';
const SCHEMA_VERSION = 2;
const DEFAULT_WORKSPACE = 'default';

type TauriDatabase = Awaited<ReturnType<typeof Database.load>>;
let tauriDatabasePromise: Promise<TauriDatabase> | null = null;

const isTauriRuntime = () => typeof window !== 'undefined' && Boolean(
  (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
);

const now = () => new Date().toISOString();

function createId() {
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
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('打开本地数据库失败'));
  });
}

const memoryRecords = new Map<string, PrivateRecord>();

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
  const records = await withIndexedStore<StoredRecord[]>('readonly', (store) => store.getAll());
  return records.map(normalizeRecord).sort((a, b) => a.type.localeCompare(b.type)
    || (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER));
}

async function withIndexedStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  if (typeof indexedDB === 'undefined') throw new Error('当前环境不支持 IndexedDB');
  const db = await openIndexedDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(IDB_STORE, mode);
    const request = action(transaction.objectStore(IDB_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('本地数据库操作失败'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error ?? new Error('本地数据库事务失败'));
  });
}

async function migrateIndexedRecords() {
  if (typeof indexedDB === 'undefined') return;
  const records = await withIndexedStore<StoredRecord[]>('readonly', (store) => store.getAll());
  const needsMigration = records.filter((record) => record.userId !== DEFAULT_WORKSPACE || 'user_id' in record.payload || 'userId' in record.payload);
  if (!needsMigration.length) return;
  await withIndexedStore('readwrite', (store) => {
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
    const records = await withIndexedStore<StoredRecord[]>('readonly', (store) => store.getAll());
    return records.filter((record) => record.type === type).map(normalizeRecord).sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER));
  },

  async get(type: PrivateRecordType, id: string): Promise<PrivateRecord | null> {
    const records = await this.list(type);
    return records.find((record) => record.id === id) ?? null;
  },

  async put(type: PrivateRecordType, payload: Record<string, unknown>, id = String(payload.id ?? createId()), sortOrder?: number): Promise<PrivateRecord> {
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
      return record;
    }
    if (typeof indexedDB === 'undefined') {
      memoryRecords.set(record.id, record);
      return record;
    }
    await withIndexedStore('readwrite', (store) => store.put({ ...record, userId: DEFAULT_WORKSPACE }));
    return record;
  },

  async remove(type: PrivateRecordType, id: string) {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute('DELETE FROM private_records WHERE id = $1 AND record_type = $2', [id, type]);
      return;
    }
    if (typeof indexedDB === 'undefined') {
      memoryRecords.delete(id);
      return;
    }
    await withIndexedStore('readwrite', (store) => store.delete(id));
  },

  async clear(type: PrivateRecordType) {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute('DELETE FROM private_records WHERE record_type = $1', [type]);
      return;
    }
    if (typeof indexedDB === 'undefined') {
      for (const [id, record] of memoryRecords) if (record.type === type) memoryRecords.delete(id);
      return;
    }
    const records = await withIndexedStore<StoredRecord[]>('readonly', (store) => store.getAll());
    await withIndexedStore('readwrite', (store) => {
      for (const record of records) if (record.type === type) store.delete(record.id);
      return store.getAll();
    });
  },

  async snapshot(): Promise<PrivateDataSnapshot> {
    // 不按手写类型清单逐类查询：新增术数（新 case 类型）时若漏同步清单，
    // 该术数案例会静默不进备份包；直接列全部记录可彻底避免这类遗漏。
    const records = await listAllRecords();
    return { schemaVersion: SCHEMA_VERSION, exportedAt: now(), records };
  },

  async restore(snapshot: PrivateDataSnapshot | LegacySnapshot) {
    if (!snapshot || !Array.isArray(snapshot.records) || ![1, SCHEMA_VERSION].includes(snapshot.schemaVersion)) throw new Error('备份文件版本不受支持');
    const records = snapshot.records.map((record) => normalizeRecord({
      ...record,
      id: normalizeLegacyId(record),
      payload: normalizeLegacyPayload(record),
    }));
    for (const record of records) {
      const existing = await this.get(record.type, record.id);
      if (!existing || existing.updatedAt <= record.updatedAt) await this.put(record.type, record.payload, record.id, record.sortOrder);
    }
    // 各模块案例列表只在挂载时取数，恢复后不会自行重载（此前仅弹「已恢复」提示，
    // 界面仍是空列表，看起来像恢复失败）。统一在此广播变更事件，覆盖 S3/WebDAV/本地文件全部恢复入口。
    if (typeof window !== 'undefined') {
      for (const eventName of [BAZI_CASES_CHANGED_EVENT, QIMEN_CASES_CHANGED_EVENT, SANYUAN_CASES_CHANGED_EVENT]) {
        window.dispatchEvent(new CustomEvent(eventName));
      }
    }
  },
};

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
