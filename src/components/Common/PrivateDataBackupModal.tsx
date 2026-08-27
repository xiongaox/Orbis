import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Clock3, Cloud, HardDriveUpload, RefreshCw, Upload, X } from 'lucide-react';
import { AUTO_BACKUP_INTERVAL_MINUTES, webDavBackupService, type WebDavConfig } from '../../services/webdavBackupService';
import WebDavBackupManagerModal from './WebDavBackupManagerModal';

interface PrivateDataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emptyConfig: WebDavConfig = {
  endpoint: '', username: '', password: '', backupDirectory: 'orbis/backups', autoBackupEnabled: false, autoBackupIntervalMinutes: 1440,
};
const SUCCESS_MESSAGE_DURATION = 4_000;

function formatInterval(minutes: number) {
  if (minutes < 60) return `每 ${minutes} 分钟`;
  return `每 ${minutes / 60} 小时`;
}

export default function PrivateDataBackupModal({ isOpen, onClose }: PrivateDataBackupModalProps) {
  const [config, setConfig] = useState<WebDavConfig>(emptyConfig);
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
    void webDavBackupService.readConfig().then((savedConfig) => {
      if (!cancelled) {
        setConfig(savedConfig);
        setConfigLoaded(true);
      }
    }).catch((error: unknown) => {
      if (!cancelled) {
        setMessage(error instanceof Error ? error.message : '读取已保存的 WebDAV 配置失败');
        setConfigLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && configLoaded) void webDavBackupService.saveConfig(config);
  }, [config, configLoaded, isOpen]);

  if (!isOpen) return null;

  const update = <Key extends keyof WebDavConfig>(key: Key, value: WebDavConfig[Key]) => setConfig((current) => ({ ...current, [key]: value }));
  const run = async (action: 'backup' | 'test' | 'manager') => {
    setBusy(action);
    clearMessageTimer();
    setMessage('');
    try {
      await webDavBackupService.saveConfig(config);
      if (action === 'backup') {
        const result = await webDavBackupService.backup(config);
        showSuccessMessage(`已创建备份：${result.backup.filename}`);
      }
      if (action === 'test') {
        await webDavBackupService.testConnection(config);
        showSuccessMessage('连接成功');
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
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="private-data-title">
        <div className="flex w-full max-w-xl flex-col rounded-xl border border-border bg-popover shadow-2xl">
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              <h2 id="private-data-title" className="font-serif text-lg font-semibold text-foreground">数据备份</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary/50" aria-label="关闭"><X className="h-4 w-4" /></button>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div className="space-y-3">
              <label className="block text-sm text-foreground">WebDAV 地址<input disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={config.endpoint} onChange={(event) => update('endpoint', event.target.value)} placeholder="https://dav.example.com" /></label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm text-foreground">用户名<input disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={config.username} onChange={(event) => update('username', event.target.value)} /></label>
                <label className="block text-sm text-foreground">密码<input type="password" disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={config.password} onChange={(event) => update('password', event.target.value)} /></label>
              </div>
              <label className="block text-sm text-foreground">备份文件夹<input disabled={!configLoaded} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring disabled:opacity-50" value={config.backupDirectory} onChange={(event) => update('backupDirectory', event.target.value)} placeholder="orbis/backups" /></label>
            </div>

            <section className="rounded-xl border border-border bg-secondary/20 p-4" aria-labelledby="auto-backup-title">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Clock3 className="h-4 w-4" /></span>
                  <div>
                    <h3 id="auto-backup-title" className="text-sm font-medium text-foreground">自动备份</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">应用运行期间自动创建新版本</p>
                  </div>
                </div>
                <button type="button" role="switch" aria-checked={config.autoBackupEnabled} disabled={!configLoaded} onClick={() => update('autoBackupEnabled', !config.autoBackupEnabled)} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-ring disabled:opacity-50 ${config.autoBackupEnabled ? 'border-primary bg-primary' : 'border-border bg-muted'}`}>
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm transition-transform ${config.autoBackupEnabled ? 'translate-x-6 text-primary' : 'translate-x-1 text-muted-foreground'}`}>{config.autoBackupEnabled && <Check className="h-3.5 w-3.5" />}</span>
                </button>
              </div>
              {config.autoBackupEnabled && <div className="mt-4 border-t border-border pt-3">
                <div className="relative">
                  <p className="mb-2 text-sm text-foreground">备份频率</p>
                  <button type="button" aria-haspopup="listbox" aria-expanded={frequencyMenuOpen} onClick={() => setFrequencyMenuOpen((open) => !open)} className="flex min-h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-secondary/60 focus-ring">
                    <span>{formatInterval(config.autoBackupIntervalMinutes)}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${frequencyMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {frequencyMenuOpen && <div role="listbox" aria-label="自动备份频率" className="absolute z-[80] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-xl">
                    {AUTO_BACKUP_INTERVAL_MINUTES.map((minutes) => {
                      const selected = config.autoBackupIntervalMinutes === minutes;
                      return <button key={minutes} type="button" role="option" aria-selected={selected} onClick={() => { update('autoBackupIntervalMinutes', minutes); setFrequencyMenuOpen(false); }} className={`flex min-h-9 w-full items-center justify-between rounded-md px-3 text-left text-sm transition-colors ${selected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary/70'}`}><span>{formatInterval(minutes)}</span>{selected && <Check className="h-4 w-4" />}</button>;
                    })}
                  </div>}
                </div>
              </div>}
            </section>

            {message && <p className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-foreground" role="status">{message}</p>}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-secondary/10 px-5 py-3">
            <button type="button" onClick={() => void run('test')} disabled={busy !== null || !configLoaded} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground hover:bg-secondary/50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy === 'test' ? 'animate-spin' : ''}`} />测试连接</button>
            <button type="button" onClick={() => void run('manager')} disabled={busy !== null || !configLoaded} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground hover:bg-secondary/50 disabled:opacity-50"><Upload className="h-4 w-4" />恢复</button>
            <button type="button" onClick={() => void run('backup')} disabled={busy !== null || !configLoaded} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"><HardDriveUpload className="h-4 w-4" />{busy === 'backup' ? '正在备份' : '立即备份'}</button>
          </div>
        </div>
      </div>
      <WebDavBackupManagerModal isOpen={showManager} config={config} onClose={() => setShowManager(false)} onRestored={(filename) => showSuccessMessage(`已恢复：${filename}`)} />
    </>
  );
}
