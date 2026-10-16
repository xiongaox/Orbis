/**
 * AI 对话历史存储：每会话一条记录（§3.1 / §4.3 第 11 条）。
 * 覆盖旧版整份数组记录的迁移、差量落盘与删除——差量基准若用对象引用，
 * 调用方的原地修改会让判断失效（什么都不写盘），是本文件的主要防线。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }));

import { localPrivateStore } from './localPrivateStore';
import { aiChatHistoryService, preloadAiChatSessions } from './aiChatHistoryService';
import type { AiChatSession } from './aiChatHistoryService';

const SESSION_TYPES = ['ai_chat_session', 'ai_chat_sessions'] as const;

function session(id: string, overrides: Partial<AiChatSession> = {}): AiChatSession {
  return {
    id,
    divinationType: 'bazi',
    divinationTypeName: '八字',
    caseName: '测试案例',
    title: `标题-${id}`,
    createdAt: 1,
    updatedAt: 1,
    isFavorite: false,
    messages: [],
    ...overrides,
  };
}

async function resetEnvironment() {
  await localPrivateStore.clearOutbox();
  await localPrivateStore.clearSyncVersions();
  for (const type of SESSION_TYPES) {
    for (const record of await localPrivateStore.list(type)) {
      await localPrivateStore.remove(type, record.id, { remoteOrigin: true });
    }
  }
}

describe('aiChatHistoryService 会话存储（一会话一条）', () => {
  beforeEach(async () => {
    await resetEnvironment();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await resetEnvironment();
  });

  it('旧版整份数组记录：预载时拆分为每会话一条并删除旧记录', async () => {
    await localPrivateStore.put(
      'ai_chat_sessions',
      { value: [session('s-1'), session('s-2')] },
      'ai_chat_sessions',
      undefined,
      { remoteOrigin: true },
    );

    await preloadAiChatSessions();

    expect(
      aiChatHistoryService
        .getAllSessions()
        .map((item) => item.id)
        .sort(),
    ).toEqual(['s-1', 's-2']);
    expect(await localPrivateStore.get('ai_chat_sessions', 'ai_chat_sessions')).toBeFalsy();
    expect(await localPrivateStore.get('ai_chat_session', 's-1')).toBeTruthy();
    expect(await localPrivateStore.get('ai_chat_session', 's-2')).toBeTruthy();
    // 手动同步类型：迁移写入不入队，必须由「同步」按钮显式触发
    expect(await localPrivateStore.countOutbox()).toBe(0);
  });

  it('差量落盘：只重写内容变化的会话，未改动的会话不重复写盘', async () => {
    await localPrivateStore.put('ai_chat_session', { value: session('s-1') }, 's-1');
    await localPrivateStore.put('ai_chat_session', { value: session('s-2') }, 's-2');
    await preloadAiChatSessions();

    const putSpy = vi.spyOn(localPrivateStore, 'put');
    aiChatHistoryService.updateSessionMessages('s-1', [
      { id: 'm-1', role: 'user', content: '你好', timestamp: 10 },
    ]);

    await vi.waitFor(() => expect(putSpy).toHaveBeenCalledTimes(1));
    expect(putSpy.mock.calls.map((call) => call[2])).toEqual(['s-1']);
    const stored = await localPrivateStore.get('ai_chat_session', 's-1');
    expect((stored?.payload as { value: { messages: unknown[] } }).value.messages).toHaveLength(1);
  });

  it('删除会话：对应记录被移除，其他会话保留', async () => {
    await localPrivateStore.put('ai_chat_session', { value: session('s-1') }, 's-1');
    await localPrivateStore.put('ai_chat_session', { value: session('s-2') }, 's-2');
    await preloadAiChatSessions();

    aiChatHistoryService.deleteSession('s-1');

    await vi.waitFor(async () => {
      expect(await localPrivateStore.get('ai_chat_session', 's-1')).toBeFalsy();
    });
    expect(await localPrivateStore.get('ai_chat_session', 's-2')).toBeTruthy();
  });

  it('原地修改也落盘：切换收藏后内容写入记录（差量基准不被原地修改带偏）', async () => {
    await localPrivateStore.put('ai_chat_session', { value: session('s-1') }, 's-1');
    await preloadAiChatSessions();

    aiChatHistoryService.toggleFavorite('s-1');

    await vi.waitFor(async () => {
      const stored = await localPrivateStore.get('ai_chat_session', 's-1');
      expect((stored?.payload as { value: { isFavorite: boolean } }).value.isFavorite).toBe(true);
    });
  });
});
