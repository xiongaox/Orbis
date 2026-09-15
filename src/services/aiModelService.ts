import { localPrivateStore } from './localPrivateStore';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export type AiProtocol =
  | 'anthropic-messages'
  | 'openai-compatible'
  | 'responses';

export const AI_PROTOCOLS: ReadonlyArray<{
  value: AiProtocol;
  label: string;
  defaultBaseUrl: string;
  requiresApiKey: boolean;
}> = [
  {
    value: 'anthropic-messages',
    label: 'Anthropic Messages (/v1/messages)',
    defaultBaseUrl: 'https://api.anthropic.com',
    requiresApiKey: true,
  },
  {
    value: 'openai-compatible',
    label: 'Chat Completions (/chat/completions)',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
  },
  {
    value: 'responses',
    label: 'Responses (/responses)',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
  },
];

export interface AiModelService {
  id: string;
  name: string;
  protocol: AiProtocol;
  baseUrl: string;
  apiKey: string;
  models: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiModelServiceInput {
  name: string;
  protocol: AiProtocol;
  baseUrl: string;
  apiKey: string;
  models?: string[];
}

interface AiModelServiceRecord {
  id: string;
  name: string;
  protocol: string;
  base_url: string;
  api_key: string;
  models: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  );
}

/**
 * 在 Tauri 环境使用底层 Rust 原生请求（零 CORS / 零 WebKit 拦截），浏览器环境回退为 window.fetch
 */
export async function nativeSafeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (isTauriRuntime()) {
    return tauriFetch(input, init);
  }
  return window.fetch(input, init);
}

function toService(record: AiModelServiceRecord): AiModelService {
  let protocol: AiProtocol = 'openai-compatible';
  if (record.protocol === 'anthropic-messages' || record.protocol === 'responses' || record.protocol === 'openai-compatible') {
    protocol = record.protocol;
  }

  return {
    id: record.id,
    name: record.name,
    protocol,
    baseUrl: record.base_url,
    apiKey: record.api_key,
    models: record.models ?? [],
    enabled: record.enabled,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export const aiModelService = {
  async getServices(): Promise<AiModelService[]> {
    const records = await localPrivateStore.list('ai_model_service');
    return records.map((record) => toService(record.payload as unknown as AiModelServiceRecord));
  },

  async createService(input: AiModelServiceInput): Promise<AiModelService> {
    const now = new Date().toISOString();
    const record: AiModelServiceRecord = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      protocol: input.protocol,
      base_url: normalizeBaseUrl(input.baseUrl),
      api_key: input.apiKey.trim(),
      models: input.models?.map((model) => model.trim()).filter(Boolean) ?? [],
      enabled: true,
      created_at: now,
      updated_at: now
    };
    await localPrivateStore.put('ai_model_service', record as unknown as Record<string, unknown>, record.id);
    return toService(record);
  },

  async updateService(id: string, input: AiModelServiceInput): Promise<AiModelService> {
    const current = await localPrivateStore.get('ai_model_service', id);
    if (!current) throw new Error('未找到 AI 服务');
    const previous = current.payload as unknown as AiModelServiceRecord;
    const updates: AiModelServiceRecord = {
      ...previous,
      name: input.name.trim(),
      protocol: input.protocol,
      base_url: normalizeBaseUrl(input.baseUrl),
      models: input.models?.map((model) => model.trim()).filter(Boolean) ?? [],
      api_key: input.apiKey.trim() || previous.api_key,
      updated_at: new Date().toISOString(),
    };
    await localPrivateStore.put('ai_model_service', updates as unknown as Record<string, unknown>, id);
    return toService(updates);
  },

  async toggleService(id: string, enabled: boolean): Promise<AiModelService> {
    const current = await localPrivateStore.get('ai_model_service', id);
    if (!current) throw new Error('未找到 AI 服务');
    const record = { ...(current.payload as unknown as AiModelServiceRecord), enabled, updated_at: new Date().toISOString() };
    await localPrivateStore.put('ai_model_service', record as unknown as Record<string, unknown>, id);
    return toService(record);
  },

  async deleteService(id: string): Promise<void> {
    await localPrivateStore.remove('ai_model_service', id);
  },
};

const DEFAULT_CLAUDE_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229'
];

const DEFAULT_OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'deepseek-chat',
  'deepseek-reasoner'
];

async function extractErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      const errObj = json.error as Record<string, unknown> | undefined;
      if (typeof errObj?.message === 'string') return errObj.message;
      if (typeof json.message === 'string') return json.message;
      if (typeof json.detail === 'string') return json.detail;
      return text.slice(0, 200);
    } catch {
      return text.slice(0, 200);
    }
  } catch {
    return response.statusText;
  }
}

export function resolveEndpoint(baseUrl: string, defaultPath: string): string {
  let cleanBase = normalizeBaseUrl(baseUrl);

  // 1. 如果 defaultPath 是 /chat/completions 或 /responses
  if (defaultPath === '/chat/completions' || defaultPath === '/responses') {
    const hasVersion = /\/v\d+[a-zA-Z0-9._-]*$/.test(cleanBase);
    if (!hasVersion) {
      cleanBase = `${cleanBase}/v1`;
    }
    return `${cleanBase}${defaultPath}`;
  }

  // 2. 如果 defaultPath 是 /v1/messages
  if (defaultPath.startsWith('/v1/')) {
    if (cleanBase.endsWith('/v1')) {
      return `${cleanBase}${defaultPath.slice(3)}`;
    }
    return `${cleanBase}${defaultPath}`;
  }

  return `${cleanBase}${defaultPath}`;
}

