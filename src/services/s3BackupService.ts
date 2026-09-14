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
import { EMPTY_PAYLOAD_SHA256, formatAmzDate, signSigV4 } from './s3SigV4';

export interface S3Config {
  /** S3 兼容服务地址，如 https://s3.us-east-1.amazonaws.com 或 MinIO/R2/OSS 等自建地址。 */
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** 使用 STS 临时凭证时填写。 */
  sessionToken: string;
  /** 桶内备份前缀，对应 WebDAV 的备份文件夹。 */
  backupPrefix: string;
  /** 路径风格（{endpoint}/{bucket}/{key}）；MinIO 等仅支持路径风格的自建服务开启，主流云厂商默认使用虚拟主机风格。 */
  pathStyle: boolean;
  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
}

export type S3Backup = RemoteBackupMeta;

const DEFAULT_BACKUP_PREFIX = 'orbis/backups';
const DEFAULT_REGION = 'us-east-1';
const CONFIG_TYPE = 's3_config';
export const S3_CONFIG_CHANGE_EVENT = 'orbis-s3-config-change';

const defaultConfig = (): S3Config => ({
  endpoint: '',
  region: DEFAULT_REGION,
  bucket: '',
  accessKeyId: '',
  secretAccessKey: '',
  sessionToken: '',
  backupPrefix: DEFAULT_BACKUP_PREFIX,
  pathStyle: false,
  autoBackupEnabled: false,
  autoBackupIntervalMinutes: DEFAULT_AUTO_BACKUP_INTERVAL_MINUTES,
});

function normalizeConfig(config?: Partial<S3Config>): S3Config {
  return {
    ...defaultConfig(),
    ...config,
    endpoint: config?.endpoint?.trim() ?? '',
    region: config?.region?.trim() || DEFAULT_REGION,
    bucket: config?.bucket?.trim() ?? '',
    accessKeyId: config?.accessKeyId?.trim() ?? '',
    secretAccessKey: config?.secretAccessKey ?? '',
    sessionToken: config?.sessionToken?.trim() ?? '',
    backupPrefix: config?.backupPrefix?.trim().replace(/^\/+|\/+$/g, '') || DEFAULT_BACKUP_PREFIX,
    pathStyle: Boolean(config?.pathStyle),
    autoBackupEnabled: Boolean(config?.autoBackupEnabled),
    autoBackupIntervalMinutes: normalizeAutoBackupInterval(config),
  };
}

function assertRemoteConfig(config: S3Config) {
  if (!config.endpoint) throw new Error('请填写 S3 服务地址');
  if (!config.bucket) throw new Error('请填写 Bucket 名称');
  if (!config.accessKeyId) throw new Error('请填写 Access Key ID');
  if (!config.secretAccessKey) throw new Error('请填写 Secret Access Key');
}

function buildEndpointUrl(config: S3Config) {
  const endpoint = config.endpoint.trim().replace(/\/+$/, '');
  if (!endpoint) throw new Error('请填写 S3 服务地址');
  return endpoint;
}

