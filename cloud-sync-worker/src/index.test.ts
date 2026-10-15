import { describe, expect, it } from 'vitest';
import worker from './index';
import type { Env } from './env';

const TOKEN = 'test-token';
const env: Env = { DB: null as unknown as Env['DB'], SYNC_TOKEN: TOKEN };

const authHeaders = { Authorization: `Bearer ${TOKEN}` };
const jsonHeaders = { 'Content-Type': 'application/json', ...authHeaders };

function jsonRequest(path: string, init: Omit<RequestInit, 'body'> & { body?: unknown }): Request {
  const { body, ...rest } = init;
  return new Request(`https://sync.example.com${path}`, {
    ...rest,
    headers: { ...jsonHeaders, ...(init.headers as Record<string, string> | undefined) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function errorBodyOf(response: Response): Promise<{ error: { code: string; message: string } }> {
  return response.json() as Promise<{ error: { code: string; message: string } }>;
}

const validMutation = {
  type: 'bazi_case',
  recordId: 'case-1',
  operation: 'upsert',
  payload: { id: 'case-1', name: '测试案例' },
  mutationId: 'mutation-1',
  baseVersion: null,
};

const validPush = {
  workspaceId: 'xiongaox',
  deviceId: 'device-1',
  mutations: [validMutation],
};

describe('鉴权（T02 子步骤 1）', () => {
  it('无 Token 访问 /health 返回 401 UNAUTHORIZED', async () => {
    const response = await worker.fetch(new Request('https://sync.example.com/health'), env);
    expect(response.status).toBe(401);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(typeof body.error.message).toBe('string');
  });

  it('错误 Token 返回 401', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/health', {
        headers: { Authorization: 'Bearer wrong-token' },
      }),
      env,
    );
    expect(response.status).toBe(401);
  });

  it('Authorization 头缺少 Bearer 前缀返回 401', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/health', { headers: { Authorization: TOKEN } }),
      env,
    );
    expect(response.status).toBe(401);
  });

  it('正确 Token 访问 /health 返回 200 与服务信息', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/health', { headers: authHeaders }),
      env,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      service: string;
      version: string;
      status: string;
    };
    expect(body).toMatchObject({ service: 'orbis-cloud-sync', status: 'ok' });
    expect(typeof body.version).toBe('string');
  });

  it('POST /health 返回 405', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/health', { method: 'POST', headers: authHeaders }),
      env,
    );
    expect(response.status).toBe(405);
  });
});

