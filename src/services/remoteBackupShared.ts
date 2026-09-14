/**
 * 远程备份（WebDAV / S3 兼容存储）共享常量与工具。
 *
 * 两种备份方式共用同一套备份文件命名、路径校验与重试语义，
 * 私有配置分别存储在 localPrivateStore 的 webdav_config / s3_config 记录中。
 */

export interface RemoteBackupMeta {
  path: string;
  filename: string;
  createdAt: string;
  size: number | null;
}

const BACKUP_PREFIX = 'orbis_';
const LEGACY_BACKUP_PREFIX = 'private-data_';
const BACKUP_EXTENSION = '.json';

export const AUTO_BACKUP_INTERVAL_MINUTES = [1, 5, 15, 30, 60, 120, 360, 720, 1440] as const;
export const DEFAULT_AUTO_BACKUP_INTERVAL_MINUTES = 1440;
export const MAX_RETRIES = 3;

export function isBackupFilename(filename: string) {
  return filename.endsWith(BACKUP_EXTENSION)
    && (filename.startsWith(BACKUP_PREFIX) || filename.startsWith(LEGACY_BACKUP_PREFIX));
}

export function createBackupFile(directory: string): RemoteBackupMeta {
  const createdAt = new Date().toISOString();
  const match = createdAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (!match) throw new Error('无法生成备份文件名');
  const timestamp = `${match[1]}${match[2]}${match[3]}_${match[4]}${match[5]}${match[6]}_${match[7]}`;
  const filename = `${BACKUP_PREFIX}${timestamp}${BACKUP_EXTENSION}`;
  return { path: `${directory}/${filename}`, filename, createdAt, size: null };
}

export function normalizeAutoBackupInterval(config?: { autoBackupIntervalMinutes?: unknown; autoBackupIntervalHours?: unknown }) {
  const configuredMinutes = Number(config?.autoBackupIntervalMinutes);
  const legacyHours = Number(config?.autoBackupIntervalHours);
  if (AUTO_BACKUP_INTERVAL_MINUTES.includes(configuredMinutes as typeof AUTO_BACKUP_INTERVAL_MINUTES[number])) return configuredMinutes;
  if (AUTO_BACKUP_INTERVAL_MINUTES.includes((legacyHours * 60) as typeof AUTO_BACKUP_INTERVAL_MINUTES[number])) return legacyHours * 60;
  return DEFAULT_AUTO_BACKUP_INTERVAL_MINUTES;
}

export function assertBackupPath(directory: string, backupPath: string) {
  const path = backupPath.trim().replace(/^\/+/, '');
  if (!path.startsWith(`${directory}/`) || !isBackupFilename(path.split('/').at(-1) ?? '')) {
    throw new Error('请选择当前备份目录中的有效备份版本');
  }
  return path;
}

/** 解析备份文件名中的 UTC 时间（兼容新旧命名格式），返回无 Z 后缀的 ISO 串。 */
export function timestampFromFilename(filename: string) {
  const base = filename.slice(0, -BACKUP_EXTENSION.length);
  if (base.startsWith(BACKUP_PREFIX)) {
    const raw = base.slice(BACKUP_PREFIX.length);
    const compact = raw.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_(\d{3})$/);
    return compact ? `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}.${compact[7]}` : raw;
  }
  const raw = base.slice(LEGACY_BACKUP_PREFIX.length);
  const milliseconds = raw.match(/^(.*T\d{2})_(\d{2})_(\d{2})_(\d{3})$/);
  if (milliseconds) return `${milliseconds[1]}:${milliseconds[2]}:${milliseconds[3]}.${milliseconds[4]}`;
  const seconds = raw.match(/^(.*T\d{2})_(\d{2})_(\d{2})$/);
  return seconds ? `${seconds[1]}:${seconds[2]}:${seconds[3]}` : raw;
}

export function decodeXmlEntities(value: string) {
  return value.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
}

export const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}
