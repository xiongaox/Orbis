import { localPrivateStore } from './localPrivateStore';
import { WEBDAV_CONFIG_CHANGE_EVENT, webDavBackupService } from './webdavBackupService';
import { S3_CONFIG_CHANGE_EVENT, s3BackupService } from './s3BackupService';

export type RemoteBackupMethod = 'webdav' | 's3';

const METHOD_TYPE = 'backup_method';
const METHOD_CHANGE_EVENT = 'orbis-backup-method-change';

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
 * 任一配置或备份方式变化时重新调度。
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
  const run = async () => {
    if ((await remoteBackupService.readMethod()) === 's3') {
      const config = await s3BackupService.readConfig();
      if (config.autoBackupEnabled && config.endpoint && config.bucket) await s3BackupService.backup(config);
    } else {
      const config = await webDavBackupService.readConfig();
      if (config.autoBackupEnabled && config.endpoint) await webDavBackupService.backup(config);
    }
  };
  const schedule = () => {
    clearTimer();
    void (async () => {
      try {
        const method = await remoteBackupService.readMethod();
        const config = method === 's3' ? await s3BackupService.readConfig() : await webDavBackupService.readConfig();
        if (stopped || !config.autoBackupEnabled) return;
        timer = window.setInterval(() => {
          void run().catch((error: unknown) => console.warn('自动备份失败', error));
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
