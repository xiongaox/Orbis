import { localPrivateStore } from './localPrivateStore';
import { WEBDAV_CONFIG_CHANGE_EVENT, webDavBackupService } from './webdavBackupService';
import { S3_CONFIG_CHANGE_EVENT, s3BackupService } from './s3BackupService';

export type RemoteBackupMethod = 'webdav' | 's3';

const METHOD_TYPE = 'backup_method';
const METHOD_CHANGE_EVENT = 'orbis-backup-method-change';
// 自动备份调度：距上次成功自动备份满间隔才执行。
// 记录在 localStorage（设备本地的调度状态，不进备份快照）——
// 否则「启动即补跑」无法去重，应用每天短会话使用时永远等不满 setInterval 的间隔。
const LAST_AUTO_BACKUP_KEY = 'orbis_last_auto_backup_at';

function isAutoBackupDue(intervalMinutes: number): boolean {
  let last = 0;
  try { last = Number(localStorage.getItem(LAST_AUTO_BACKUP_KEY) || 0); } catch { /* 存储不可用时按从未备份处理 */ }
  return Date.now() - last >= intervalMinutes * 60 * 1_000;
}

function markAutoBackupDone(): void {
  try { localStorage.setItem(LAST_AUTO_BACKUP_KEY, String(Date.now())); } catch { /* 忽略 */ }
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
