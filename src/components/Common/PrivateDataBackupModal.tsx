import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Clock3, Cloud, HardDriveUpload, MessageSquare, RefreshCw, Upload, X } from 'lucide-react';
import { webDavBackupService, type WebDavConfig } from '../../services/webdavBackupService';
import { s3BackupService, type S3Config } from '../../services/s3BackupService';
import { remoteBackupService, type RemoteBackupMethod } from '../../services/remoteBackupService';
import { AUTO_BACKUP_INTERVAL_MINUTES } from '../../services/remoteBackupShared';
import RemoteBackupManagerModal from './RemoteBackupManagerModal';

interface PrivateDataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emptyWebDavConfig: WebDavConfig = {
  endpoint: '', username: '', password: '', backupDirectory: 'orbis/backups', autoBackupEnabled: false, autoBackupIntervalMinutes: 1440, includeChatHistory: true,
};
const emptyS3Config: S3Config = {
  endpoint: '', region: 'us-east-1', bucket: '', accessKeyId: '', secretAccessKey: '', sessionToken: '', backupPrefix: 'orbis/backups', pathStyle: false, autoBackupEnabled: false, autoBackupIntervalMinutes: 1440, includeChatHistory: true,
};
const SUCCESS_MESSAGE_DURATION = 4_000;
const METHOD_TAB_BASE = 'flex min-h-8 items-center justify-center rounded-md px-3 text-sm transition-colors focus-ring';

function formatInterval(minutes: number) {
  if (minutes < 60) return `每 ${minutes} 分钟`;
  return `每 ${minutes / 60} 小时`;
}

