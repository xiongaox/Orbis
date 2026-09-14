import { localPrivateStore, type PrivateDataSnapshot } from './localPrivateStore';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import {
  assertBackupPath,
  createBackupFile,
  decodeXmlEntities,
  DEFAULT_AUTO_BACKUP_INTERVAL_MINUTES,
  fetchWithTimeout,
  isBackupFilename,
  isTauriRuntime,
  MAX_RETRIES,
  normalizeAutoBackupInterval,
  timestampFromFilename,
  wait,
  type RemoteBackupMeta,
} from './remoteBackupShared';

export interface WebDavConfig {
  endpoint: string;
  username: string;
  password: string;
  backupDirectory: string;
  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
}

export type WebDavBackup = RemoteBackupMeta;

const DEFAULT_BACKUP_DIRECTORY = 'orbis/backups';
const CONFIG_TYPE = 'webdav_config';
export const WEBDAV_CONFIG_CHANGE_EVENT = 'orbis-webdav-config-change';

const defaultConfig = (): WebDavConfig => ({
  endpoint: '',
  username: '',
  password: '',
  backupDirectory: DEFAULT_BACKUP_DIRECTORY,
  autoBackupEnabled: false,
  autoBackupIntervalMinutes: DEFAULT_AUTO_BACKUP_INTERVAL_MINUTES,
});

function normalizeConfig(config?: Partial<WebDavConfig> & { filePath?: unknown; autoBackupIntervalHours?: unknown }): WebDavConfig {
  const legacyFilePath = typeof config?.filePath === 'string' ? config.filePath.trim().replace(/^\/+/, '') : '';
  const legacyDirectory = legacyFilePath.includes('/') ? legacyFilePath.slice(0, legacyFilePath.lastIndexOf('/')) : '';
  return {
    ...defaultConfig(),
    ...config,
    backupDirectory: config?.backupDirectory?.trim().replace(/^\/+|\/+$/g, '') || legacyDirectory || DEFAULT_BACKUP_DIRECTORY,
    autoBackupEnabled: Boolean(config?.autoBackupEnabled),
    autoBackupIntervalMinutes: normalizeAutoBackupInterval(config),
  };
}

export const webDavBackupService = {
  async readConfig(): Promise<WebDavConfig> {
    const record = await localPrivateStore.get(CONFIG_TYPE, CONFIG_TYPE);
    return normalizeConfig(record?.payload as (Partial<WebDavConfig> & { filePath?: unknown; autoBackupIntervalHours?: unknown }) | undefined);
  },

  async saveConfig(config: WebDavConfig) {
    const normalized = normalizeConfig(config);
    await localPrivateStore.put(CONFIG_TYPE, normalized as unknown as Record<string, unknown>, CONFIG_TYPE);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(WEBDAV_CONFIG_CHANGE_EVENT));
  },

  async backup(config: WebDavConfig): Promise<{ snapshot: PrivateDataSnapshot; backup: WebDavBackup }> {
    const normalized = normalizeConfig(config);
    const snapshot = await localPrivateStore.snapshot();
    const backup = createBackupFile(normalized.backupDirectory);
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
    const path = assertBackupPath(normalized.backupDirectory, backupPath);
    const response = await requestWithRetry(normalized, 'GET', undefined, buildFileUrl(normalized, path));
    const snapshot = JSON.parse(response.body) as PrivateDataSnapshot;
    await localPrivateStore.restore(snapshot);
    return snapshot;
  },

  async deleteBackup(config: WebDavConfig, backupPath: string) {
    const normalized = normalizeConfig(config);
    const path = assertBackupPath(normalized.backupDirectory, backupPath);
    await requestWithRetry(normalized, 'DELETE', undefined, buildFileUrl(normalized, path), [404]);
  },

  async testConnection(config: WebDavConfig) {
    const normalized = normalizeConfig(config);
    await requestWithRetry(normalized, 'OPTIONS', undefined, buildEndpointUrl(normalized));
  },
};

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

function parseBackupList(xml: string, backupDirectory: string): WebDavBackup[] {
  const pathPrefix = `${backupDirectory}/`;
  const responses = [...xml.matchAll(/<[^>]*response[^>]*>([\s\S]*?)<\/[^>]*response>/gi)];
  return responses
    .map((match) => {
      const response = match[1];
      const href = response.match(/<[^>]*href[^>]*>([\s\S]*?)<\/[^>]*href>/i)?.[1];
      if (!href) return null;
      const sourcePath = decodeXmlEntities(href).replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '');
      const directoryIndex = sourcePath.indexOf(`${backupDirectory}/`);
      if (directoryIndex < 0) return null;
      const path = decodeURIComponent(sourcePath.slice(directoryIndex));
      const sizeText = response.match(/<[^>]*getcontentlength[^>]*>(\d+)<\/[^>]*getcontentlength>/i)?.[1];
      const modified = response.match(/<[^>]*getlastmodified[^>]*>([\s\S]*?)<\/[^>]*getlastmodified>/i)?.[1];
      return { path, size: sizeText ? Number(sizeText) : null, modifiedAt: modified ? decodeXmlEntities(modified).trim() : null };
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
    .filter((backup) => isBackupFilename(backup.filename))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
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
      if (attempt < MAX_RETRIES - 1) await wait(500 * 2 ** attempt);
    }
  }
  throw new Error(`WebDAV 操作失败：${lastError instanceof Error ? lastError.message : '网络不可用'}`);
}
