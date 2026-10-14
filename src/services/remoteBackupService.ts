import { localPrivateStore } from './localPrivateStore';
import { WEBDAV_CONFIG_CHANGE_EVENT, webDavBackupService } from './webdavBackupService';
import { S3_CONFIG_CHANGE_EVENT, s3BackupService } from './s3BackupService';

export type RemoteBackupMethod = 'webdav' | 's3';

const METHOD_TYPE = 'backup_method';
const METHOD_CHANGE_EVENT = 'orbis-backup-method-change';
// 自动备份调度：距上次成功自动备份满间隔才执行。
// 记录存 SQLite（auto_backup_state，属设备本地配置，不进备份快照、恢复时也不覆盖本机）——
// 否则「启动即补跑」无法去重，应用每天短会话使用时永远等不满 setInterval 的间隔；
// 也正因设备本地，才不会出现「手机的时间戳覆盖桌面而跳过补跑」。
const AUTO_BACKUP_STATE_TYPE = 'auto_backup_state';
const AUTO_BACKUP_STATE_ID = 'auto_backup_state';

// 上次成功备份时间的内存缓存：isAutoBackupDue 为同步调用，需读缓存；启动时由 preload 填充。
let lastAutoBackupAt = 0;

/** 启动预热：从 SQLite 读入上次备份时间戳（localStorage 旧值一次性迁移后删除）。 */
export async function preloadAutoBackupState(): Promise<void> {
  const record = await localPrivateStore.get(AUTO_BACKUP_STATE_TYPE, AUTO_BACKUP_STATE_ID);
  let stored = Number(record?.payload.lastAutoBackupAt ?? 0);
  if (!record && typeof localStorage !== 'undefined') {
    // 迁移旧 localStorage 值
    try {
      stored = Number(localStorage.getItem('orbis_last_auto_backup_at') || 0);
      if (stored) localStorage.removeItem('orbis_last_auto_backup_at');
    } catch { /* 忽略 */ }
  }
  lastAutoBackupAt = Number.isFinite(stored) ? stored : 0;
}

function isAutoBackupDue(intervalMinutes: number): boolean {
  return Date.now() - lastAutoBackupAt >= intervalMinutes * 60 * 1_000;
}

function markAutoBackupDone(): void {
  lastAutoBackupAt = Date.now();
  void localPrivateStore
    .put(AUTO_BACKUP_STATE_TYPE, { lastAutoBackupAt }, AUTO_BACKUP_STATE_ID)
    .catch((error: unknown) => console.warn('记录自动备份时间失败', error));
}

let autoRunInFlight = false;

async function runAutoBackup(): Promise<void> {
  if (autoRunInFlight) return;
  autoRunInFlight = true;
  try {
    if ((await remoteBackupService.readMethod()) === 's3') {
      const config = await s3BackupService.readConfig();
      if (config.autoBackupEnabled && config.endpoint && config.bucket && isAutoBackupDue(config.autoBackupIntervalMinutes)) {
        await s3BackupService.backup(config);
        markAutoBackupDone();
      }
    } else {
      const config = await webDavBackupService.readConfig();
      if (config.autoBackupEnabled && config.endpoint && isAutoBackupDue(config.autoBackupIntervalMinutes)) {
        await webDavBackupService.backup(config);
        markAutoBackupDone();
      }
    }
  } finally {
    autoRunInFlight = false;
  }
}

export const remoteBackupService = {
  async readMethod(): Promise<RemoteBackupMethod> {
    const record = await localPrivateStore.get(METHOD_TYPE, METHOD_TYPE);
    return record?.payload?.method === 's3' ? 's3' : 'webdav';
  },

  async saveMethod(method: RemoteBackupMethod) {
    await localPrivateStore.put(METHOD_TYPE, { method }, METHOD_TYPE);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(METHOD_CHANGE_EVENT));
  },
};

/**
 * 应用运行期间的自动备份调度：按当前备份方式读取对应配置，
 * 任一配置或备份方式变化时重新调度。启动即补跑一次
 * （runAutoBackup 内部按「距上次成功自动备份满间隔」去重，未到间隔不执行），
 * 保证「每天短会话使用」的应用也能按间隔完成备份，而不是必须连续运行满一个周期。
 */
export function startRemoteAutoBackup() {
  let timer: number | undefined;
  let stopped = false;

  const clearTimer = () => {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
  const schedule = () => {
    clearTimer();
    void (async () => {
      try {
        const method = await remoteBackupService.readMethod();
        const config = method === 's3' ? await s3BackupService.readConfig() : await webDavBackupService.readConfig();
        if (stopped || !config.autoBackupEnabled) return;
        // 启动即补跑 + 周期执行，均由 runAutoBackup 内部的间隔去重兜底
        void runAutoBackup().catch((error: unknown) => console.warn('自动备份失败', error));
        timer = window.setInterval(() => {
          void runAutoBackup().catch((error: unknown) => console.warn('自动备份失败', error));
        }, config.autoBackupIntervalMinutes * 60 * 1_000);
      } catch (error) {
        console.warn('读取自动备份配置失败', error);
      }
    })();
  };

  window.addEventListener(WEBDAV_CONFIG_CHANGE_EVENT, schedule);
  window.addEventListener(S3_CONFIG_CHANGE_EVENT, schedule);
  window.addEventListener(METHOD_CHANGE_EVENT, schedule);
  schedule();
  return () => {
    stopped = true;
    clearTimer();
    window.removeEventListener(WEBDAV_CONFIG_CHANGE_EVENT, schedule);
    window.removeEventListener(S3_CONFIG_CHANGE_EVENT, schedule);
    window.removeEventListener(METHOD_CHANGE_EVENT, schedule);
  };
}
