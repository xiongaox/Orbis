import { supabase } from '../lib/supabase';

export type AiProtocol =
  | 'openai-compatible'
  | 'anthropic-messages'
  | 'google-generative-ai'
  | 'azure-openai'
  | 'ollama';

export const AI_PROTOCOLS: ReadonlyArray<{
  value: AiProtocol;
  label: string;
  defaultBaseUrl: string;
  requiresApiKey: boolean;
}> = [
  {
    value: 'openai-compatible',
    label: 'OpenAI 兼容协议',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
  },
  {
    value: 'anthropic-messages',
    label: 'Anthropic Messages API',
    defaultBaseUrl: 'https://api.anthropic.com',
    requiresApiKey: true,
  },
  {
    value: 'google-generative-ai',
    label: 'Google Gemini API',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    requiresApiKey: true,
  },
  {
    value: 'azure-openai',
    label: 'Azure OpenAI API',
    defaultBaseUrl: 'https://YOUR-RESOURCE.openai.azure.com',
    requiresApiKey: true,
  },
  {
    value: 'ollama',
    label: 'Ollama 本地 API',
    defaultBaseUrl: 'http://localhost:11434',
    requiresApiKey: false,
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
  protocol: AiProtocol;
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

function toService(record: AiModelServiceRecord): AiModelService {
  return {
    id: record.id,
    name: record.name,
    protocol: record.protocol,
    baseUrl: record.base_url,
    apiKey: record.api_key,
    models: record.models ?? [],
    enabled: record.enabled,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录后管理 AI 服务');
  return user.id;
}

export const aiModelService = {
  async getServices(): Promise<AiModelService[]> {
    await getCurrentUserId();
    const { data, error } = await supabase
      .from('ai_model_services')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch AI model services:', error);
      throw new Error(error.message);
    }

    return (data as AiModelServiceRecord[] | null ?? []).map(toService);
  },

  async createService(input: AiModelServiceInput): Promise<AiModelService> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('ai_model_services')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        protocol: input.protocol,
        base_url: normalizeBaseUrl(input.baseUrl),
        api_key: input.apiKey.trim(),
        models: input.models?.map((model) => model.trim()).filter(Boolean) ?? [],
        enabled: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create AI model service:', error);
      throw new Error(error.message);
    }

    return toService(data as AiModelServiceRecord);
  },

  async updateService(id: string, input: AiModelServiceInput): Promise<AiModelService> {
    const updates = {
      name: input.name.trim(),
      protocol: input.protocol,
      base_url: normalizeBaseUrl(input.baseUrl),
      models: input.models?.map((model) => model.trim()).filter(Boolean) ?? [],
      ...(input.apiKey.trim() ? { api_key: input.apiKey.trim() } : {}),
    };
    const { data, error } = await supabase
      .from('ai_model_services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update AI model service:', error);
      throw new Error(error.message);
    }

    return toService(data as AiModelServiceRecord);
  },

  async toggleService(id: string, enabled: boolean): Promise<AiModelService> {
    const { data, error } = await supabase
      .from('ai_model_services')
      .update({ enabled })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to toggle AI model service:', error);
      throw new Error(error.message);
    }

    return toService(data as AiModelServiceRecord);
  },

  async deleteService(id: string): Promise<void> {
    const { error } = await supabase
      .from('ai_model_services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete AI model service:', error);
      throw new Error(error.message);
    }
  },
};

export async function testAiModelService(input: Pick<AiModelServiceInput, 'protocol' | 'baseUrl' | 'apiKey'>) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  if (!baseUrl) throw new Error('请填写 Base URL');
  const protocol = AI_PROTOCOLS.find((item) => item.value === input.protocol);
  if (!protocol) throw new Error('不支持的 API 协议');
  if (protocol.requiresApiKey && !input.apiKey.trim()) throw new Error('请填写 API Key');

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(getModelsUrl(protocol.value, baseUrl, input.apiKey), {
      headers: getModelsHeaders(protocol.value, input.apiKey),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`服务返回 ${response.status}`);
    }

    const payload: unknown = await response.json();
    return { modelIds: getModelIds(payload, protocol.value) };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('连接超时，请检查服务地址');
    }

    if (error instanceof Error) {
      throw new Error(`连接失败：${error.message}`);
    }

    throw new Error('连接失败，请检查服务配置');
  } finally {
    window.clearTimeout(timeout);
  }
}

function getModelsUrl(protocol: AiProtocol, baseUrl: string, apiKey: string) {
  switch (protocol) {
    case 'anthropic-messages':
      return `${baseUrl}/v1/models`;
    case 'google-generative-ai':
      return `${baseUrl}/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`;
    case 'azure-openai':
      return `${baseUrl}/openai/models?api-version=2024-10-21`;
    case 'ollama':
      return `${baseUrl}/api/tags`;
    default:
      return `${baseUrl}/models`;
  }
}

function getModelsHeaders(protocol: AiProtocol, apiKey: string): Record<string, string> {
  switch (protocol) {
    case 'anthropic-messages':
      return {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      };
    case 'azure-openai':
      return { 'api-key': apiKey.trim() };
    case 'openai-compatible':
      return { Authorization: `Bearer ${apiKey.trim()}` };
    default:
      return {};
  }
}

function getModelIds(payload: unknown, protocol: AiProtocol) {
  if (!payload || typeof payload !== 'object') return [];

  const source = protocol === 'ollama'
    ? ('models' in payload && Array.isArray(payload.models) ? payload.models : [])
    : protocol === 'google-generative-ai'
      ? ('models' in payload && Array.isArray(payload.models) ? payload.models : [])
      : ('data' in payload && Array.isArray(payload.data) ? payload.data : []);

  return source
    .map((model) => (
      model && typeof model === 'object'
        ? getModelId(model, protocol)
        : null
    ))
    .filter((model): model is string => model !== null);
}

function getModelId(model: object, protocol: AiProtocol) {
  if (protocol === 'google-generative-ai' && 'name' in model && typeof model.name === 'string') {
    return model.name.replace(/^models\//, '');
  }

  if (protocol === 'ollama' && 'name' in model && typeof model.name === 'string') {
    return model.name;
  }

  return 'id' in model && typeof model.id === 'string' ? model.id : null;
}
