import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }));

import { localPrivateStore, SYNCABLE_RECORD_TYPES, SYNC_MANUAL_TYPES } from './localPrivateStore';
import type { PrivateRecordType } from './localPrivateStore';
import {
  AI_CHAT_SESSIONS_CHANGED_EVENT,
  BAZI_CASES_CHANGED_EVENT,
  QIMEN_CASES_CHANGED_EVENT,
  SANYUAN_CASES_CHANGED_EVENT,
} from '../data/caseConstants';
import {
  loadCloudSyncState,
  saveCloudSyncConfig,
  saveCloudSyncState,
} from './cloudSyncStore';
import {
  AUTO_SYNC_MAX_FAILURES,
  CloudSyncHttpError,
  CONFLICT_COPY_FIELD,
  getStatus,
  syncChatSessionsNow,
  syncNow,
  syncNowAuto,
  testConnection,
} from './cloudSyncService';
import { MAX_RETRIES } from './remoteBackupShared';

const WORKER_URL = 'https://sync.example.com';
const CONFIG = {
  enabled: true,
  workerUrl: WORKER_URL,
  syncToken: 'test-token',
  workspaceId: 'test-workspace',
};

/** 测试环境走「内存存储 + 浏览器 fetch」分支：window 仅保留定时器能力 */
function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** 从完整请求地址提取路径（bootstrap/pull 带查询字符串，不能用 endsWith） */
function pathOf(url: string): string {
  return new URL(url).pathname;
}

function emptySyncPage(): Response {
  return jsonResponse({ results: [], records: [], changes: [], hasMore: false, currentSequence: 0 });
}

async function resetEnvironment() {
  await localPrivateStore.clearOutbox();
  await localPrivateStore.remove('cloud_sync_config', 'cloud_sync_config');
  await localPrivateStore.remove('cloud_sync_state', 'cloud_sync_state');
  // 内存模式跨测试残留：同步元数据之外，业务记录与版本镜像也需清空。
  // 镜像残留会让「按需补推」误判记录已同步而跳过，破坏精确计数断言；
  // 业务记录残留会破坏全量推送计数，并在 push mock 无回执时
  // 让 pushOutbox 循环不收敛。remoteOrigin 清理不入队。
  await localPrivateStore.clearSyncVersions();
  for (const type of SYNCABLE_RECORD_TYPES) {
    for (const record of await localPrivateStore.list(type as PrivateRecordType)) {
      await localPrivateStore.remove(type as PrivateRecordType, record.id, { remoteOrigin: true });
    }
  }
  // 手动同步类型（ai_chat_sessions）不在 SYNCABLE_RECORD_TYPES 中，需单独清理
  for (const type of SYNC_MANUAL_TYPES) {
    for (const record of await localPrivateStore.list(type as PrivateRecordType)) {
      await localPrivateStore.remove(type as PrivateRecordType, record.id, { remoteOrigin: true });
    }
  }
}

async function configure(overrides: Partial<typeof CONFIG> = {}) {
  await saveCloudSyncConfig({ ...CONFIG, ...overrides });
}

/** 构造 push 请求体的解析结果（echo 模式：按请求中的 mutationId 回执） */
function parsePushBody(init?: RequestInit) {
  return JSON.parse(String(init?.body)) as {
    workspaceId: string;
    deviceId: string;
    mutations: Array<{
      mutationId: string;
      type: string;
      recordId: string;
      operation: string;
      baseVersion: number | null;
    }>;
  };
}

function change(
  sequence: number,
  type: string,
  recordId: string,
  serverVersion: number,
  payload: unknown,
  deleted = 0,
) {
  return { sequence, type, recordId, serverVersion, deleted, payload };
}