/** 解析 endpoint，返回 `scheme://[bucket.]host[/path]` 形式的请求基础地址。 */
function buildBaseAddress(config: S3Config) {
  if (!config.bucket) throw new Error('请填写 Bucket 名称');
  const parsed = new URL(buildEndpointUrl(config));
  if (config.pathStyle) {
    const basePath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${basePath}`;
  }
  return `${parsed.protocol}//${config.bucket}.${parsed.host}`;
}

/** 路径风格为 `/{bucket}/{key}`；虚拟主机风格为 `/{key}`，各段按 RFC3986 编码。 */
function buildObjectPath(config: S3Config, key: string) {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return config.pathStyle ? `/${encodeURIComponent(config.bucket)}/${encodedKey}` : `/${encodedKey}`;
}

function buildBucketPath(config: S3Config) {
  return config.pathStyle ? `/${encodeURIComponent(config.bucket)}` : '/';
}

/** RFC3986 编码并按参数名排序的查询串；发送串与 SigV4 规范串保持一致。 */
function buildCanonicalQuery(params: Array<[string, string]>) {
  return params
    .map(([key, value]) => [encodeURIComponent(key), encodeURIComponent(value)] as const)
    .sort(([leftKey], [rightKey]) => (leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

interface S3RequestOptions {
  method: 'GET' | 'PUT' | 'DELETE';
  path: string;
  query?: string;
  body?: string;
  readBody: boolean;
  acceptedStatuses?: number[];
}

interface S3Response {
  status: number;
  body: string;
}

async function s3Request(config: S3Config, options: S3RequestOptions): Promise<S3Response> {
  assertRemoteConfig(config);
  const baseAddress = buildBaseAddress(config);
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const url = new URL(`${baseAddress}${options.path}${options.query ? `?${options.query}` : ''}`);
      const amzDate = formatAmzDate(new Date());
      const payloadHash = options.body === undefined ? EMPTY_PAYLOAD_SHA256 : await sha256Hex(options.body);
      const signedHeaders: Record<string, string> = {
        host: url.host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      };
      if (config.sessionToken) signedHeaders['x-amz-security-token'] = config.sessionToken;
      if (options.body !== undefined) signedHeaders['content-type'] = 'application/json; charset=utf-8';
      const { authorization } = await signSigV4({
        method: options.method,
        canonicalUri: url.pathname,
        canonicalQuery: options.query ?? '',
        headers: signedHeaders,
        payloadHash,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        amzDate,
      });
      // Host 属于浏览器受限请求头，不随请求发送；服务端从请求本身读取。
      const { host: _host, ...requestHeaders } = signedHeaders;
      void _host;
      requestHeaders.Authorization = authorization;
      const request = isTauriRuntime()
        ? tauriFetch(url.toString(), { method: options.method, headers: requestHeaders, body: options.body })
        : fetchWithTimeout(url.toString(), { method: options.method, headers: requestHeaders, body: options.body }, 15_000);
      const response = await request;
      if (!response.ok && !(options.acceptedStatuses ?? []).includes(response.status)) {
        throw new Error(`S3 ${options.method} 失败（HTTP ${response.status}）${await describeServerError(response)}`);
      }
      return { status: response.status, body: options.readBody ? await response.text() : '' };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) await wait(500 * 2 ** attempt);
    }
  }
  throw new Error(`S3 操作失败：${lastError instanceof Error ? lastError.message : '网络不可用'}`);
}

/** 提取服务端错误响应中的错误码与描述，帮助定位 403（权限/签名）等具体原因。 */
async function describeServerError(response: { text: () => Promise<string> }) {
  try {
    const body = await response.text();
    const code = body.match(/<Code>([\s\S]*?)<\/Code>/i)?.[1];
    const message = body.match(/<Message>([\s\S]*?)<\/Message>/i)?.[1];
    if (!code && !message) return '';
    const parts = [code ? decodeXmlEntities(code) : '', message ? decodeXmlEntities(message) : ''].filter(Boolean);
    return `：${parts.join('，')}`;
  } catch {
    return '';
  }
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseBackupList(xml: string, prefix: string): S3Backup[] {
  const contents = [...xml.matchAll(/<[^>]*Contents[^>]*>([\s\S]*?)<\/[^>]*Contents>/gi)];
  return contents
    .map((match) => {
      const entry = match[1];
      const key = entry.match(/<[^>]*Key[^>]*>([\s\S]*?)<\/[^>]*Key>/i)?.[1];
      if (!key) return null;
      const sizeText = entry.match(/<[^>]*Size[^>]*>(\d+)<\/[^>]*Size>/i)?.[1];
      const modified = entry.match(/<[^>]*LastModified[^>]*>([\s\S]*?)<\/[^>]*LastModified>/i)?.[1];
      return { path: decodeXmlEntities(key), size: sizeText ? Number(sizeText) : null, modifiedAt: modified ? decodeXmlEntities(modified).trim() : null };
    })
    .filter((entry): entry is { path: string; size: number | null; modifiedAt: string | null } => entry !== null)
    .filter((entry) => entry.path.startsWith(prefix) && entry.path.slice(prefix.length).includes('/') === false)
    .map((entry) => {
      const filename = entry.path.slice(prefix.length);
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

export const s3BackupService = {
  async readConfig(): Promise<S3Config> {
    const record = await localPrivateStore.get(CONFIG_TYPE, CONFIG_TYPE);
    return normalizeConfig(record?.payload as Partial<S3Config> | undefined);
  },

  async saveConfig(config: S3Config) {
    const normalized = normalizeConfig(config);
    await localPrivateStore.put(CONFIG_TYPE, normalized as unknown as Record<string, unknown>, CONFIG_TYPE);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(S3_CONFIG_CHANGE_EVENT));
  },

  async backup(config: S3Config): Promise<{ snapshot: PrivateDataSnapshot; backup: S3Backup }> {
    const normalized = normalizeConfig(config);
    assertRemoteConfig(normalized);
    const snapshot = await localPrivateStore.snapshot();
    const backup = createBackupFile(normalized.backupPrefix);
    await s3Request(normalized, {
      method: 'PUT',
      path: buildObjectPath(normalized, backup.path),
      body: JSON.stringify(snapshot),
      readBody: false,
    });
    return { snapshot, backup };
  },

  async listBackups(config: S3Config): Promise<S3Backup[]> {
    const normalized = normalizeConfig(config);
    assertRemoteConfig(normalized);
    const prefix = `${normalized.backupPrefix}/`;
    const response = await s3Request(normalized, {
      method: 'GET',
      path: buildBucketPath(normalized),
      query: buildCanonicalQuery([['list-type', '2'], ['prefix', prefix]]),
      readBody: true,
    });
    return parseBackupList(response.body, prefix);
  },

  async restore(config: S3Config, backupPath: string) {
    const normalized = normalizeConfig(config);
    assertRemoteConfig(normalized);
    const path = assertBackupPath(normalized.backupPrefix, backupPath);
    const response = await s3Request(normalized, {
      method: 'GET',
      path: buildObjectPath(normalized, path),
      readBody: true,
    });
    const snapshot = JSON.parse(response.body) as PrivateDataSnapshot;
    await localPrivateStore.restore(snapshot);
    return snapshot;
  },

  async deleteBackup(config: S3Config, backupPath: string) {
    const normalized = normalizeConfig(config);
    assertRemoteConfig(normalized);
    const path = assertBackupPath(normalized.backupPrefix, backupPath);
    await s3Request(normalized, {
      method: 'DELETE',
      path: buildObjectPath(normalized, path),
      readBody: false,
      acceptedStatuses: [404],
    });
  },

  async testConnection(config: S3Config) {
    const normalized = normalizeConfig(config);
    assertRemoteConfig(normalized);
    await s3Request(normalized, {
      method: 'GET',
      path: buildBucketPath(normalized),
      query: buildCanonicalQuery([['list-type', '2'], ['max-keys', '1'], ['prefix', `${normalized.backupPrefix}/`]]),
      readBody: false,
    });
  },
};
