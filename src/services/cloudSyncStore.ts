/**
 * 云同步元数据（实施方案 §4.4）：设备本地的同步配置、同步状态与设备标识。
 *
 * 四类同步元数据（cloud_sync_config / cloud_sync_state / cloud_sync_outbox /
 * cloud_sync_versions）一律不进备份包、不参与恢复：config 与 state 存于
 * private_records 但被 snapshot() 与备份打包层排除（设备本地语义）；
 * outbox 与 versions 为 localPrivateStore 内的独立表 / 独立 IDB store。
 *
 * 安全约束（实施方案 §5）：同步密钥等价于整个工作区的钥匙，
 * 禁止出现在日志、错误提示、ZIP 备份、WebDAV/S3 配置导出与任何 toast 中。
 */
import { localPrivateStore } from './localPrivateStore';

export interface CloudSyncConfig {
  /** 总开关 */
  enabled: boolean;
  /** Worker 地址（必须 HTTPS；仅本地开发允许显式 localhost 例外） */
  workerUrl: string;
  /** 同步密钥（静态共享密钥，等价于整个工作区的钥匙） */
  syncToken: string;
  /** 工作区标识：两台设备须填同一值（首次配置必填，用户自起） */
  workspaceId: string;
}

export interface CloudSyncState {
  /** 本设备唯一标识，首次生成后固定 */
  deviceId: string;
  /** 已拉取到的最大服务端 sequence（pull 游标） */
  lastPulledSequence: number;
  /** 最近一次同步时间；从未同步为 null */
  lastSyncAt: string | null;
  /** 最近一次同步失败摘要；成功为 null */
  lastSyncError: string | null;
}

const CONFIG_RECORD_ID = 'cloud_sync_config';
const STATE_RECORD_ID = 'cloud_sync_state';

function createDeviceId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** 读取云同步配置；未配置为 null（首次使用需引导填写） */
export async function loadCloudSyncConfig(): Promise<CloudSyncConfig | null> {
  const record = await localPrivateStore.get('cloud_sync_config', CONFIG_RECORD_ID);
  if (!record) return null;
  const { id: _recordId, ...config } = record.payload as unknown as CloudSyncConfig & { id?: string };
  void _recordId;
  return config;
}

export async function saveCloudSyncConfig(config: CloudSyncConfig): Promise<void> {
  await localPrivateStore.put('cloud_sync_config', { ...config }, CONFIG_RECORD_ID);
}

/** 读取云同步状态；未初始化为 null */
export async function loadCloudSyncState(): Promise<CloudSyncState | null> {
  const record = await localPrivateStore.get('cloud_sync_state', STATE_RECORD_ID);
  if (!record) return null;
  const { id: _recordId, ...state } = record.payload as unknown as CloudSyncState & { id?: string };
  void _recordId;
  return state;
}

export async function saveCloudSyncState(state: CloudSyncState): Promise<void> {
  await localPrivateStore.put('cloud_sync_state', { ...state }, STATE_RECORD_ID);
}

/** 读取本设备 deviceId；首次调用时生成并持久化（之后固定不变） */
export async function getOrCreateDeviceId(): Promise<string> {
  const state = await loadCloudSyncState();
  if (state?.deviceId) return state.deviceId;
  const deviceId = createDeviceId();
  await saveCloudSyncState({
    deviceId,
    lastPulledSequence: 0,
    lastSyncAt: null,
    lastSyncError: null,
  });
  return deviceId;
}
