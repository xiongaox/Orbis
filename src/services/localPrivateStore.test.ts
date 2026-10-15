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

  // 回归：备份记录的 updatedAt 由各设备本地时钟生成，跨设备比较不可靠 ——
  // 手机时钟偏慢时「本机较新」恒成立，早期实现据此跳过写入，整包备份被静默丢弃而界面仍报成功。
  it('备份记录时间戳早于本机时仍覆盖写入，不按 updatedAt 跳过', async () => {
    await localPrivateStore.clear('bazi_case');
    await localPrivateStore.put('bazi_case', { title: '本机较新' }, 'case-1');

    const { writtenRecordsCount } = await localPrivateStore.restore({
      schemaVersion: 2,
      exportedAt: '2026-08-26T00:00:00.000Z',
      records: [{
        id: 'case-1',
        type: 'bazi_case',
        payload: { title: '备份里的旧时间戳' },
        createdAt: '2026-08-26T00:00:00.000Z',
        updatedAt: '2026-08-26T00:00:00.000Z',
      }],
    }, { syncTypes: ['bazi_case'] });

    expect(writtenRecordsCount).toBe(1);
    await expect(localPrivateStore.get('bazi_case', 'case-1')).resolves.toMatchObject({
      payload: { title: '备份里的旧时间戳' },
    });
  });
});