export default function PrivateDataBackupModal({ isOpen, onClose }: PrivateDataBackupModalProps) {
  const [method, setMethod] = useState<RemoteBackupMethod>('webdav');
  const [webdavConfig, setWebDavConfig] = useState<WebDavConfig>(emptyWebDavConfig);
  const [s3Config, setS3Config] = useState<S3Config>(emptyS3Config);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [frequencyMenuOpen, setFrequencyMenuOpen] = useState(false);
  const [busy, setBusy] = useState<'backup' | 'test' | 'manager' | null>(null);
  const [message, setMessage] = useState('');
  const messageTimerRef = useRef<number | undefined>(undefined);

  const clearMessageTimer = () => {
    if (messageTimerRef.current !== undefined) {
      window.clearTimeout(messageTimerRef.current);
      messageTimerRef.current = undefined;
    }
  };
  const showSuccessMessage = (nextMessage: string) => {
    clearMessageTimer();
    setMessage(nextMessage);
    messageTimerRef.current = window.setTimeout(() => {
      setMessage('');
      messageTimerRef.current = undefined;
    }, SUCCESS_MESSAGE_DURATION);
  };

  useEffect(() => () => clearMessageTimer(), []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setConfigLoaded(false);
    clearMessageTimer();
    setMessage('');
    void Promise.all([remoteBackupService.readMethod(), webDavBackupService.readConfig(), s3BackupService.readConfig()])
      .then(([nextMethod, nextWebDavConfig, nextS3Config]) => {
        if (cancelled) return;
        setMethod(nextMethod);
        setWebDavConfig(nextWebDavConfig);
        setS3Config(nextS3Config);
        setConfigLoaded(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : '读取已保存的备份配置失败');
          setConfigLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && configLoaded) void webDavBackupService.saveConfig(webdavConfig);
  }, [webdavConfig, configLoaded, isOpen]);

  useEffect(() => {
    if (isOpen && configLoaded) void s3BackupService.saveConfig(s3Config);
  }, [s3Config, configLoaded, isOpen]);

  if (!isOpen) return null;

  const activeConfig = method === 's3' ? s3Config : webdavConfig;
  const updateWebDav = <Key extends keyof WebDavConfig>(key: Key, value: WebDavConfig[Key]) => setWebDavConfig((current) => ({ ...current, [key]: value }));
  const updateS3 = <Key extends keyof S3Config>(key: Key, value: S3Config[Key]) => setS3Config((current) => ({ ...current, [key]: value }));
  const updateActive = <Key extends 'autoBackupEnabled' | 'autoBackupIntervalMinutes' | 'includeChatHistory'>(key: Key, value: (WebDavConfig & S3Config)[Key]) => {
    if (method === 's3') updateS3(key, value);
    else updateWebDav(key, value);
  };
  const changeMethod = (next: RemoteBackupMethod) => {
    if (next === method) return;
    setMethod(next);
    setFrequencyMenuOpen(false);
    void remoteBackupService.saveMethod(next);
  };
  const run = async (action: 'backup' | 'test' | 'manager') => {
    setBusy(action);
    clearMessageTimer();
    setMessage('');
    try {
      if (method === 's3') {
        await s3BackupService.saveConfig(s3Config);
        if (action === 'backup') {
          const result = await s3BackupService.backup(s3Config);
          showSuccessMessage(`已创建备份：${result.backup.filename}`);
        }
        if (action === 'test') {
          await s3BackupService.testConnection(s3Config);
          showSuccessMessage('连接成功');
        }
      } else {
        await webDavBackupService.saveConfig(webdavConfig);
        if (action === 'backup') {
          const result = await webDavBackupService.backup(webdavConfig);
          showSuccessMessage(`已创建备份：${result.backup.filename}`);
        }
        if (action === 'test') {
          await webDavBackupService.testConnection(webdavConfig);
          showSuccessMessage('连接成功');
        }
      }
      if (action === 'manager') setShowManager(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败，请稍后重试');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="private-data-title"
        // 表单很长，手机竖屏下比视口还高：居中布局会把上下两端顶出屏幕，
        // 关闭按钮正好在被裁掉的那截里、点不到。留白同时避开系统栏（见 MainActivity.kt）。
        style={{
          paddingTop: 'calc(1rem + var(--safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1rem + var(--safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex max-h-full min-h-0 w-full max-w-xl flex-col rounded-xl border border-border bg-popover shadow-2xl">
          <div className="flex shrink-0 items-start justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              <h2 id="private-data-title" className="font-serif text-lg font-semibold text-foreground">数据备份</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary/50" aria-label="关闭"><X className="h-4 w-4" /></button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            <div>
              <p className="mb-2 text-sm text-foreground">备份方式</p>
              <div role="tablist" aria-label="备份方式" className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
                <button type="button" role="tab" aria-selected={method === 'webdav'} disabled={!configLoaded} onClick={() => changeMethod('webdav')} className={`${METHOD_TAB_BASE} ${method === 'webdav' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-50`}>WebDAV</button>
                <button type="button" role="tab" aria-selected={method === 's3'} disabled={!configLoaded} onClick={() => changeMethod('s3')} className={`${METHOD_TAB_BASE} ${method === 's3' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-50`}>S3 兼容存储</button>
              </div>
            </div>

            {method === 's3' ? (
              <div className="space-y-3">
                <label className="block text-sm text-foreground">S3 服务地址<input disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={s3Config.endpoint} onChange={(event) => updateS3('endpoint', event.target.value)} placeholder="https://s3.us-east-1.amazonaws.com" /></label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-foreground">区域（Region）<input disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={s3Config.region} onChange={(event) => updateS3('region', event.target.value)} placeholder="us-east-1" /></label>
                  <label className="block text-sm text-foreground">存储桶（Bucket）<input disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={s3Config.bucket} onChange={(event) => updateS3('bucket', event.target.value)} placeholder="orbis-backups" /></label>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-foreground">Access Key ID<input disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={s3Config.accessKeyId} onChange={(event) => updateS3('accessKeyId', event.target.value)} /></label>
                  <label className="block text-sm text-foreground">Secret Access Key<input type="password" disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={s3Config.secretAccessKey} onChange={(event) => updateS3('secretAccessKey', event.target.value)} /></label>
                </div>
                <label className="block text-sm text-foreground">会话 Token（可选）<input type="password" disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={s3Config.sessionToken} onChange={(event) => updateS3('sessionToken', event.target.value)} placeholder="使用 STS 临时凭证时填写" /></label>
                <label className="block text-sm text-foreground">备份前缀<input disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={s3Config.backupPrefix} onChange={(event) => updateS3('backupPrefix', event.target.value)} placeholder="orbis/backups" /></label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground"><input type="checkbox" disabled={!configLoaded} checked={s3Config.pathStyle} onChange={(event) => updateS3('pathStyle', event.target.checked)} className="h-4 w-4 accent-primary" />路径风格（MinIO 等自建服务勾选）</label>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm text-foreground">WebDAV 地址<input disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={webdavConfig.endpoint} onChange={(event) => updateWebDav('endpoint', event.target.value)} placeholder="https://dav.example.com" /></label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-foreground">用户名<input disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={webdavConfig.username} onChange={(event) => updateWebDav('username', event.target.value)} /></label>
                  <label className="block text-sm text-foreground">密码<input type="password" disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={webdavConfig.password} onChange={(event) => updateWebDav('password', event.target.value)} /></label>
                </div>
                <label className="block text-sm text-foreground">备份文件夹<input disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={webdavConfig.backupDirectory} onChange={(event) => updateWebDav('backupDirectory', event.target.value)} placeholder="orbis/backups" /></label>
              </div>
            )}

            <section className="rounded-xl border border-border bg-secondary/20 p-4" aria-labelledby="backup-content-title">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 id="backup-content-title" className="text-sm font-medium text-foreground">备份 AI 研判对话历史</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      产物为 ZIP 归档（案例与对话分包）；关闭后仅备份案例与系统设置
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={activeConfig.includeChatHistory !== false}
                  disabled={!configLoaded}
                  onClick={() => updateActive('includeChatHistory', !(activeConfig.includeChatHistory !== false))}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-ring disabled:opacity-50 ${
                    activeConfig.includeChatHistory !== false ? 'border-primary bg-primary' : 'border-border bg-muted'
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm transition-transform ${
                      activeConfig.includeChatHistory !== false ? 'translate-x-6 text-primary' : 'translate-x-1 text-muted-foreground'
                    }`}
                  >
                    {activeConfig.includeChatHistory !== false && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-secondary/20 p-4" aria-labelledby="auto-backup-title">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Clock3 className="h-4 w-4" /></span>
                  <div>
                    <h3 id="auto-backup-title" className="text-sm font-medium text-foreground">自动备份</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">应用运行期间自动创建新版本</p>
                  </div>
                </div>
                <button type="button" role="switch" aria-checked={activeConfig.autoBackupEnabled} disabled={!configLoaded} onClick={() => updateActive('autoBackupEnabled', !activeConfig.autoBackupEnabled)} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-ring disabled:opacity-50 ${activeConfig.autoBackupEnabled ? 'border-primary bg-primary' : 'border-border bg-muted'}`}>
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm transition-transform ${activeConfig.autoBackupEnabled ? 'translate-x-6 text-primary' : 'translate-x-1 text-muted-foreground'}`}>{activeConfig.autoBackupEnabled && <Check className="h-3.5 w-3.5" />}</span>
                </button>
              </div>
              {activeConfig.autoBackupEnabled && <div className="mt-4 border-t border-border pt-3">
                <div className="relative">
                  <p className="mb-2 text-sm text-foreground">备份频率</p>
                  <button type="button" aria-haspopup="listbox" aria-expanded={frequencyMenuOpen} onClick={() => setFrequencyMenuOpen((open) => !open)} className="flex min-h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-secondary/60 focus-ring">
                    <span>{formatInterval(activeConfig.autoBackupIntervalMinutes)}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${frequencyMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {frequencyMenuOpen && <div role="listbox" aria-label="自动备份频率" className="absolute z-[80] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-xl">
                    {AUTO_BACKUP_INTERVAL_MINUTES.map((minutes) => {
                      const selected = activeConfig.autoBackupIntervalMinutes === minutes;
                      return <button key={minutes} type="button" role="option" aria-selected={selected} onClick={() => { updateActive('autoBackupIntervalMinutes', minutes); setFrequencyMenuOpen(false); }} className={`flex min-h-9 w-full items-center justify-between rounded-md px-3 text-left text-sm transition-colors ${selected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary/70'}`}><span>{formatInterval(minutes)}</span>{selected && <Check className="h-4 w-4" />}</button>;
                    })}
                  </div>}
                </div>
              </div>}
            </section>

            {message && <p className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-foreground" role="status">{message}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-secondary/10 px-5 py-3">
            <button type="button" onClick={() => void run('test')} disabled={busy !== null || !configLoaded} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground hover:bg-secondary/50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy === 'test' ? 'animate-spin' : ''}`} />测试连接</button>
            <button type="button" onClick={() => void run('manager')} disabled={busy !== null || !configLoaded} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground hover:bg-secondary/50 disabled:opacity-50"><Upload className="h-4 w-4" />恢复</button>
            <button type="button" onClick={() => void run('backup')} disabled={busy !== null || !configLoaded} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"><HardDriveUpload className="h-4 w-4" />{busy === 'backup' ? '正在备份' : '立即备份'}</button>
          </div>
        </div>
      </div>
      <RemoteBackupManagerModal isOpen={showManager} method={method} config={method === 's3' ? s3Config : webdavConfig} onClose={() => setShowManager(false)} onRestored={(filename) => showSuccessMessage(`已恢复：${filename}`)} />
    </>
  );
}
