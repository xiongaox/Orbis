import { describe, expect, it } from 'vitest';
import worker, { type Env } from './index';

const env: Env = { DB: null as unknown as Env['DB'], SYNC_TOKEN: 'test-token' };

describe('GET /health', () => {
  it('返回服务名、版本与状态', async () => {
    const response = await worker.fetch(new Request('https://sync.example.com/health'), env);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { service: string; version: string; status: string };
    expect(body).toMatchObject({ service: 'orbis-cloud-sync', status: 'ok' });
    expect(typeof body.version).toBe('string');
  });

  it('非 GET 方法返回 405', async () => {
    const response = await worker.fetch(
      new Request('https://sync.example.com/health', { method: 'POST' }),
      env,
    );
    expect(response.status).toBe(405);
  });
});

describe('未知路由', () => {
  it('返回 404 与统一错误结构', async () => {
    const response = await worker.fetch(new Request('https://sync.example.com/nope'), env);
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('NOT_FOUND');
    expect(typeof body.error.message).toBe('string');
  });
});