describe('POST /sync/push 输入边界（T02 子步骤 2/3/4）', () => {
  it('无 Token 返回 401（鉴权先于请求体解析）', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/sync/push', { method: 'POST', body: '{}' }),
      env,
    );
    expect(response.status).toBe(401);
  });

  it('合法请求通过全部输入校验，到达 T02 边界（501）', async () => {
    const response = await worker.fetch(
      jsonRequest('/sync/push', { method: 'POST', body: validPush }),
      env,
    );
    expect(response.status).toBe(501);
  });

  it('非法 JSON 返回 400 INVALID_JSON', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/sync/push', {
        method: 'POST',
        headers: jsonHeaders,
        body: '{oops',
      }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_JSON');
  });

  it('缺 workspaceId 返回 400 INVALID_WORKSPACE', async () => {
    const response = await worker.fetch(
      jsonRequest('/sync/push', {
        method: 'POST',
        body: { ...validPush, workspaceId: undefined },
      }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_WORKSPACE');
  });

  it('含空格的 workspaceId 返回 400 INVALID_WORKSPACE', async () => {
    const response = await worker.fetch(
      jsonRequest('/sync/push', {
        method: 'POST',
        body: { ...validPush, workspaceId: 'bad id!' },
      }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_WORKSPACE');
  });

  it('超长 workspaceId（65 字符）返回 400 INVALID_WORKSPACE', async () => {
    const response = await worker.fetch(
      jsonRequest('/sync/push', {
        method: 'POST',
        body: { ...validPush, workspaceId: 'x'.repeat(65) },
      }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_WORKSPACE');
  });

  it('排除类型（webdav_config）返回 400 INVALID_RECORD_TYPE', async () => {
    const response = await worker.fetch(
      jsonRequest('/sync/push', {
        method: 'POST',
        body: { ...validPush, mutations: [{ ...validMutation, type: 'webdav_config' }] },
      }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_RECORD_TYPE');
  });

  it('未知记录类型返回 400 INVALID_RECORD_TYPE', async () => {
    const response = await worker.fetch(
      jsonRequest('/sync/push', {
        method: 'POST',
        body: { ...validPush, mutations: [{ ...validMutation, type: 'unknown_type' }] },
      }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_RECORD_TYPE');
  });

  it('超批量（51 条）返回 413 BATCH_TOO_LARGE', async () => {
    const mutations = Array.from({ length: 51 }, (_, index) => ({
      ...validMutation,
      recordId: `case-${index}`,
      mutationId: `mutation-${index}`,
    }));
    const response = await worker.fetch(
      jsonRequest('/sync/push', { method: 'POST', body: { ...validPush, mutations } }),
      env,
    );
    expect(response.status).toBe(413);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('BATCH_TOO_LARGE');
  });

  it('恰好 50 条通过批量校验（到达 501）', async () => {
    const mutations = Array.from({ length: 50 }, (_, index) => ({
      ...validMutation,
      recordId: `case-${index}`,
      mutationId: `mutation-${index}`,
    }));
    const response = await worker.fetch(
      jsonRequest('/sync/push', { method: 'POST', body: { ...validPush, mutations } }),
      env,
    );
    expect(response.status).toBe(501);
  });

  it('超大 payload（> 256 KB）返回 413 PAYLOAD_TOO_LARGE', async () => {
    const hugePayload = { id: 'case-1', name: 'x'.repeat(256 * 1024 + 16) };
    const response = await worker.fetch(
      jsonRequest('/sync/push', {
        method: 'POST',
        body: { ...validPush, mutations: [{ ...validMutation, payload: hugePayload }] },
      }),
      env,
    );
    expect(response.status).toBe(413);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('单批总字节超限（50 条 × 20 KB）返回 413 BATCH_TOO_LARGE', async () => {
    const mutations = Array.from({ length: 50 }, (_, index) => ({
      ...validMutation,
      recordId: `case-${index}`,
      mutationId: `mutation-${index}`,
      payload: { id: `case-${index}`, name: 'x'.repeat(20 * 1024) },
    }));
    const response = await worker.fetch(
      jsonRequest('/sync/push', { method: 'POST', body: { ...validPush, mutations } }),
      env,
    );
    expect(response.status).toBe(413);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('BATCH_TOO_LARGE');
  });

  it('非法 operation 返回 400 INVALID_OPERATION', async () => {
    const response = await worker.fetch(
      jsonRequest('/sync/push', {
        method: 'POST',
        body: { ...validPush, mutations: [{ ...validMutation, operation: 'patch' }] },
      }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_OPERATION');
  });

  it('upsert 缺 payload 返回 400 INVALID_REQUEST', async () => {
    const response = await worker.fetch(
      jsonRequest('/sync/push', {
        method: 'POST',
        body: {
          ...validPush,
          mutations: [{ ...validMutation, payload: undefined }],
        },
      }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_REQUEST');
  });

  it('负数 baseVersion 返回 400 INVALID_REQUEST', async () => {
    const response = await worker.fetch(
      jsonRequest('/sync/push', {
        method: 'POST',
        body: { ...validPush, mutations: [{ ...validMutation, baseVersion: -1 }] },
      }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_REQUEST');
  });

  it('GET /sync/push 返回 405', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/sync/push', { headers: authHeaders }),
      env,
    );
    expect(response.status).toBe(405);
  });
});

describe('GET /sync/pull 与 /sync/bootstrap 输入边界', () => {
  it('pull 缺 workspaceId 返回 400 INVALID_WORKSPACE', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/sync/pull?after=0&limit=100', {
        headers: authHeaders,
      }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_WORKSPACE');
  });

  it('pull 非法 workspaceId 返回 400 INVALID_WORKSPACE', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/sync/pull?workspaceId=bad%20id&after=0', {
        headers: authHeaders,
      }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_WORKSPACE');
  });

  it('pull 合法请求到达 T02 边界（501）', async () => {
    const response = await worker.fetch(
      new Request(
        'https://sync.example.com/sync/pull?workspaceId=xiongaox&after=0&limit=100',
        { headers: authHeaders },
      ),
      env,
    );
    expect(response.status).toBe(501);
  });

  it('bootstrap 缺 workspaceId 返回 400 INVALID_WORKSPACE', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/sync/bootstrap', { headers: authHeaders }),
      env,
    );
    expect(response.status).toBe(400);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('INVALID_WORKSPACE');
  });

  it('bootstrap 合法请求到达 T02 边界（501）', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/sync/bootstrap?workspaceId=xiongaox', {
        headers: authHeaders,
      }),
      env,
    );
    expect(response.status).toBe(501);
  });
});

describe('路由兜底', () => {
  it('未知路由返回 404 NOT_FOUND', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/unknown-route', { headers: authHeaders }),
      env,
    );
    expect(response.status).toBe(404);
    const body = await errorBodyOf(response);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