describe('云同步元数据（设备本地，T04）', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('indexedDB', undefined);
  });

  // 快照不含同步元数据（含版本镜像与 outbox）；既有设备本地配置仍进快照（既有断言保持）
  it('快照不含云同步元数据，但含普通案例与既有设备本地配置', async () => {
    await localPrivateStore.put('bazi_case', { title: '应被导出的案例' }, 'snap-case-1');
    await localPrivateStore.put('webdav_config', { endpoint: 'https://dav.example.com' }, 'webdav_config');
    await localPrivateStore.put('cloud_sync_config', {
      enabled: true, workerUrl: 'https://sync.example.com', syncToken: 'secret', workspaceId: 'xiongaox',
    }, 'cloud_sync_config');
    await localPrivateStore.put('cloud_sync_state', {
      deviceId: 'device-1', lastPulledSequence: 0, lastSyncAt: null, lastSyncError: null,
    }, 'cloud_sync_state');
    await localPrivateStore.setSyncVersion('bazi_case', 'snap-case-1', 3);
    await localPrivateStore.enqueueOutbox({
      mutationId: 'snap-m-1', type: 'bazi_case', recordId: 'snap-case-1',
      operation: 'upsert', payload: { id: 'snap-case-1' }, baseVersion: 2,
    });

    const snapshot = await localPrivateStore.snapshot();
    const types = snapshot.records.map((record) => record.type);
    expect(types).toContain('bazi_case');
    expect(types).toContain('webdav_config');
    expect(types).not.toContain('cloud_sync_config');
    expect(types).not.toContain('cloud_sync_state');
  });

  // 恢复为覆盖同步：云同步元数据是设备本地状态，恢复既不覆盖也不删除
  // （快照本不含它们；此处防御外部手工构造的备份包混入）
  it('恢复备份不覆盖、不同步元数据', async () => {
    await localPrivateStore.put('cloud_sync_config', {
      enabled: true, workerUrl: 'https://sync.example.com', syncToken: 'local-secret', workspaceId: 'xiongaox',
    }, 'cloud_sync_config');

    await localPrivateStore.restore({
      schemaVersion: 2,
      exportedAt: '2026-08-26T00:00:00.000Z',
      records: [{
        id: 'cloud_sync_config',
        type: 'cloud_sync_config',
        payload: { enabled: true, workerUrl: 'https://evil.example.com', syncToken: 'evil', workspaceId: 'other' },
        createdAt: '2026-08-26T00:00:00.000Z',
        updatedAt: '2026-08-26T00:00:00.000Z',
      }],
    }, { syncTypes: ['cloud_sync_config'] });

    const record = await localPrivateStore.get('cloud_sync_config', 'cloud_sync_config');
    expect(record?.payload).toMatchObject({ syncToken: 'local-secret', workspaceId: 'xiongaox' });
  });

  it('cloud_sync_versions 镜像读写与按类型批量读取', async () => {
    expect(await localPrivateStore.getSyncVersion('bazi_case', 'ver-case-1')).toBeNull();
    await localPrivateStore.setSyncVersion('bazi_case', 'ver-case-1', 2);
    await localPrivateStore.setSyncVersion('bazi_case', 'ver-case-2', 5);
    await localPrivateStore.setSyncVersion('qimen_case', 'ver-case-1', 3);

    expect(await localPrivateStore.getSyncVersion('bazi_case', 'ver-case-1')).toBe(2);
    // 覆盖写
    await localPrivateStore.setSyncVersion('bazi_case', 'ver-case-1', 4);
    expect(await localPrivateStore.getSyncVersion('bazi_case', 'ver-case-1')).toBe(4);

    const bazi = await localPrivateStore.listSyncVersions('bazi_case');
    expect(bazi).toEqual(expect.arrayContaining([
      { recordType: 'bazi_case', recordId: 'ver-case-1', serverVersion: 4 },
      { recordType: 'bazi_case', recordId: 'ver-case-2', serverVersion: 5 },
    ]));
    expect(bazi).not.toContainEqual({ recordType: 'qimen_case', recordId: 'ver-case-1', serverVersion: 3 });

    // 跨用例共享内存状态：只断言本用例写入的镜像条目
    const all = await localPrivateStore.listSyncVersions();
    const mine = all.filter((entry) => ['ver-case-1', 'ver-case-2'].includes(entry.recordId));
    expect(mine).toHaveLength(3);
  });

  it('outbox：入队、批量取、按 mutationId 删除、清空、计数', async () => {
    await localPrivateStore.clearOutbox();
    expect(await localPrivateStore.countOutbox()).toBe(0);
    await localPrivateStore.enqueueOutbox({
      mutationId: 'box-m-1', type: 'bazi_case', recordId: 'box-case-1',
      operation: 'upsert', payload: { id: 'box-case-1' }, baseVersion: null,
    });
    await localPrivateStore.enqueueOutbox({
      mutationId: 'box-m-2', type: 'bazi_case', recordId: 'box-case-2',
      operation: 'delete', baseVersion: 1,
    });

    expect(await localPrivateStore.countOutbox()).toBe(2);
    const entries = await localPrivateStore.listOutbox();
    expect(entries.map((entry) => entry.mutationId)).toEqual(['box-m-1', 'box-m-2']);
    expect(entries[0].payload).toEqual({ id: 'box-case-1' });
    expect(entries[1].payload).toBeUndefined();

    await localPrivateStore.removeOutboxEntry('box-m-1');
    expect(await localPrivateStore.countOutbox()).toBe(1);

    await localPrivateStore.clearOutbox();
    expect(await localPrivateStore.countOutbox()).toBe(0);
    expect(await localPrivateStore.listOutbox()).toEqual([]);
  });

  it('outbox 入队幂等：同一 mutationId 重复入队不产生重复项', async () => {
    await localPrivateStore.clearOutbox();
    const entry = {
      mutationId: 'box-m-dup', type: 'bazi_case', recordId: 'box-case-dup',
      operation: 'upsert' as const, payload: { id: 'box-case-dup' }, baseVersion: null,
    };
    await localPrivateStore.enqueueOutbox(entry);
    await localPrivateStore.enqueueOutbox(entry);
    expect(await localPrivateStore.countOutbox()).toBe(1);
    await localPrivateStore.clearOutbox();
  });

  it('schema 升级（v3）后既有记录不变：快照恢复往返', async () => {
    await localPrivateStore.clear('bazi_case');
    await localPrivateStore.put('bazi_case', { title: '升级前案例' }, 'legacy-1');
    const snapshot = await localPrivateStore.snapshot();
    expect(snapshot.schemaVersion).toBe(3);
    const recordCount = snapshot.records.length;

    await localPrivateStore.clear('bazi_case');
    const { writtenRecordsCount } = await localPrivateStore.restore(snapshot, { syncTypes: ['bazi_case'] });
    expect(writtenRecordsCount).toBe(recordCount);
    await expect(localPrivateStore.get('bazi_case', 'legacy-1')).resolves.toMatchObject({
      payload: { title: '升级前案例' },
    });
  });

  it('恢复接受 v1/v2 旧格式快照（老备份平滑兼容）', async () => {
    const { writtenRecordsCount } = await localPrivateStore.restore({
      schemaVersion: 2,
      exportedAt: '2026-08-26T00:00:00.000Z',
      records: [{
        id: 'old-1', type: 'bazi_case', payload: { title: '旧版备份' },
        createdAt: '2026-08-26T00:00:00.000Z', updatedAt: '2026-08-26T00:00:00.000Z',
      }],
    });
    expect(writtenRecordsCount).toBe(1);
  });
});
