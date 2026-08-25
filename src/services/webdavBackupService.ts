import { localPrivateStore, type PrivateDataSnapshot } from './localPrivateStore';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export interface WebDavConfig {
  endpoint: string;
  username: string;
  password: string;
  filePath: string;
}

const CONFIG_KEY = 'orbis_webdav_config';
const DEFAULT_FILE = 'orbis/private-data.json';
const MAX_RETRIES = 3;

export const webDavBackupService = {
  readConfig(): WebDavConfig {
    if (typeof localStorage === 'undefined') return { endpoint: '', username: '', password: '', filePath: DEFAULT_FILE };
    try {
      return { filePath: DEFAULT_FILE, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}') } as WebDavConfig;
    } catch {
      return { endpoint: '', username: '', password: '', filePath: DEFAULT_FILE };
    }
  },

  saveConfig(config: WebDavConfig) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  },

  async backup(config: WebDavConfig) {
    const snapshot = await localPrivateStore.snapshot();
    await requestWithRetry(config, 'PUT', JSON.stringify(snapshot));
    return snapshot;
  },

  async restore(config: WebDavConfig) {
    const response = await requestWithRetry(config, 'GET');
    const snapshot = JSON.parse(response) as PrivateDataSnapshot;
    await localPrivateStore.restore(snapshot);
    return snapshot;
  },

  async testConnection(config: WebDavConfig) {
    await requestWithRetry(config, 'OPTIONS');
  },
};

function buildUrl(config: WebDavConfig) {
  if (!config.endpoint.trim()) throw new Error('请填写 WebDAV 地址');
  const endpoint = config.endpoint.trim().replace(/\/+$/, '');
  const filePath = config.filePath.trim().replace(/^\/+/, '') || DEFAULT_FILE;
  return `${endpoint}/${filePath.split('/').map(encodeURIComponent).join('/')}`;
}

async function requestWithRetry(config: WebDavConfig, method: 'GET' | 'PUT' | 'OPTIONS', body?: string) {
  const url = buildUrl(config);
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const headers: Record<string, string> = {};
      if (config.username || config.password) headers.Authorization = `Basic ${btoa(`${config.username}:${config.password}`)}`;
      if (body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8';
      const request = isTauriRuntime()
        ? tauriFetch(url, { method, headers, body })
        : fetchWithTimeout(url, { method, headers, body }, 15_000);
      const response = await request;
      if (!response.ok) throw new Error(`WebDAV ${method} 失败（HTTP ${response.status}）`);
      return method === 'GET' ? await response.text() : '';
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
