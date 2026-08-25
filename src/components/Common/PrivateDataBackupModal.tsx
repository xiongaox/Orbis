import { useState } from 'react';
import { Download, RefreshCw, Upload, X } from 'lucide-react';
import { webDavBackupService, type WebDavConfig } from '../../services/webdavBackupService';

interface PrivateDataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivateDataBackupModal({ isOpen, onClose }: PrivateDataBackupModalProps) {
  const [config, setConfig] = useState<WebDavConfig>(() => webDavBackupService.readConfig());
  const [busy, setBusy] = useState<'backup' | 'restore' | 'test' | null>(null);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const update = (key: keyof WebDavConfig, value: string) => setConfig((current) => ({ ...current, [key]: value }));
  const run = async (action: 'backup' | 'restore' | 'test') => {
    setBusy(action);
    setMessage('');
    try {
      webDavBackupService.saveConfig(config);
      if (action === 'backup') await webDavBackupService.backup(config);
      if (action === 'restore') await webDavBackupService.restore(config);
      if (action === 'test') await webDavBackupService.testConnection(config);
      setMessage(action === 'backup' ? '备份已完成' : action === 'restore' ? '恢复已完成，刷新案例列表即可查看' : '连接成功');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败，请稍后重试');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="private-data-title">
      <div className="w-full max-w-lg rounded-xl border border-border bg-popover p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="private-data-title" className="font-serif text-lg font-semibold text-foreground">私有数据备份</h2>
            <p className="mt-1 text-xs text-muted-foreground">案例和笔记优先保存在本机 SQLite；WebDAV 仅用于文件级备份。</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary/50" aria-label="关闭"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <label className="block text-sm text-foreground">WebDAV 地址<input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring" value={config.endpoint} onChange={(event) => update('endpoint', event.target.value)} placeholder="https://dav.example.com" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-foreground">用户名<input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring" value={config.username} onChange={(event) => update('username', event.target.value)} /></label>
            <label className="block text-sm text-foreground">密码<input type="password" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring" value={config.password} onChange={(event) => update('password', event.target.value)} /></label>
          </div>
          <label className="block text-sm text-foreground">备份文件路径<input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-ring" value={config.filePath} onChange={(event) => update('filePath', event.target.value)} placeholder="orbis/private-data.json" /></label>
        </div>
        {message && <p className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-sm text-foreground" role="status">{message}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => void run('test')} disabled={busy !== null} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary/50 disabled:opacity-50"><RefreshCw className="h-4 w-4" />测试连接</button>
          <button type="button" onClick={() => void run('restore')} disabled={busy !== null} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary/50 disabled:opacity-50"><Upload className="h-4 w-4" />恢复</button>
          <button type="button" onClick={() => void run('backup')} disabled={busy !== null} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"><Download className="h-4 w-4" />备份</button>
        </div>
      </div>
    </div>
  );
}
