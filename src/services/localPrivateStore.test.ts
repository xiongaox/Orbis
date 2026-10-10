import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

import { localPrivateStore, type PrivateRecordType } from './localPrivateStore';

describe('本地私有数据备份', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('indexedDB', undefined);
  });

  it('导出并恢复 WebDAV 配置', async () => {
    await localPrivateStore.put('webdav_config', { endpoint: 'https://dav.example.com', password: 'secret' }, 'webdav_config');
    await localPrivateStore.put('bazi_case', { title: '应被导出的案例' }, 'case');

    const snapshot = await localPrivateStore.snapshot();
    expect(snapshot.records.some((record) => record.type === 'webdav_config')).toBe(true);
    expect(snapshot.records.some((record) => record.id === 'case')).toBe(true);

    await localPrivateStore.restore({
      schemaVersion: 1,
      exportedAt: '2026-08-26T00:00:00.000Z',
      records: [{
        id: 'legacy-user:restored-config',
        userId: 'legacy-user',
        type: 'webdav_config',
        payload: { endpoint: 'https://dav.example.com', password: 'secret' },
        createdAt: '2026-08-26T00:00:00.000Z',
        updatedAt: '2026-08-26T00:00:00.000Z',
      }],
    });

    await expect(localPrivateStore.get('webdav_config', 'webdav_config')).resolves.toMatchObject({
      payload: { endpoint: 'https://dav.example.com', password: 'secret' },
    });
  });

  // 曾因快照按手写类型清单逐类查询，新增术数的案例不进备份包（线上表现为备份缺案例）
  it('快照包含未登记在旧类型清单中的新术数案例', async () => {
    await localPrivateStore.put('liuyao_case' as PrivateRecordType, { title: '六爻案例' }, 'ly-1');

    const snapshot = await localPrivateStore.snapshot();
    expect(snapshot.records.some((record) => record.id === 'ly-1')).toBe(true);
  });
});
