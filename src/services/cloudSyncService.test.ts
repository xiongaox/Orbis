import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }));

import { localPrivateStore } from './localPrivateStore';
import {
  loadCloudSyncState,
  saveCloudSyncConfig,
  saveCloudSyncState,
} from './cloudSyncStore';
import {
  CloudSyncHttpError,
  CONFLICT_COPY_FIELD,
  getStatus,
  syncNow,
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
      lastPulledSequence: 5,
      lastSyncAt: null,
      lastSyncError: null,
    });
    // 预置一条记录（remoteOrigin 不入队），验证 tombstone 删除
    await localPrivateStore.put('bazi_case', { title: '三' }, 'p-3', undefined, { remoteOrigin: true });

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
