/**
 * 本地私有数据存储层。
 *
 * Tauri 运行时使用 SQLite；浏览器开发/预览环境使用 IndexedDB，保证同一套
 * service API 可以离线工作。所有记录都按 userId 隔离，并保留 JSON payload
 * 以便后续迁移时不破坏现有 hook 契约。
 */
import Database from '@tauri-apps/plugin-sql';

export type PrivateRecordType = 'bazi_case' | 'qimen_case' | 'profile' | 'case_favorite' | 'case_progress';

export interface PrivateRecord {
  id: string;
  userId: string;
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

const DB_NAME = 'orbis-private.db';
const IDB_NAME = 'orbis-private';
const IDB_STORE = 'records';
const SCHEMA_VERSION = 1;

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
          user_id TEXT NOT NULL,
          record_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sort_order INTEGER
        )
      `);
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
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        store.createIndex('scope', ['userId', 'type'], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('打开本地数据库失败'));
  });
}

const memoryRecords = new Map<string, PrivateRecord>();

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

function fromRow(row: { id: string; user_id: string; record_type: PrivateRecordType; payload: string; created_at: string; updated_at: string; sort_order?: number }): PrivateRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.record_type,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order ?? undefined,
  };
}

export const localPrivateStore = {
  async list(userId: string, type: PrivateRecordType): Promise<PrivateRecord[]> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      const rows = await db.select<Array<{ id: string; user_id: string; record_type: PrivateRecordType; payload: string; created_at: string; updated_at: string; sort_order?: number }>>(
        'SELECT * FROM private_records WHERE user_id = $1 AND record_type = $2 ORDER BY COALESCE(sort_order, 2147483647), updated_at DESC',
        [userId, type],
      );
      return rows.map(fromRow);
    }
    if (typeof indexedDB === 'undefined') {
      return [...memoryRecords.values()].filter((record) => record.userId === userId && record.type === type);
    }
    const records = await withIndexedStore<PrivateRecord[]>('readonly', (store) => store.index('scope').getAll([userId, type]));
    return records.sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER));
  },

  async get(userId: string, type: PrivateRecordType, id: string): Promise<PrivateRecord | null> {
    const records = await this.list(userId, type);
    return records.find((record) => record.id === id) ?? null;
  },

  async put(userId: string, type: PrivateRecordType, payload: Record<string, unknown>, id = String(payload.id ?? createId()), sortOrder?: number): Promise<PrivateRecord> {
    const previous = await this.get(userId, type, id);
    const record: PrivateRecord = {
      id,
      userId,
      type,
      payload: { ...payload, id },
      createdAt: previous?.createdAt ?? String(payload.created_at ?? now()),
      updatedAt: now(),
      sortOrder: sortOrder ?? (typeof payload.sort_order === 'number' ? payload.sort_order : previous?.sortOrder),
    };
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute(
        `INSERT INTO private_records(id, user_id, record_type, payload, created_at, updated_at, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at, sort_order = excluded.sort_order`,
        [record.id, record.userId, record.type, JSON.stringify(record.payload), record.createdAt, record.updatedAt, record.sortOrder ?? null],
      );
      return record;
    }
    if (typeof indexedDB === 'undefined') {
      memoryRecords.set(record.id, record);
      return record;
    }
    await withIndexedStore('readwrite', (store) => store.put(record));
    return record;
  },

  async remove(userId: string, type: PrivateRecordType, id: string) {
    const record = await this.get(userId, type, id);
    if (!record) return;
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      await db.execute('DELETE FROM private_records WHERE id = $1 AND user_id = $2 AND record_type = $3', [id, userId, type]);
      return;
    }
    if (typeof indexedDB === 'undefined') {
      memoryRecords.delete(id);
      return;
    }
    await withIndexedStore('readwrite', (store) => store.delete(id));
  },

  async snapshot(): Promise<PrivateDataSnapshot> {
    if (isTauriRuntime()) {
      const db = await getTauriDatabase();
      const rows = await db.select<Array<{ id: string; user_id: string; record_type: PrivateRecordType; payload: string; created_at: string; updated_at: string; sort_order?: number }>>('SELECT * FROM private_records');
      return { schemaVersion: SCHEMA_VERSION, exportedAt: now(), records: rows.map(fromRow) };
    }
    if (typeof indexedDB === 'undefined') return { schemaVersion: SCHEMA_VERSION, exportedAt: now(), records: [...memoryRecords.values()] };
    const db = await openIndexedDb();
    const records = await withIndexedStore<PrivateRecord[]>('readonly', (store) => store.getAll());
    db.close();
    return { schemaVersion: SCHEMA_VERSION, exportedAt: now(), records };
  },

  async restore(snapshot: PrivateDataSnapshot) {
    if (snapshot.schemaVersion !== SCHEMA_VERSION || !Array.isArray(snapshot.records)) throw new Error('备份文件版本不受支持');
    for (const record of snapshot.records) await this.put(record.userId, record.type, record.payload, record.id, record.sortOrder);
  },
};

export async function getPrivateUserId() {
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? 'anonymous';
  } catch {
    return 'anonymous';
  }
}
