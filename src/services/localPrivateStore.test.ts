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

  // 恢复语义为覆盖同步：本机有、备份没有的记录被删除，恢复结果与备份一致
  it('同步恢复删除备份之外的本机案例，但保留设备本地配置', async () => {
    // 前面用例写过 bazi_case，先清空保证删除计数不受测试间状态影响
    await localPrivateStore.clear('bazi_case');
    await localPrivateStore.put('bazi_case', { title: '备份里的案例' }, 'keep-1');
    await localPrivateStore.put('bazi_case', { title: '本机多余的案例' }, 'extra-1');
    await localPrivateStore.put('webdav_config', { endpoint: 'https://dav.example.com' }, 'webdav_config');

    const { removedRecordsCount } = await localPrivateStore.restore({
      schemaVersion: 2,
      exportedAt: '2026-08-26T00:00:00.000Z',
      records: [{
        id: 'keep-1',
        type: 'bazi_case',
        payload: { title: '备份里的案例' },
        createdAt: '2026-08-26T00:00:00.000Z',
        updatedAt: '2026-08-26T00:00:00.000Z',
      }],
    }, { syncTypes: ['bazi_case', 'webdav_config'] });

    expect(removedRecordsCount).toBe(1);
    await expect(localPrivateStore.get('bazi_case', 'extra-1')).resolves.toBeNull();
    await expect(localPrivateStore.get('bazi_case', 'keep-1')).resolves.not.toBeNull();
    // 备份凭据不进备份包，覆盖同步也不能删
    await expect(localPrivateStore.get('webdav_config', 'webdav_config')).resolves.not.toBeNull();
  });
});
