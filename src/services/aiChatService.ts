/**
 * 模块定位：
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

  /**
   * 根据首轮问答生成精炼中文标题（4~10个字），支持离线规则降级
   */
  async generateConversationTitle(options: {
    service?: AiModelService;
    model?: string;
    question: string;
    answer?: string;
    divinationType?: string;
  }): Promise<string> {
    const fallbackTitle = extractSmartTitleFromQuestion(options.question, options.divinationType);

    try {
      let cleanQ = options.question.trim();
      const matchKeyQuestion = cleanQ.match(/重点分析以下方面[：:]?\s*([\s\S]+)/);
      if (matchKeyQuestion && matchKeyQuestion[1]) {
        cleanQ = matchKeyQuestion[1].slice(0, 80);
      } else if (cleanQ.includes('我让玄枢录排出了')) {
        cleanQ = cleanQ.replace(/我让玄枢录排出了[\s\S]*?(?=请结合|重点|问题|$)/, '').trim();
      }

      if (!cleanQ) {
        cleanQ = fallbackTitle;
      }

      const prompt = `请根据以下命理研判问答，提炼总结一个4到10个字的中文标题（例如："甲木格局与喜用分析"、"流年事业财运推演"、"婚姻情感吉凶研判"）。
必须且仅输出标题本身，严禁输出任何标点符号、书名号、引号或多余文字。

问：${cleanQ.slice(0, 100)}
答：${(options.answer || '').slice(0, 100)}`;

      const title = await this.callChat({
        service: options.service,
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        timeoutMs: 8000,
      });

      const clean = title.trim().replace(/^["'《「『【\s]+|["'》」』】\s]+$/g, '').slice(0, 14);
      if (clean && clean.length >= 2 && !clean.includes('\n')) {
        return clean;
      }
    } catch (err) {
      console.warn('[aiChatService] 自动标题生成失败，使用规则降级标题:', err);
    }

    return fallbackTitle;
  },
};

/**
 * 本地智能提取标题（毫秒级离线规则）
 */
export function extractSmartTitleFromQuestion(question: string, divinationType?: string): string {
  if (!question || !question.trim()) {
    return '命理研判';
  }

  const text = question.trim();

  // 1. 常见主题关键词匹配
  if (/婚|配偶|感情|正缘|恋爱|另一半|夫星|妻星|桃花/.test(text)) {
    return '婚姻情感研判';
  }
  if (/财|投资|求财|发财|破财|经商|赚钱|财运/.test(text)) {
    return '财运投资研判';
  }
  if (/工作|事业|升迁|升职|跳槽|考公|考编|创业|前途/.test(text)) {
    return '事业前程研判';
  }
  if (/健康|疾病|生病|疾厄|寿元|平安|手术/.test(text)) {
    return '健康平安研判';
  }
  if (/大运|流年|运势|岁运|太岁|流月/.test(text)) {
    return '大运流年推演';
  }
  if (/格局|用神|喜神|忌神|旺衰|旺相|日元/.test(text)) {
    return '格局喜用分析';
  }

  // 2. 检查排盘模板
  if (text.includes('我让玄枢录排出了')) {
    // 检查是否有自定义追问
    const customSuffix = text.replace(/我让玄枢录排出了[\s\S]*?(请结合.*)?$/, '').trim();
    if (customSuffix && customSuffix.length >= 3) {
      return customSuffix.slice(0, 10);
    }

    if (divinationType === 'qimen') return '奇门局象综合研判';
    if (divinationType === 'sanyuan') return '三元天星命局研判';
    return '八字格局综合研判';
  }

  // 3. 用户简短自由提问
  const cleaned = text.replace(/^[请问帮我看看一下呢吗？?，,。\s]+/, '').slice(0, 10);
  return cleaned ? `${cleaned}研判` : '命理综合研判';
}
