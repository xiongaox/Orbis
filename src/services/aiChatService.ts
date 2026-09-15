/**
 * aiChatService - 服务层
 *
 * 模块定位：
 * - 所在层级：服务层
 * - 主要目标：精简为三种 API 协议（Anthropic Messages, Chat Completions, Responses），支持 SSE 流式与深度思考捕获，智能补齐 /v1 路径，基于原生 nativeSafeFetch 杜绝跨域拦截
 *
 * 关键职责：
 * - 封装三大协议格式：Anthropic Messages (/v1/messages), Chat Completions (/chat/completions), Responses (/responses)
 * - 智能端点补齐：若用户 Base URL 未带 /v1（如 https://api.iiiiitoken.com），自动补齐 /v1 避免命中网页 HTML
 * - 使用 nativeSafeFetch（Tauri 环境由 Rust 原生网络栈直接发起），彻底消除 WebKit 的 Load failed 与 CORS 拦截
 * - 支持 stream 流式读取，捕获 reasoning_content 深度思考与 content 正文
 * - 提供心跳续期机制，防止推理过程中发生超时中断；详细透出服务端或模型的真实错误信息
 */

import {
  aiModelService,
  nativeSafeFetch,
  type AiModelService,
  type AiProtocol,
} from './aiModelService';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChunk {
  text?: string;
  reasoning?: string;
}

export interface CallAiOptions {
  service?: AiModelService;
  model?: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface CallAiStreamOptions extends CallAiOptions {
  onChunk: (chunk: StreamChunk) => void;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

/**
 * 智能拼接端点路径（自动处理 /v1 补齐与去重）
 */
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

/**
 * 构建请求头与请求体
 */
function buildRequestPayload(
  protocol: AiProtocol,
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt?: string,
  temperature = 0.2,
  stream = true
): { url: string; headers: Record<string, string>; body: string } {
  switch (protocol) {
    case 'anthropic-messages': {
      const url = resolveEndpoint(baseUrl, '/v1/messages');
      const headers: Record<string, string> = {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json',
      };
      const cleanMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));
      const body = JSON.stringify({
        model,
        messages: cleanMessages,
        system: systemPrompt,
        max_tokens: 4096,
        temperature,
        stream,
      });
      return { url, headers, body };
    }

    case 'responses': {
      const url = resolveEndpoint(baseUrl, '/responses');
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      };
      const allMessages = systemPrompt
        ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
        : messages;
      const body = JSON.stringify({
        model,
        input: allMessages,
        temperature,
        stream,
      });
      return { url, headers, body };
    }

    case 'openai-compatible':
    default: {
      const url = resolveEndpoint(baseUrl, '/chat/completions');
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      };
      const allMessages = systemPrompt
        ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
        : messages;
      const body = JSON.stringify({
        model,
        messages: allMessages,
        temperature,
        stream,
      });
      return { url, headers, body };
    }
  }
}

/**
 * 解析流式 SSE 数据行
 */
function parseSseLine(protocol: AiProtocol, line: string): StreamChunk | null {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('data:')) return null;

  const dataStr = trimmed.slice(5).trim();
  if (dataStr === '[DONE]') return null;

  try {
    const json = JSON.parse(dataStr) as Record<string, unknown>;

    switch (protocol) {
      case 'anthropic-messages': {
        const type = json.type as string | undefined;
        if (type === 'content_block_delta') {
          const delta = json.delta as Record<string, unknown> | undefined;
          if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
            return { text: delta.text };
          }
          if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
            return { reasoning: delta.thinking };
          }
        }
        break;
      }

      case 'responses':
      case 'openai-compatible':
      default: {
        const choices = json.choices;
        if (Array.isArray(choices) && choices.length > 0) {
          const first = choices[0];
          if (first && typeof first === 'object' && 'delta' in first) {
            const delta = (first as Record<string, unknown>).delta;
            if (delta && typeof delta === 'object') {
              const deltaObj = delta as Record<string, unknown>;
              const text = typeof deltaObj.content === 'string' ? deltaObj.content : undefined;
              const reasoning = typeof deltaObj.reasoning_content === 'string' ? deltaObj.reasoning_content : undefined;
              if (text || reasoning) {
                return { text, reasoning };
              }
            }
          }
        }
        break;
      }
    }
  } catch {
    // 忽略非 JSON 行
  }

  return null;
}

