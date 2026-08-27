import { getPrivateUserId, localPrivateStore, type PrivateDataSnapshot } from './localPrivateStore';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export interface WebDavConfig {
  endpoint: string;
  username: string;
  password: string;
  backupDirectory: string;
  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
}

export interface WebDavBackup {
  path: string;
  filename: string;
  createdAt: string;
  size: number | null;
}

const DEFAULT_BACKUP_DIRECTORY = 'orbis/backups';
export const AUTO_BACKUP_INTERVAL_MINUTES = [1, 5, 15, 30, 60, 120, 360, 720, 1440] as const;
const DEFAULT_AUTO_BACKUP_INTERVAL_MINUTES = 1440;
const MAX_RETRIES = 3;
const CONFIG_TYPE = 'webdav_config';
const BACKUP_PREFIX = 'private-data_';
const CONFIG_CHANGE_EVENT = 'orbis-webdav-config-change';

const defaultConfig = (): WebDavConfig => ({
  endpoint: '',
  username: '',
  password: '',
  backupDirectory: DEFAULT_BACKUP_DIRECTORY,
  autoBackupEnabled: false,
  autoBackupIntervalMinutes: DEFAULT_AUTO_BACKUP_INTERVAL_MINUTES,
});

function getConfigId(userId: string) {
  return `${userId}:${CONFIG_TYPE}`;
}

function normalizeConfig(config?: Partial<WebDavConfig> & { filePath?: unknown; autoBackupIntervalHours?: unknown }): WebDavConfig {
  const legacyFilePath = typeof config?.filePath === 'string' ? config.filePath.trim().replace(/^\/+/, '') : '';
  const legacyDirectory = legacyFilePath.includes('/') ? legacyFilePath.slice(0, legacyFilePath.lastIndexOf('/')) : '';
  const configuredMinutes = Number(config?.autoBackupIntervalMinutes);
  const legacyHours = Number(config?.autoBackupIntervalHours);
  const interval = AUTO_BACKUP_INTERVAL_MINUTES.includes(configuredMinutes as typeof AUTO_BACKUP_INTERVAL_MINUTES[number])
    ? configuredMinutes
    : AUTO_BACKUP_INTERVAL_MINUTES.includes((legacyHours * 60) as typeof AUTO_BACKUP_INTERVAL_MINUTES[number])
      ? legacyHours * 60
      : DEFAULT_AUTO_BACKUP_INTERVAL_MINUTES;
  return {
    ...defaultConfig(),
    ...config,
    backupDirectory: config?.backupDirectory?.trim().replace(/^\/+|\/+$/g, '') || legacyDirectory || DEFAULT_BACKUP_DIRECTORY,
    autoBackupEnabled: Boolean(config?.autoBackupEnabled),
    autoBackupIntervalMinutes: interval,
  };
}