describe('云同步编排（cloudSyncService，T06）', () => {
  beforeEach(async () => {
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.stubGlobal('indexedDB', undefined);
    // 内存存储跨测试残留：每条用例前清空同步配置/状态与 outbox
    await resetEnvironment();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('push 成功才清队列并更新版本镜像', async () => {
    const fetchMock = stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        expect(body.workspaceId).toBe('test-workspace');
        expect(body.mutations).toHaveLength(2);
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 42,
          })),
        });
      }
      return emptySyncPage();
    });
    await configure();
    await localPrivateStore.put('bazi_case', { title: '甲' }, 'case-1');
    await localPrivateStore.put('bazi_case', { title: '乙' }, 'case-2');

    const result = await syncNow();

    expect(result).toEqual({ status: 'ok', pushed: 2, pulled: 0, conflicts: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(3); // bootstrap + push + pull
    expect(await localPrivateStore.countOutbox()).toBe(0);
    expect(await localPrivateStore.getSyncVersion('bazi_case', 'case-1')).toBe(42);
    expect(await localPrivateStore.getSyncVersion('bazi_case', 'case-2')).toBe(42);
    const state = await loadCloudSyncState();
    expect(state?.lastSyncError).toBeNull();
  });

  it('push 失败（5xx）保留队列并退避重试', async () => {
    const fetchMock = stubFetch(() => new Response('boom', { status: 500 }));
    await configure();
    await localPrivateStore.put('bazi_case', { title: '甲' }, 'case-1');

    await expect(syncNow()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(MAX_RETRIES); // 仅 push，失败后不进 pull
    expect(await localPrivateStore.countOutbox()).toBe(1); // 队列保留
    const state = await loadCloudSyncState();
    expect(state?.lastSyncError).toBeTruthy();
    expect(state?.lastPulledSequence).toBeNull();
  });

  it('重复响应幂等：网络错误后重试，idempotent 回执同样清队列', async () => {
    let call = 0;
    const fetchMock = stubFetch(async (url, init) => {
      call += 1;
      if (call === 1) throw new Error('网络中断');
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'idempotent',
            serverVersion: 7,
          })),
        });
      }
      return emptySyncPage();
    });
    await configure();
    await localPrivateStore.put('bazi_case', { title: '甲' }, 'case-1');

    await expect(syncNow()).resolves.toMatchObject({ status: 'ok' });

    expect(call).toBeGreaterThan(1);
    expect(await localPrivateStore.countOutbox()).toBe(0);
    expect(await localPrivateStore.getSyncVersion('bazi_case', 'case-1')).toBe(7);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('pull 分页不丢不重，游标推进到末页最后一条', async () => {
    await configure();
    await saveCloudSyncState({
      deviceId: 'device-1',
      workerUrl: WORKER_URL,
      workspaceId: 'test-workspace',
      lastPulledSequence: 5,
      lastSyncAt: null,
      lastSyncError: null,
    });
    // 预置一条已同步记录（remoteOrigin 不入队，镜像已建立），验证 tombstone 删除
    await localPrivateStore.put('bazi_case', { title: '三' }, 'p-3', undefined, { remoteOrigin: true });
    await localPrivateStore.setSyncVersion('bazi_case', 'p-3', 5);

    const pages = [
      jsonResponse({
        changes: [
          change(6, 'bazi_case', 'p-1', 6, { id: 'p-1', title: '一' }),
          change(7, 'bazi_case', 'p-2', 7, { id: 'p-2', title: '二' }),
          change(8, 'profile', 'profile', 8, { id: 'profile', name: '远端档案' }),
        ],
        hasMore: true,
        nextCursor: 8,
        currentSequence: 10,
      }),
      jsonResponse({
        changes: [
          change(9, 'bazi_case', 'p-1', 9, { id: 'p-1', title: '一v2' }),
          change(10, 'bazi_case', 'p-3', 10, null, 1),
        ],
        hasMore: false,
        nextCursor: 10,
        currentSequence: 10,
      }),
    ];
    let pageCall = 0;
    const fetchMock = stubFetch(async (url) => {
      if (pathOf(url) === '/sync/pull') {
        const page = pages[pageCall];
        pageCall += 1;
        if (!page) throw new Error('pull 页数超出预期');
        return page;
      }
      return emptySyncPage();
    });

    const result = await syncNow();

    expect(result).toMatchObject({ status: 'ok', pushed: 0, pulled: 5, conflicts: 0 });
    expect(pageCall).toBe(2); // 恰好两页，不多不少
    // 不丢：5 条 change 全部落库
    expect(await localPrivateStore.get('bazi_case', 'p-1')).toMatchObject({
      payload: { id: 'p-1', title: '一v2' }, // 后到的覆盖先到的（不重）
    });
    expect(await localPrivateStore.get('bazi_case', 'p-2')).toMatchObject({
      payload: { id: 'p-2', title: '二' },
    });
    expect(await localPrivateStore.get('profile', 'profile')).toMatchObject({
      payload: { id: 'profile', name: '远端档案' },
    });
    // tombstone 生效
    expect(await localPrivateStore.get('bazi_case', 'p-3')).toBeNull();
    // pull 落库后同步更新镜像
    expect(await localPrivateStore.getSyncVersion('bazi_case', 'p-1')).toBe(9);
    // 游标推进到末页最后一条已落库的 sequence
    expect((await loadCloudSyncState())?.lastPulledSequence).toBe(10);
    expect(fetchMock).toHaveBeenCalledTimes(2); // 游标非空跳过 bootstrap，空队列跳过 push，仅两页 pull
  });

  it('落库失败时游标不前进，错误写入状态', async () => {
    await configure();
    await saveCloudSyncState({
      deviceId: 'device-1',
      workerUrl: WORKER_URL,
      workspaceId: 'test-workspace',
      lastPulledSequence: 5,
      lastSyncAt: null,
      lastSyncError: null,
    });
    const fetchMock = stubFetch(async (url) => {
      if (pathOf(url) === '/sync/pull') {
        return jsonResponse({
          changes: [change(6, 'bazi_case', 'p-1', 6, { id: 'p-1', title: '一' })],
          hasMore: false,
          currentSequence: 6,
        });
      }
      return emptySyncPage();
    });
    const putSpy = vi.spyOn(localPrivateStore, 'put').mockRejectedValueOnce(new Error('落盘失败'));

    await expect(syncNow()).rejects.toThrow('落盘失败');

    const state = await loadCloudSyncState();
    expect(state?.lastPulledSequence).toBe(5); // 游标不前进
    expect(state?.lastSyncError).toBe('落盘失败');
    expect(fetchMock).toHaveBeenCalledTimes(1); // 仅 pull（空队列不发 push）
    putSpy.mockRestore();
  });

  it('401 立即失败不重试，暴露 UNAUTHORIZED 错误码', async () => {
    const fetchMock = stubFetch(() =>
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: '鉴权失败' } }, 401),
    );
    await configure();
    await localPrivateStore.put('bazi_case', { title: '甲' }, 'case-1');

    const error = await syncNow().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CloudSyncHttpError);
    expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(error).toHaveProperty('message', '鉴权失败：请检查同步密钥');
    expect(fetchMock).toHaveBeenCalledTimes(1); // 不无限重试
    expect(await localPrivateStore.countOutbox()).toBe(1); // 队列保留待用户处理后重试
  });

  it('409 冲突：案例类保留两份，本机内容另存冲突副本，远端版本经 pull 落库', async () => {
    await configure();
    await localPrivateStore.put('bazi_case', { title: '本地修改' }, 'cf-1');

    let pushCall = 0;
    const fetchMock = stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/push') {
        pushCall += 1;
        const body = parsePushBody(init);
        if (pushCall === 1) {
          // 首次推送全部冲突
          return jsonResponse(
            {
              error: { code: 'CONFLICT', message: '版本冲突' },
              results: [],
              conflicts: body.mutations.map((mutation) => ({
                mutationId: mutation.mutationId,
                type: mutation.type,
                recordId: mutation.recordId,
                serverVersion: 5,
                deleted: 0,
                payload: { id: 'cf-1', title: '远端内容' },
              })),
            },
            409,
          );
        }
        // 冲突副本（新记录）第二次推送成功
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 6,
          })),
        });
      }
      if (pathOf(url) === '/sync/pull') {
        return jsonResponse({
          changes: [change(6, 'bazi_case', 'cf-1', 5, { id: 'cf-1', title: '远端内容' })],
          hasMore: false,
          currentSequence: 6,
        });
      }
      return emptySyncPage();
    });

    const result = await syncNow();

    expect(result).toMatchObject({ status: 'ok', pushed: 1, pulled: 1, conflicts: 1 });
    // 原队列项已消费，冲突副本自身入队并已在第二轮推送成功
    expect(await localPrivateStore.countOutbox()).toBe(0);
    // 冲突副本：新记录、带标记、内容为本机修改
    const cases = await localPrivateStore.list('bazi_case');
    const copy = cases.find((record) => record.payload[CONFLICT_COPY_FIELD] === 'cf-1');
    expect(copy).toBeTruthy();
    expect(copy?.payload.title).toBe('本地修改');
    // 原记录保留远端内容（pull 落库）
    expect(await localPrivateStore.get('bazi_case', 'cf-1')).toMatchObject({
      payload: { id: 'cf-1', title: '远端内容' },
    });
    expect(await localPrivateStore.getSyncVersion('bazi_case', 'cf-1')).toBe(5);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('409 冲突：LWW 类型放弃本地修改，pull 阶段拉回远端版本', async () => {
    await configure();
    await localPrivateStore.put('profile', { name: '本地名字' }, 'profile');

    const fetchMock = stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        return jsonResponse(
          {
            error: { code: 'CONFLICT', message: '版本冲突' },
            results: [],
            conflicts: body.mutations.map((mutation) => ({
              mutationId: mutation.mutationId,
              type: mutation.type,
              recordId: mutation.recordId,
              serverVersion: 5,
              deleted: 0,
              payload: { id: 'profile', name: '远端名字' },
            })),
          },
          409,
        );
      }
      if (pathOf(url) === '/sync/pull') {
        return jsonResponse({
          changes: [change(6, 'profile', 'profile', 5, { id: 'profile', name: '远端名字' })],
          hasMore: false,
          currentSequence: 6,
        });
      }
      return emptySyncPage();
    });

    const result = await syncNow();

    expect(result).toMatchObject({ status: 'ok', conflicts: 1 });
    // 本地修改被放弃，落库为远端版本
    expect(await localPrivateStore.get('profile', 'profile')).toMatchObject({
      payload: { id: 'profile', name: '远端名字' },
    });
    expect(await localPrivateStore.getSyncVersion('profile', 'profile')).toBe(5);
    expect(await localPrivateStore.countOutbox()).toBe(0);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('首次同步走 bootstrap，游标设为返回的最大 sequence', async () => {
    const fetchMock = stubFetch(async (url) => {
      if (pathOf(url) === '/sync/bootstrap') {
        return jsonResponse({
          records: [
            { type: 'bazi_case', recordId: 'bs-1', payload: { id: 'bs-1', title: '初始案例' }, serverVersion: 3 },
          ],
          currentSequence: 9,
        });
      }
      return emptySyncPage();
    });
    await configure();

    const result = await syncNow();

    expect(result).toMatchObject({ status: 'ok', pulled: 1 });
    expect(await localPrivateStore.get('bazi_case', 'bs-1')).toMatchObject({
      payload: { id: 'bs-1', title: '初始案例' },
    });
    expect(await localPrivateStore.getSyncVersion('bazi_case', 'bs-1')).toBe(3);
    expect((await loadCloudSyncState())?.lastPulledSequence).toBe(9);
    expect(fetchMock).toHaveBeenCalledTimes(2); // bootstrap + pull（空队列跳过 push）
  });

  it('首次同步：云端空工作区时本机既有历史全量推送', async () => {
    const fetchMock = stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/bootstrap') {
        return jsonResponse({ records: [], currentSequence: 0 });
      }
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 1,
          })),
        });
      }
      return emptySyncPage();
    });
    await configure();
    // 启用云同步之前就存在的历史记录（remoteOrigin 落库，不走写拦截入队）
    await localPrivateStore.put('bazi_case', { title: '历史一' }, 'his-1', undefined, { remoteOrigin: true });
    await localPrivateStore.put('qimen_case', { title: '历史二' }, 'his-2', undefined, { remoteOrigin: true });
    await localPrivateStore.put('profile', { name: '档案' }, 'profile', undefined, { remoteOrigin: true });
    // 启用后的一次新写操作（正常入队）
    await localPrivateStore.put('bazi_case', { title: '新案例' }, 'new-1');

    const result = await syncNow();

    // 历史 3 条 + 新变更 1 条，全部推送
    expect(result).toMatchObject({ status: 'ok', pushed: 4, pulled: 0, conflicts: 0 });
    const pushedIds: string[] = [];
    for (const call of fetchMock.mock.calls) {
      if (pathOf(String(call[0])) !== '/sync/push') continue;
      pushedIds.push(...parsePushBody(call[1]).mutations.map((mutation) => mutation.recordId));
    }
    expect(pushedIds.sort()).toEqual(['his-1', 'his-2', 'new-1', 'profile']);
    expect(await localPrivateStore.countOutbox()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3); // bootstrap + push + pull
  });

  it('新设备加入：云端记录拉取重建镜像，本机独有记录补推', async () => {
    const fetchMock = stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/bootstrap') {
        return jsonResponse({
          records: [
            { type: 'bazi_case', recordId: 'bs-1', payload: { id: 'bs-1', title: '云端案例' }, serverVersion: 3 },
          ],
          currentSequence: 9,
        });
      }
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 10,
          })),
        });
      }
      return emptySyncPage();
    });
    await configure();
    // 本机独有记录（从未同步到云端，remoteOrigin 落库不入队）
    await localPrivateStore.put('bazi_case', { title: '本机独有' }, 'his-1', undefined, { remoteOrigin: true });
    // 启用后的新写操作（正常入队）
    await localPrivateStore.put('bazi_case', { title: '新案例' }, 'new-1');

    const result = await syncNow();

    // 云端记录拉取 1 条；本机独有 2 条（his-1 补推 + new-1 新变更）推送
    expect(result).toMatchObject({ status: 'ok', pushed: 2, pulled: 1, conflicts: 0 });
    const pushedIds: string[] = [];
    for (const call of fetchMock.mock.calls) {
      if (pathOf(String(call[0])) !== '/sync/push') continue;
      pushedIds.push(...parsePushBody(call[1]).mutations.map((mutation) => mutation.recordId));
    }
    expect(pushedIds.sort()).toEqual(['his-1', 'new-1']);
    // 云端记录落库且镜像建立
    expect(await localPrivateStore.getSyncVersion('bazi_case', 'bs-1')).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3); // bootstrap + push + pull
  });

  it('pull 到远端变更后广播案例列表刷新事件', async () => {
    await configure();
    await saveCloudSyncState({
      deviceId: 'device-1',
      workerUrl: WORKER_URL,
      workspaceId: 'test-workspace',
      lastPulledSequence: 5,
      lastSyncAt: null,
      lastSyncError: null,
    });
    const dispatchMock = vi.fn();
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      dispatchEvent: dispatchMock,
    });
    stubFetch(async (url) => {
      if (pathOf(url) === '/sync/pull') {
        return jsonResponse({
          changes: [change(6, 'bazi_case', 'p-1', 6, { id: 'p-1', title: '一' })],
          hasMore: false,
          currentSequence: 6,
        });
      }
      return emptySyncPage();
    });

    const result = await syncNow();

    expect(result).toMatchObject({ status: 'ok', pulled: 1 });
    expect(dispatchMock).toHaveBeenCalledTimes(3);
    const eventNames = dispatchMock.mock.calls.map((call) => String((call[0] as CustomEvent).type));
    expect(eventNames).toEqual(expect.arrayContaining([
      BAZI_CASES_CHANGED_EVENT,
      QIMEN_CASES_CHANGED_EVENT,
      SANYUAN_CASES_CHANGED_EVENT,
    ]));
  });

  it('无远端变更（pulled 为 0）时不广播刷新事件', async () => {
    await configure();
    await saveCloudSyncState({
      deviceId: 'device-1',
      workerUrl: WORKER_URL,
      workspaceId: 'test-workspace',
      lastPulledSequence: 5,
      lastSyncAt: null,
      lastSyncError: null,
    });
    const dispatchMock = vi.fn();
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      dispatchEvent: dispatchMock,
    });
    stubFetch(() => emptySyncPage());

    const result = await syncNow();

    expect(result).toMatchObject({ status: 'ok', pulled: 0 });
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('对话历史写入口不自动入队，自动同步也不推送（仅手动触发）', async () => {
    await configure();
    await localPrivateStore.put(
      'ai_chat_session',
      { value: { id: 'session-1', updatedAt: 1, messages: [] } },
      'session-1',
    );
    // 写入口按 SYNC_MANUAL_TYPES 排除：日常对话不产生队列项
    expect(await localPrivateStore.countOutbox()).toBe(0);

    const fetchMock = stubFetch(() => emptySyncPage());
    const result = await syncNow();

    // 按需补推只扫 SYNCABLE_RECORD_TYPES，不含手动类型：本轮无 push 请求
    expect(result).toMatchObject({ status: 'ok', pushed: 0, pulled: 0 });
    expect(fetchMock.mock.calls.filter((call) => pathOf(String(call[0])) === '/sync/push')).toHaveLength(0);
  });

  it('手动同步：每会话一条记录逐条入队推送', async () => {
    await configure();
    await localPrivateStore.put(
      'ai_chat_session',
      { value: { id: 'session-1', updatedAt: 1, messages: [] } },
      'session-1',
    );
    await localPrivateStore.put(
      'ai_chat_session',
      { value: { id: 'session-2', updatedAt: 2, messages: [] } },
      'session-2',
    );
    const pushed: Array<{ type: string; recordId: string }> = [];
    stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        pushed.push(
          ...body.mutations.map((mutation) => ({ type: mutation.type, recordId: mutation.recordId })),
        );
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 1,
          })),
        });
      }
      return emptySyncPage();
    });

    const result = await syncChatSessionsNow();

    expect(result).toMatchObject({ status: 'ok', pushed: 2, pulled: 0 });
    expect(pushed).toEqual([
      { type: 'ai_chat_session', recordId: 'session-1' },
      { type: 'ai_chat_session', recordId: 'session-2' },
    ]);
    expect(await localPrivateStore.countOutbox()).toBe(0);
  });

  it('手动同步：本机已删的会话补 delete 墓碑（删除传播）', async () => {
    await configure();
    // 镜像存在但本机已无该会话：模拟本机删除后镜像残留
    await localPrivateStore.setSyncVersion('ai_chat_session', 'gone-1', 3);
    const pushed: Array<{ recordId: string; operation: string }> = [];
    stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        pushed.push(
          ...body.mutations.map((mutation) => ({
            recordId: mutation.recordId,
            operation: mutation.operation,
          })),
        );
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 4,
          })),
        });
      }
      return emptySyncPage();
    });

    const result = await syncChatSessionsNow();

    // 不发墓碑则 B 端下次拉取会把已删会话原样拉回来
    expect(result).toMatchObject({ status: 'ok', pushed: 1 });
    expect(pushed).toEqual([{ recordId: 'gone-1', operation: 'delete' }]);
  });

  it('拉回远端会话：落库并广播缓存失效事件', async () => {
    await configure();
    await saveCloudSyncState({
      deviceId: 'device-1',
      workerUrl: WORKER_URL,
      workspaceId: 'test-workspace',
      lastPulledSequence: 5,
      lastSyncAt: null,
      lastSyncError: null,
    });
    const dispatchMock = vi.fn();
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      dispatchEvent: dispatchMock,
    });
    stubFetch(async (url) => {
      if (pathOf(url) === '/sync/pull') {
        return jsonResponse({
          changes: [
            change(6, 'ai_chat_session', 'session-1', 6, {
              value: { id: 'session-1', updatedAt: 1, messages: [] },
            }),
          ],
          hasMore: false,
          currentSequence: 6,
        });
      }
      return emptySyncPage();
    });

    const result = await syncNow();

    expect(result).toMatchObject({ status: 'ok', pulled: 1 });
    const eventNames = dispatchMock.mock.calls.map((call) => String((call[0] as CustomEvent).type));
    expect(eventNames).toContain(AI_CHAT_SESSIONS_CHANGED_EVENT);
    expect(await localPrivateStore.get('ai_chat_session', 'session-1')).toBeTruthy();
  });

  it('会话 409 冲突：会话内消息合并（双方问答都保留）并重推', async () => {
    await configure();
    await localPrivateStore.put(
      'ai_chat_session',
      {
        value: {
          id: 'session-1',
          title: '本机标题',
          updatedAt: 5,
          messages: [{ id: 'm-local', timestamp: 2, role: 'user', content: '本机追问' }],
        },
      },
      'session-1',
    );

    let pushCall = 0;
    let resentBaseVersion: number | null | undefined;
    stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/push') {
        pushCall += 1;
        const body = parsePushBody(init);
        if (pushCall === 1) {
          return jsonResponse(
            {
              error: { code: 'CONFLICT', message: '版本冲突' },
              results: [],
              conflicts: body.mutations.map((mutation) => ({
                mutationId: mutation.mutationId,
                type: mutation.type,
                recordId: mutation.recordId,
                serverVersion: 3,
                deleted: 0,
                payload: {
                  value: {
                    id: 'session-1',
                    title: '远端标题',
                    updatedAt: 9,
                    messages: [{ id: 'm-remote', timestamp: 1, role: 'assistant', content: '远端回答' }],
                  },
                },
              })),
            },
            409,
          );
        }
        resentBaseVersion = body.mutations[0]?.baseVersion;
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 4,
          })),
        });
      }
      return emptySyncPage();
    });

    const result = await syncChatSessionsNow();

    expect(result).toMatchObject({ status: 'ok', pushed: 1, conflicts: 1 });
    expect(pushCall).toBe(2);
    // 重推前镜像已对齐到回执的 serverVersion，否则会再次 409
    expect(resentBaseVersion).toBe(3);
    expect(await localPrivateStore.countOutbox()).toBe(0);
    // 合并结果写回本机：双方消息按 timestamp 排序都在；元数据取 updatedAt 较新者（远端）
    const record = await localPrivateStore.get('ai_chat_session', 'session-1');
    const merged = (record?.payload as {
      value: { title: string; updatedAt: number; messages: Array<{ id: string }> };
    }).value;
    expect(merged.messages.map((message) => message.id)).toEqual(['m-remote', 'm-local']);
    expect(merged.title).toBe('远端标题');
    expect(merged.updatedAt).toBe(9);
  });

  it('push 按字节分批：大记录不与其他条目混批撞服务端总量上限', async () => {
    await configure();
    // 每条 ~800KB（旧实现只按 50 条分批，三条会合成一批 ~2.4MB 被服务端拒绝）
    const big = 'x'.repeat(800 * 1024);
    await localPrivateStore.put('bazi_case', { title: big }, 'big-1');
    await localPrivateStore.put('bazi_case', { title: big }, 'big-2');
    await localPrivateStore.put('bazi_case', { title: big }, 'big-3');
    const batchSizes: number[] = [];
    stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        batchSizes.push(body.mutations.length);
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 1,
          })),
        });
      }
      return emptySyncPage();
    });

    const result = await syncNow();

    expect(result).toMatchObject({ status: 'ok', pushed: 3 });
    // 两条成批（~1.6MB < 2MB 批上限），第三条另起一批
    expect(batchSizes).toEqual([2, 1]);
    expect(await localPrivateStore.countOutbox()).toBe(0);
  });

  it('增量同步：镜像存在的记录不重复补推', async () => {
    const fetchMock = stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        // 只有 outbox 里的新写操作（edit-1），已同步记录（synced-1）不得出现
        expect(body.mutations.map((mutation) => mutation.recordId)).toEqual(['edit-1']);
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 2,
          })),
        });
      }
      return emptySyncPage();
    });
    await configure();
    await saveCloudSyncState({
      deviceId: 'device-1',
      workerUrl: WORKER_URL,
      workspaceId: 'test-workspace',
      lastPulledSequence: 1,
      lastSyncAt: null,
      lastSyncError: null,
    });
    // 已同步记录（镜像存在）
    await localPrivateStore.put('bazi_case', { title: '已同步' }, 'synced-1', undefined, { remoteOrigin: true });
    await localPrivateStore.setSyncVersion('bazi_case', 'synced-1', 1);
    // 新写操作（正常入队）
    await localPrivateStore.put('bazi_case', { title: '修改' }, 'edit-1');

    const result = await syncNow();

    expect(result).toMatchObject({ status: 'ok', pushed: 1, pulled: 0, conflicts: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2); // push + pull（游标非空跳过 bootstrap）
  });

  it('源设备：推送回声不计入拉取（提示只显示推送）', async () => {
    const fetchMock = stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 6,
          })),
        });
      }
      if (pathOf(url) === '/sync/pull') {
        // 回声：本机刚推送的删除进入服务端增量流
        return jsonResponse({
          changes: [change(6, 'bazi_case', 'echo-1', 6, null, 1)],
          hasMore: false,
          currentSequence: 6,
        });
      }
      return emptySyncPage();
    });
    await configure();
    await saveCloudSyncState({
      deviceId: 'device-1',
      workerUrl: WORKER_URL,
      workspaceId: 'test-workspace',
      lastPulledSequence: 5,
      lastSyncAt: null,
      lastSyncError: null,
    });
    // 本机删除一条案例（入队 delete）
    await localPrivateStore.remove('bazi_case', 'echo-1');

    const result = await syncNow();

    // 推送 1 条；pull 到的是本机回声，不计入拉取
    expect(result).toMatchObject({ status: 'ok', pushed: 1, pulled: 0, conflicts: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2); // push + pull（游标非空跳过 bootstrap）
    // 回声仍落库（幂等）且游标照常推进
    const state = await loadCloudSyncState();
    expect(state?.lastPulledSequence).toBe(6);
  });

  it('更换 Worker 地址后清空镜像并重新全量推送', async () => {
    const fetchMock = stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/bootstrap') {
        return jsonResponse({ records: [], currentSequence: 0 });
      }
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 1,
          })),
        });
      }
      return emptySyncPage();
    });
    // 旧工作区：同步成功过（游标与镜像均有值）
    await configure({ workerUrl: 'https://old.example.com' });
    await saveCloudSyncState({
      deviceId: 'device-1',
      workerUrl: 'https://old.example.com',
      workspaceId: 'test-workspace',
      lastPulledSequence: 5,
      lastSyncAt: null,
      lastSyncError: null,
    });
    await localPrivateStore.put('bazi_case', { title: '历史' }, 'his-1', undefined, { remoteOrigin: true });
    await localPrivateStore.setSyncVersion('bazi_case', 'his-1', 5);
    // 切换到新部署的 Worker
    await configure({ workerUrl: WORKER_URL });

    const result = await syncNow();

    // 镜像被清空：历史记录按新建（baseVersion null）重新全量推送
    expect(result).toMatchObject({ status: 'ok', pushed: 1, pulled: 0, conflicts: 0 });
    expect(await localPrivateStore.getSyncVersion('bazi_case', 'his-1')).toBe(1);
    const state = await loadCloudSyncState();
    expect(state?.workerUrl).toBe(WORKER_URL);
    expect(state?.lastPulledSequence).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3); // bootstrap + push + pull
  });

  it('旧版本状态无身份记录时补记身份并重置游标（本地调试残留场景）', async () => {
    const fetchMock = stubFetch(async (url, init) => {
      if (pathOf(url) === '/sync/bootstrap') {
        return jsonResponse({ records: [], currentSequence: 0 });
      }
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 1,
          })),
        });
      }
      return emptySyncPage();
    });
    // 旧版本同步留下的状态：无身份记录、游标为 0、镜像为空
    await saveCloudSyncState({
      deviceId: 'device-1',
      lastPulledSequence: 0,
      lastSyncAt: '2026-10-15T16:07:00.000Z',
      lastSyncError: null,
    });
    // 本机既有历史（本地调试时写入的记录，镜像为空）
    await localPrivateStore.put('bazi_case', { title: '历史一' }, 'his-1', undefined, { remoteOrigin: true });
    await localPrivateStore.put('qimen_case', { title: '历史二' }, 'his-2', undefined, { remoteOrigin: true });
    await configure();

    const result = await syncNow();

    // 游标被重置为首次同步：镜像缺失的历史全部补推上云
    expect(result).toMatchObject({ status: 'ok', pushed: 2, pulled: 0, conflicts: 0 });
    const state = await loadCloudSyncState();
    expect(state?.workerUrl).toBe(WORKER_URL);
    expect(state?.workspaceId).toBe('test-workspace');
    expect(state?.lastPulledSequence).toBe(0);
    expect(await localPrivateStore.getSyncVersion('bazi_case', 'his-1')).toBe(1);
    expect(await localPrivateStore.getSyncVersion('qimen_case', 'his-2')).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3); // bootstrap + push + pull
  });

  it('testConnection 校验连通性、鉴权与工作区可读', async () => {
    const fetchMock = stubFetch(async (url) => {
      if (pathOf(url) === '/health') return jsonResponse({ service: 'orbis-cloud-sync', version: '1.0.0' });
      if (pathOf(url) === '/sync/bootstrap') return jsonResponse({ records: [], currentSequence: 0 });
      throw new Error(`未预期的请求：${url}`);
    });
    await configure();

    await expect(testConnection()).resolves.toEqual({ service: 'orbis-cloud-sync', version: '1.0.0' });

    // 鉴权失败：bootstrap 返回 401
    vi.stubGlobal('fetch', vi.fn(async () =>
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: '鉴权失败' } }, 401)));
    await expect(testConnection()).rejects.toThrow('鉴权失败：请检查同步密钥');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('testConnection 拒绝非 HTTPS 的 Worker 地址（localhost 除外）', async () => {
    stubFetch(async (url) => {
      if (pathOf(url) === '/health') return jsonResponse({ service: 'orbis-cloud-sync', version: '1.0.0' });
      if (pathOf(url) === '/sync/bootstrap') return jsonResponse({ records: [], currentSequence: 0 });
      throw new Error(`未预期的请求：${url}`);
    });
    await configure({ workerUrl: 'http://sync.example.com' });
    await expect(testConnection()).rejects.toThrow('Worker 地址必须为 HTTPS');
    await configure({ workerUrl: 'http://localhost:8787' });
    await expect(testConnection()).resolves.toEqual({ service: 'orbis-cloud-sync', version: '1.0.0' });
  });

  it('防重入：同步进行期间再次调用直接返回 skipped', async () => {
    let released = false;
    const resolvers: Array<(response: Response) => void> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            if (released) resolve(emptySyncPage());
            else resolvers.push(() => resolve(emptySyncPage()));
          }),
      ),
    );
    await configure();

    const first = syncNow();
    const second = await syncNow();

    expect(second).toEqual({ status: 'skipped', pushed: 0, pulled: 0, conflicts: 0 });
    released = true;
    for (const resolve of resolvers) resolve(emptySyncPage());
    await expect(first).resolves.toMatchObject({ status: 'ok' });
  });

  it('未启用同步时 syncNow 直接返回 disabled，不产生网络请求', async () => {
    const fetchMock = stubFetch(() => {
      throw new Error('不应发出请求');
    });
    await configure({ enabled: false });

    await expect(syncNow()).resolves.toEqual({ status: 'disabled', pushed: 0, pulled: 0, conflicts: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('getStatus 汇总配置、状态与待推送数量', async () => {
    await configure();
    await saveCloudSyncState({
      deviceId: 'device-1',
      lastPulledSequence: 5,
      lastSyncAt: '2026-10-15T00:00:00.000Z',
      lastSyncError: null,
    });
    await localPrivateStore.put('bazi_case', { title: '甲' }, 'case-1');

    const status = await getStatus();

    expect(status).toEqual({
      configured: true,
      enabled: true,
      deviceId: 'device-1',
      lastPulledSequence: 5,
      lastSyncAt: '2026-10-15T00:00:00.000Z',
      lastSyncError: null,
      pendingCount: 1,
    });
  });
});

describe('自动调度门控（syncNowAuto，T08）', () => {
  beforeEach(async () => {
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.stubGlobal('indexedDB', undefined);
    await resetEnvironment();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** 成功的 push/pull 回执（echo 模式） */
  const stubSuccessFetch = () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (pathOf(url) === '/sync/push') {
        const body = parsePushBody(init);
        return jsonResponse({
          results: body.mutations.map((mutation) => ({
            mutationId: mutation.mutationId,
            status: 'applied',
            serverVersion: 1,
          })),
        });
      }
      return emptySyncPage();
    }));
  };

  it('401 后自动同步暂停且不产生网络请求，手动同步成功后恢复', async () => {
    await configure();
    await localPrivateStore.put('bazi_case', { title: '甲' }, 'case-1');

    // 制造一次 401
    vi.stubGlobal('fetch', vi.fn(async () =>
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: '鉴权失败' } }, 401)));
    await expect(syncNow()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    // 自动触发被跳过：不产生任何网络请求
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await syncNowAuto()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    // 用户修正密钥后手动同步成功（界面「立即同步」走 syncNow，不过门控）→ 自动调度恢复
    stubSuccessFetch();
    await expect(syncNow()).resolves.toMatchObject({ status: 'ok' });
    // 成功后状态已重置：后续自动触发正常执行
    await expect(syncNowAuto()).resolves.toMatchObject({ status: 'ok' });
  });

  it('失败退避窗口内自动触发被跳过', async () => {
    await configure();
    await localPrivateStore.put('bazi_case', { title: '甲' }, 'case-1');

    // 先驱动一次成功，清零失败状态
    stubSuccessFetch();
    await expect(syncNow()).resolves.toMatchObject({ status: 'ok' });

    // 制造一次失败（400 立即失败，不走重试等待）
    vi.stubGlobal('fetch', vi.fn(async () =>
      jsonResponse({ error: { code: 'INVALID_REQUEST', message: '请求非法' } }, 400)));
    await expect(syncNow()).rejects.toMatchObject({ status: 400 });

    // 退避窗口内：自动触发跳过，不产生网络请求
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await syncNowAuto()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('连续失败达上限后暂停自动同步，手动成功后恢复', async () => {
    await configure();
    await localPrivateStore.put('bazi_case', { title: '甲' }, 'case-1');

    // 连续失败达上限（400 立即失败，快速驱动）
    vi.stubGlobal('fetch', vi.fn(async () =>
      jsonResponse({ error: { code: 'INVALID_REQUEST', message: '请求非法' } }, 400)));
    for (let i = 0; i < AUTO_SYNC_MAX_FAILURES; i += 1) {
      await expect(syncNow()).rejects.toMatchObject({ status: 400 });
    }

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await syncNowAuto()).toBeNull(); // 已暂停
    expect(fetchMock).not.toHaveBeenCalled();

    // 手动同步成功后自动恢复（syncNow 不过门控）
    stubSuccessFetch();
    await expect(syncNow()).resolves.toMatchObject({ status: 'ok' });
    await expect(syncNowAuto()).resolves.toMatchObject({ status: 'ok' });
  });
});
