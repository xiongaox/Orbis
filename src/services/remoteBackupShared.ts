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
export const BACKUP_EXTENSION = '.zip';
export const LEGACY_BACKUP_EXTENSION = '.json';

export const AUTO_BACKUP_INTERVAL_MINUTES = [1, 5, 15, 30, 60, 120, 360, 720, 1440] as const;
export const DEFAULT_AUTO_BACKUP_INTERVAL_MINUTES = 1440;
export const MAX_RETRIES = 3;

export function isBackupFilename(filename: string) {
  const hasValidExt = filename.endsWith(BACKUP_EXTENSION) || filename.endsWith(LEGACY_BACKUP_EXTENSION);
  return hasValidExt
    && (filename.startsWith(BACKUP_PREFIX) || filename.startsWith(LEGACY_BACKUP_PREFIX));
}

export function createBackupFile(directory: string, platform: BackupPlatform = detectBackupPlatform()): RemoteBackupMeta {
  const createdAt = new Date().toISOString();
  const match = createdAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (!match) throw new Error('无法生成备份文件名');
  const timestamp = `${match[1]}${match[2]}${match[3]}_${match[4]}${match[5]}${match[6]}_${match[7]}`;
  // 端标识放在时间戳之后：备份列表按名称排序时同设备仍按时间成组，
  // 且旧的 orbis_<时间戳>.zip 命名不带后缀，解析需同时兼容两种。
  const filename = `${BACKUP_PREFIX}${timestamp}_${PLATFORM_FILE_TAGS[platform]}${BACKUP_EXTENSION}`;
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

/** 解析备份文件名中的 UTC 时间（兼容新旧命名格式与 zip/json 扩展名），返回无 Z 后缀的 ISO 串。 */export function timestampFromFilename(filename: string) {
  const extMatch = filename.match(/\.(zip|json)$/i);
  const base = extMatch ? filename.slice(0, -extMatch[0].length) : filename;
  if (base.startsWith(BACKUP_PREFIX)) {
    const raw = base.slice(BACKUP_PREFIX.length);
    // 时间戳后可跟端后缀（旧备份无此后缀），两种都要能解析出时间
    const compact = raw.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_(\d{3})(?:_([a-z]+))?$/);
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

/**
 * 备份来源端。多端共用一个备份目录时，靠它在文件名与 manifest 里区分来源，
 * 避免把别的设备的备份误恢复到本机（各端记录 id 不同，恢复是合并而非覆盖，会越并越多）。
 */
export type BackupPlatform = 'windows' | 'macos' | 'android' | 'ios' | 'linux' | 'web';

/** 文件名后缀，保持短小；web 端也带后缀以区分「网页版导出的备份」 */
export const PLATFORM_FILE_TAGS: Record<BackupPlatform, string> = {
  windows: 'win', macos: 'mac', android: 'android', ios: 'ios', linux: 'linux', web: 'web',
};

export const PLATFORM_LABELS: Record<BackupPlatform, string> = {
  windows: 'Windows', macos: 'macOS', android: '安卓', ios: 'iOS', linux: 'Linux', web: '网页版',
};

export function isBackupPlatform(value: unknown): value is BackupPlatform {
  return typeof value === 'string' && value in PLATFORM_FILE_TAGS;
}

/**
 * 识别当前运行的端。
 * 不使用 navigator.platform（已废弃且值不稳定），UA 特征足够区分：
 * 桌面应用在 Windows 走 WebView2（UA 含 Windows NT）、macOS 走 WKWebView（含 Macintosh）；
 * 网页端必须先于桌面 UA 判断排除，否则 mac 上打开网页版会被认成桌面 mac。
 */
export function detectBackupPlatform(): BackupPlatform {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (!isTauriRuntime()) return 'web';
  if (/Windows NT/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
  if (/Linux/i.test(ua)) return 'linux';
  return 'web';
}

/** 从备份文件名解析来源端；旧命名（无端后缀）返回 null，由 manifest 兜底。 */
export function platformFromFilename(filename: string): BackupPlatform | null {
  const match = filename.match(/^orbis_\d{8}_\d{6}_\d{3}_([a-z]+)\.(?:zip|json)$/i);
  if (!match) return null;
  const tag = match[1].toLowerCase();
  const entry = (Object.entries(PLATFORM_FILE_TAGS) as Array<[BackupPlatform, string]>).find(([, value]) => value === tag);
  return entry ? entry[0] : null;
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