export const aiChatService = {
  /**
   * 获取所有可用的服务列表
   */
  async getAvailableServices(): Promise<AiModelService[]> {
    const services = await aiModelService.getServices();
    return services.filter((s) => s.enabled);
  },

  /**
   * 流式调用 AI 推理（支持 reasoning_content 深度思考输出）
   */
  async callChatStream(options: CallAiStreamOptions): Promise<{ fullText: string; fullReasoning: string }> {
    let service = options.service;
    if (!service) {
      const available = await this.getAvailableServices();
      if (available.length === 0) {
        throw new Error('未配置或未启用任何 AI 服务，请先前往右上角配置 AI 集成');
      }
      service = available[0];
    }

    const model = options.model || service.models?.[0];
    if (!model) {
      throw new Error(`服务【${service.name}】未配置模型名称，请在 AI 集成中设置`);
    }

    const { url, headers, body } = buildRequestPayload(
      service.protocol,
      service.baseUrl,
      service.apiKey,
      model,
      options.messages,
      options.systemPrompt,
      options.temperature,
      true // stream
    );

    const controller = new AbortController();
    // 首包 35 秒超时保护
    let timer: number | null = window.setTimeout(() => controller.abort(), 35_000);

    const resetHeartbeat = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => controller.abort(), 60_000);
    };

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    let fullText = '';
    let fullReasoning = '';

    try {
      const response = await nativeSafeFetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errDetail = '';
        try {
          const errJson = (await response.json()) as Record<string, unknown>;
          const errObj = errJson.error as Record<string, unknown> | undefined;
          errDetail = (typeof errObj?.message === 'string' ? errObj.message : '') ||
                      (typeof errJson.message === 'string' ? errJson.message : '') ||
                      JSON.stringify(errJson);
        } catch {
          errDetail = await response.text();
        }
        throw new Error(`服务商返回错误 (${response.status}): ${errDetail || response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error('Base URL 配置有误：请求返回了 HTML 网页而非 API 数据，请检查接口地址是否正确');
      }

      if (!response.body) {
        throw new Error('服务响应体为空，无法建立流式传输');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        resetHeartbeat();
        buffer += decoder.decode(value, { stream: true });

        // 防止首段返回 HTML 网页
        if (!fullText && !fullReasoning && (buffer.includes('<!DOCTYPE') || buffer.includes('<html'))) {
          throw new Error('Base URL 路径错误：接口返回了网页 HTML，请检查 Base URL 是否正确');
        }

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const chunk = parseSseLine(service.protocol, line);
          if (chunk) {
            if (chunk.reasoning) {
              fullReasoning += chunk.reasoning;
            }
            if (chunk.text) {
              fullText += chunk.text;
            }
            options.onChunk(chunk);
          }
        }
      }

      // 处理 buffer 余量
      if (buffer.trim()) {
        const chunk = parseSseLine(service.protocol, buffer);
        if (chunk) {
          if (chunk.reasoning) fullReasoning += chunk.reasoning;
          if (chunk.text) fullText += chunk.text;
          options.onChunk(chunk);
        }
      }

      if (!fullText.trim() && !fullReasoning.trim()) {
        throw new Error(`服务【${service.name}】已响应，但模型【${model}】未返回有效推导内容。这通常表明该模型在中转服务商侧暂时无响应或额度不足，建议尝试切换为 gemini-3.8-flash-high 或 glm-5.3-flash`);
      }

      return { fullText, fullReasoning };
    } catch (error: unknown) {
      console.error('[aiChatService Error]', error);
      let message = '网络异常导致 AI 请求中断';
      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        if (errObj.name === 'AbortError' || errObj.message === 'request cancelled') {
          if (options.signal?.aborted) {
            message = '推演已被手动停止';
          } else {
            message = `AI 模型【${model}】响应超时（服务商中转节点长时间无数据返回）。建议在下拉框中切换为其他稳定模型（如 gemini-3.8-flash-high）`;
          }
        } else if (typeof errObj.message === 'string' && errObj.message) {
          message = errObj.message;
        }
      } else if (typeof error === 'string') {
        message = error;
      }
      throw new Error(message);
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  },

  /**
   * 非流式回退调用
   */
  async callChat(options: CallAiOptions): Promise<string> {
    const { fullText } = await this.callChatStream({
      ...options,
      onChunk: () => {},
    });
    return fullText;
  },
};