export async function testAiModelService(input: Pick<AiModelServiceInput, 'protocol' | 'baseUrl' | 'apiKey'>) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  if (!baseUrl) throw new Error('请填写 Base URL');
  const protocol = AI_PROTOCOLS.find((item) => item.value === input.protocol);
  if (!protocol) throw new Error('不支持的 API 协议');
  if (protocol.requiresApiKey && !input.apiKey.trim()) throw new Error('请填写 API Key');

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);

  try {
    const modelsUrl = getModelsUrl(protocol.value, baseUrl);
    const headers = getModelsHeaders(protocol.value, input.apiKey);

    // 阶段 1: 尝试获取模型列表
    try {
      const response = await nativeSafeFetch(modelsUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (response.ok) {
        const payload: unknown = await response.json();
        const modelIds = getModelIds(payload);
        if (modelIds.length > 0) {
          return { modelIds };
        }
      }
    } catch {
      // models 端点请求网络异常时继续尝试 probe
    }

    // 阶段 2: 若 /models 接口未开放或返回错误，通过各协议对应的轻量 probe 探测连通性
    if (protocol.value === 'anthropic-messages') {
      const messagesUrl = resolveEndpoint(baseUrl, '/v1/messages');
      const probeRes = await nativeSafeFetch(messagesUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
        signal: controller.signal,
      });

      if (probeRes.ok || probeRes.status === 400) {
        return { modelIds: DEFAULT_CLAUDE_MODELS };
      }

      const errDetail = await extractErrorDetail(probeRes);
      if (probeRes.status === 401 || probeRes.status === 403) {
        const hint = (baseUrl.includes('api.anthropic.com') || baseUrl.includes('api.openai.com'))
          ? '（提示：若您使用的是第三方中转站如 woyaopro，请将 Base URL 改为该中转站地址，勿用官方地址）'
          : '';
        throw new Error(`认证失败 (${probeRes.status}): ${errDetail} ${hint}`);
      }

      throw new Error(`服务返回 (${probeRes.status}): ${errDetail}`);
    }

    if (protocol.value === 'responses') {
      const responsesUrl = resolveEndpoint(baseUrl, '/responses');
      const probeRes = await nativeSafeFetch(responsesUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1,
          input: [{ role: 'user', content: 'hi' }],
        }),
        signal: controller.signal,
      });

      if (probeRes.ok || probeRes.status === 400) {
        return { modelIds: DEFAULT_OPENAI_MODELS };
      }

      const errDetail = await extractErrorDetail(probeRes);
      if (probeRes.status === 401 || probeRes.status === 403) {
        const hint = baseUrl.includes('api.openai.com')
          ? '（提示：若使用的是第三方中转服务，请将 Base URL 填为服务商接口地址，切勿使用 api.openai.com 官方地址）'
          : '';
        throw new Error(`认证失败 (${probeRes.status}): ${errDetail} ${hint}`);
      }

      throw new Error(`服务返回 (${probeRes.status}): ${errDetail}`);
    }

    // openai-compatible (Chat Completions)
    const completionsUrl = resolveEndpoint(baseUrl, '/chat/completions');
    const probeRes = await nativeSafeFetch(completionsUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
      signal: controller.signal,
    });

    if (probeRes.ok || probeRes.status === 400) {
      return { modelIds: DEFAULT_OPENAI_MODELS };
    }

    const errDetail = await extractErrorDetail(probeRes);
    if (probeRes.status === 401 || probeRes.status === 403) {
      const hint = baseUrl.includes('api.openai.com')
        ? '（提示：若使用的是第三方中转服务，请将 Base URL 填为服务商接口地址，切勿使用 api.openai.com 官方地址）'
        : '';
      throw new Error(`认证失败 (${probeRes.status}): ${errDetail} ${hint}`);
    }

    throw new Error(`服务返回 (${probeRes.status}): ${errDetail}`);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('连接超时，请检查 Base URL 是否可达');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('连接失败，请检查网络或服务配置');
  } finally {
    window.clearTimeout(timeout);
  }
}

function getModelsUrl(_protocol: AiProtocol, baseUrl: string) {
  let cleanBase = normalizeBaseUrl(baseUrl);
  const hasVersion = /\/v\d+[a-zA-Z0-9._-]*$/.test(cleanBase);
  if (!hasVersion) {
    cleanBase = `${cleanBase}/v1`;
  }
  return `${cleanBase}/models`;
}

function getModelsHeaders(protocol: AiProtocol, apiKey: string): Record<string, string> {
  switch (protocol) {
    case 'anthropic-messages':
      return {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      };
    case 'responses':
    case 'openai-compatible':
    default:
      return { Authorization: `Bearer ${apiKey.trim()}` };
  }
}

function getModelIds(payload: unknown) {
  if (!payload || typeof payload !== 'object') return [];

  const source = ('data' in payload && Array.isArray(payload.data) ? payload.data : []) as unknown[];

  return source
    .map((model) => {
      if (model && typeof model === 'object' && 'id' in model && typeof model.id === 'string') {
        return model.id;
      }
      return null;
    })
    .filter((model): model is string => model !== null);
}