export const webDavBackupService = {
  async readConfig(): Promise<WebDavConfig> {
    const userId = await getPrivateUserId();
    const record = await localPrivateStore.get(userId, CONFIG_TYPE, getConfigId(userId));
    return normalizeConfig(record?.payload as (Partial<WebDavConfig> & { filePath?: unknown; autoBackupIntervalHours?: unknown }) | undefined);
  },

  async saveConfig(config: WebDavConfig) {
    const userId = await getPrivateUserId();
    const normalized = normalizeConfig(config);
    await localPrivateStore.put(userId, CONFIG_TYPE, normalized as unknown as Record<string, unknown>, getConfigId(userId));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONFIG_CHANGE_EVENT));
  },

  async backup(config: WebDavConfig): Promise<{ snapshot: PrivateDataSnapshot; backup: WebDavBackup }> {
    const normalized = normalizeConfig(config);
    const snapshot = await localPrivateStore.snapshot();
    const backup = createBackup(normalized);
    await ensureParentCollections(normalized);
    await requestWithRetry(normalized, 'PUT', JSON.stringify(snapshot), buildFileUrl(normalized, backup.path));
    return { snapshot, backup };
  },

  async listBackups(config: WebDavConfig): Promise<WebDavBackup[]> {
    const normalized = normalizeConfig(config);
    const response = await requestWithRetry(normalized, 'PROPFIND', undefined, buildDirectoryUrl(normalized), [207, 404], { Depth: '1' });
    if (response.status === 404) return [];
    return parseBackupList(response.body, normalized.backupDirectory);
  },

  async restore(config: WebDavConfig, backupPath: string) {
    const normalized = normalizeConfig(config);
    const path = assertBackupPath(normalized, backupPath);
    const response = await requestWithRetry(normalized, 'GET', undefined, buildFileUrl(normalized, path));
    const snapshot = JSON.parse(response.body) as PrivateDataSnapshot;
    await localPrivateStore.restore(snapshot);
    return snapshot;
  },

  async deleteBackup(config: WebDavConfig, backupPath: string) {
    const normalized = normalizeConfig(config);
    const path = assertBackupPath(normalized, backupPath);
    await requestWithRetry(normalized, 'DELETE', undefined, buildFileUrl(normalized, path), [404]);
  },

  async testConnection(config: WebDavConfig) {
    const normalized = normalizeConfig(config);
    await requestWithRetry(normalized, 'OPTIONS', undefined, buildEndpointUrl(normalized));
  },
};

