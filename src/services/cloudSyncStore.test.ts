import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

import { localPrivateStore } from './localPrivateStore';
import {
  getOrCreateDeviceId,
  loadCloudSyncConfig,
  loadCloudSyncState,
  saveCloudSyncConfig,
  saveCloudSyncState,
} from './cloudSyncStore';

describe('云同步元数据（cloudSyncStore，T04）', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('indexedDB', undefined);
  });

  it('配置存取往返', async () => {
    expect(await loadCloudSyncConfig()).toBeNull();
    const config = {
      enabled: true,
      workerUrl: 'https://sync.example.com',
      syncToken: 'token',
      workspaceId: 'xiongaox',
    };
    await saveCloudSyncConfig(config);
    expect(await loadCloudSyncConfig()).toEqual(config);
  });

  it('状态存取往返', async () => {
    expect(await loadCloudSyncState()).toBeNull();
    const state = {
      deviceId: 'device-1',
      lastPulledSequence: 12,
      lastSyncAt: '2026-10-15T00:00:00.000Z',
      lastSyncError: null,
    };
    await saveCloudSyncState(state);
    expect(await loadCloudSyncState()).toEqual(state);
  });

  it('deviceId 首次生成并持久化，之后固定', async () => {
    // 清掉前面用例写入的状态，模拟全新设备
    await localPrivateStore.remove('cloud_sync_state', 'cloud_sync_state');
    const first = await getOrCreateDeviceId();
    expect(first).toBeTruthy();
    const second = await getOrCreateDeviceId();
    expect(second).toBe(first);
    const state = await loadCloudSyncState();
    expect(state?.deviceId).toBe(first);
    expect(state?.lastPulledSequence).toBeNull();
    expect(state?.lastSyncAt).toBeNull();
  });
});
