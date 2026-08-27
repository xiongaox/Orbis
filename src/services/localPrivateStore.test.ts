import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

import { localPrivateStore } from './localPrivateStore';

describe('本地私有数据备份', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('indexedDB', undefined);
  });

  it('导出并恢复 WebDAV 配置', async () => {
    const userId = `backup-user-${Date.now()}`;
    await localPrivateStore.put(userId, 'webdav_config', { endpoint: 'https://dav.example.com', password: 'secret' }, `${userId}:webdav_config`);
    await localPrivateStore.put(userId, 'bazi_case', { title: '应被导出的案例' }, `${userId}:case`);

    const snapshot = await localPrivateStore.snapshot();
    expect(snapshot.records.some((record) => record.type === 'webdav_config')).toBe(true);
    expect(snapshot.records.some((record) => record.id === `${userId}:case`)).toBe(true);

    await localPrivateStore.restore({
      schemaVersion: 1,
      exportedAt: '2026-08-26T00:00:00.000Z',
      records: [{
        id: `${userId}:restored-config`,
        userId,
        type: 'webdav_config',
        payload: { endpoint: 'https://dav.example.com', password: 'secret' },
        createdAt: '2026-08-26T00:00:00.000Z',
        updatedAt: '2026-08-26T00:00:00.000Z',
      }],
    });

    await expect(localPrivateStore.get(userId, 'webdav_config', `${userId}:restored-config`)).resolves.toMatchObject({
      payload: { endpoint: 'https://dav.example.com', password: 'secret' },
    });
  });
});