export function startWebDavAutoBackup() {
  let timer: number | undefined;
  let stopped = false;

  const clearTimer = () => {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
  const run = async () => {
    const config = await webDavBackupService.readConfig();
    if (config.autoBackupEnabled && config.endpoint) await webDavBackupService.backup(config);
  };
  const schedule = () => {
    clearTimer();
    void webDavBackupService.readConfig().then((config) => {
      if (stopped || !config.autoBackupEnabled || !config.endpoint) return;
      timer = window.setInterval(() => {
        void run().catch((error: unknown) => console.warn('WebDAV 自动备份失败', error));
      }, config.autoBackupIntervalMinutes * 60 * 1_000);
    }).catch((error: unknown) => console.warn('读取 WebDAV 自动备份配置失败', error));
  };

  window.addEventListener(CONFIG_CHANGE_EVENT, schedule);
  schedule();
  return () => {
    stopped = true;
    clearTimer();
    window.removeEventListener(CONFIG_CHANGE_EVENT, schedule);
  };
}

function buildEndpointUrl(config: WebDavConfig) {
  if (!config.endpoint.trim()) throw new Error('请填写 WebDAV 地址');
  return config.endpoint.trim().replace(/\/+$/, '');
}

function buildDirectoryUrl(config: WebDavConfig) {
  const endpoint = buildEndpointUrl(config);
  return `${endpoint}/${config.backupDirectory.split('/').map(encodeURIComponent).join('/')}`;
}

function buildFileUrl(config: WebDavConfig, filePath: string) {
  const endpoint = buildEndpointUrl(config);
  return `${endpoint}/${filePath.split('/').map(encodeURIComponent).join('/')}`;
}

function createBackup(config: WebDavConfig): WebDavBackup {
  const createdAt = new Date().toISOString();
  const timestamp = createdAt.replace(/Z$/, '').replace(/[:.]/g, '_');
  const filename = `${BACKUP_PREFIX}${timestamp}.json`;
  return { path: `${config.backupDirectory}/${filename}`, filename, createdAt, size: null };
}

function parseBackupList(xml: string, backupDirectory: string): WebDavBackup[] {
  const pathPrefix = `${backupDirectory}/`;
  const responses = [...xml.matchAll(/<[^>]*response[^>]*>([\s\S]*?)<\/[^>]*response>/gi)];
  return responses
    .map((match) => {
      const response = match[1];
      const href = response.match(/<[^>]*href[^>]*>([\s\S]*?)<\/[^>]*href>/i)?.[1];
      if (!href) return null;
      const sourcePath = decodeXml(href).replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '');
      const directoryIndex = sourcePath.indexOf(`${backupDirectory}/`);
      if (directoryIndex < 0) return null;
      const path = decodeURIComponent(sourcePath.slice(directoryIndex));
      const sizeText = response.match(/<[^>]*getcontentlength[^>]*>(\d+)<\/[^>]*getcontentlength>/i)?.[1];
      const modified = response.match(/<[^>]*getlastmodified[^>]*>([\s\S]*?)<\/[^>]*getlastmodified>/i)?.[1];
      return { path, size: sizeText ? Number(sizeText) : null, modifiedAt: modified ? decodeXml(modified).trim() : null };
    })
    .filter((entry): entry is { path: string; size: number | null; modifiedAt: string | null } => entry !== null)
    .filter((entry) => entry.path.startsWith(pathPrefix) && entry.path.slice(pathPrefix.length).includes('/') === false)
    .map((entry) => {
      const filename = entry.path.slice(pathPrefix.length);
      const modifiedDate = entry.modifiedAt ? new Date(entry.modifiedAt) : null;
      return {
        path: entry.path,
        filename,
        createdAt: modifiedDate && !Number.isNaN(modifiedDate.getTime()) ? modifiedDate.toISOString() : timestampFromFilename(filename),
        size: entry.size,
      };
    })
    .filter((backup) => backup.filename.startsWith(BACKUP_PREFIX) && backup.filename.endsWith('.json'))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function assertBackupPath(config: WebDavConfig, backupPath: string) {
  const path = backupPath.trim().replace(/^\/+/, '');
  if (!path.startsWith(`${config.backupDirectory}/`) || !path.split('/').at(-1)?.startsWith(BACKUP_PREFIX)) {
    throw new Error('请选择当前备份目录中的有效备份版本');
  }
  return path;
}

function timestampFromFilename(filename: string) {
  const rawTimestamp = filename.slice(BACKUP_PREFIX.length, -'.json'.length);
  const milliseconds = rawTimestamp.match(/^(.*T\d{2})_(\d{2})_(\d{2})_(\d{3})$/);
  if (milliseconds) return `${milliseconds[1]}:${milliseconds[2]}:${milliseconds[3]}.${milliseconds[4]}`;
  const seconds = rawTimestamp.match(/^(.*T\d{2})_(\d{2})_(\d{2})$/);
  return seconds ? `${seconds[1]}:${seconds[2]}:${seconds[3]}` : rawTimestamp;
}

function decodeXml(value: string) {
  return value.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

async function ensureParentCollections(config: WebDavConfig) {
  const endpoint = buildEndpointUrl(config);
  const completed: string[] = [];
  for (const directory of config.backupDirectory.split('/')) {
    completed.push(encodeURIComponent(directory));
    await requestWithRetry(config, 'MKCOL', undefined, `${endpoint}/${completed.join('/')}`, [405]);
  }
}

async function requestWithRetry(
  config: WebDavConfig,
  method: 'GET' | 'PUT' | 'OPTIONS' | 'MKCOL' | 'PROPFIND' | 'DELETE',
  body?: string,
  url = buildEndpointUrl(config),
  acceptedStatuses: number[] = [],
  extraHeaders: Record<string, string> = {},
) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const headers: Record<string, string> = { ...extraHeaders };
      if (config.username || config.password) headers.Authorization = `Basic ${btoa(`${config.username}:${config.password}`)}`;
      if (body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8';
      const request = isTauriRuntime()
        ? tauriFetch(url, { method, headers, body })
        : fetchWithTimeout(url, { method, headers, body }, 15_000);
      const response = await request;
      if (!response.ok && !acceptedStatuses.includes(response.status)) throw new Error(`WebDAV ${method} 失败（HTTP ${response.status}）`);
      return { status: response.status, body: method === 'GET' || method === 'PROPFIND' ? await response.text() : '' };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) await new Promise((resolve) => window.setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw new Error(`WebDAV 操作失败：${lastError instanceof Error ? lastError.message : '网络不可用'}`);
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}
