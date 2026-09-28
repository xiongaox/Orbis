import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Clock3, Cloud, FileDown, FileUp, HardDriveUpload, MessageSquare, RefreshCw, Upload, X } from 'lucide-react';
import { webDavBackupService, type WebDavConfig } from '../../services/webdavBackupService';
import { s3BackupService, type S3Config } from '../../services/s3BackupService';
import { remoteBackupService, type RemoteBackupMethod } from '../../services/remoteBackupService';
import { AUTO_BACKUP_INTERVAL_MINUTES } from '../../services/remoteBackupShared';
import { exportTextFile } from '../../utils/fileExportUtil';
import RemoteBackupManagerModal from './RemoteBackupManagerModal';
import SubPage from '../UI/SubPage';
import { useLayoutMode } from '../../hooks/useLayoutMode';

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
// 底部次级操作按钮（导出/导入/测试/恢复）共用样式，移动端与桌面端两套布局复用同一份。
// 高度取 h-9(36px)：它是「视觉高度」，DESIGN.md 的 40/44px 是「触控目标」下限——
// 网格布局下按钮横向已铺满、单元格本身足够宽，36px 高度仍远超最小可点面积，
// 无需为凑数字把底栏撑到占满弹窗两成高度。「备份」是主操作，单独写样式。
const ACTION_BUTTON_BASE = 'inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50 focus-ring';

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
  const configFileInputRef = useRef<HTMLInputElement>(null);

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

  // 移动端检测：必须在 isOpen 早退之前调用，保证 hooks 顺序稳定
  const { isMobile } = useLayoutMode();

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
  /**
   * 导出当前备份配置为 JSON，便于在多台设备间复用，无需每次手填。
   *
   * 注意：S3 的 secretAccessKey / WebDAV 的 password 属于明文凭证，
   * 这里按「用户主动导出、自担保管责任」处理，但在文件与提示中明确标注，
   * 避免用户误以为该文件可安全分享。
   */
  const exportConfig = async () => {
    clearMessageTimer();
    setMessage('');
    try {
      const payload = {
        _format: 'orbis-backup-config',
        _version: 1,
        _warning: '本文件包含明文访问凭证，请妥善保管，勿分享或提交至代码仓库。',
        exportedAt: new Date().toISOString(),
        method,
        webdav: webdavConfig,
        s3: s3Config,
      };
      const stamp = new Date().toISOString().slice(0, 10);
      const outcome = await exportTextFile({
        filename: `orbis-backup-config-${stamp}`,
        content: JSON.stringify(payload, null, 2),
        extension: 'json',
        typeLabel: 'JSON',
      });
      // 安卓端 saved 是"已写入系统下载目录"，与桌面端"已保存到所选路径"区分开表述
      const isAndroid = /android/i.test(navigator.userAgent);
      if (outcome === 'saved') {
        showSuccessMessage(
          isAndroid
            ? '备份配置已保存到系统「下载」目录（含明文凭证，请妥善保管）'
            : '备份配置已导出（含明文凭证，请妥善保管）'
        );
      } else if (outcome === 'downloaded') {
        showSuccessMessage('备份配置已下载（含明文凭证，请妥善保管）');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导出配置失败');
    }
  };

  /**
   * 从 JSON 导入备份配置。仅接受本应用导出的格式，逐字段校验后再落库，
   * 避免把任意 JSON 直接灌进配置对象导致后续备份行为异常。
   */
  const importConfig = async (file: File) => {
    clearMessageTimer();
    setMessage('');
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      if (parsed?._format !== 'orbis-backup-config') {
        throw new Error('文件格式不符：请选择由本应用「导出配置」生成的文件');
      }

      const pick = <T extends object>(raw: unknown, base: T): T => {
        if (!raw || typeof raw !== 'object') return base;
        // 只采纳已知键，且类型需与默认值一致，防止脏字段污染配置
        const patched: Record<string, unknown> = { ...(base as Record<string, unknown>) };
        for (const [key, fallback] of Object.entries(base)) {
          const value = (raw as Record<string, unknown>)[key];
          if (value !== undefined && typeof value === typeof fallback) patched[key] = value;
        }
        return patched as T;
      };

      const nextWebDav = pick(parsed.webdav, emptyWebDavConfig);
      const nextS3 = pick(parsed.s3, emptyS3Config);
      const nextMethod: RemoteBackupMethod = parsed.method === 's3' ? 's3' : 'webdav';

      setWebDavConfig(nextWebDav);
      setS3Config(nextS3);
      setMethod(nextMethod);
      await Promise.all([
        webDavBackupService.saveConfig(nextWebDav),
        s3BackupService.saveConfig(nextS3),
        remoteBackupService.saveMethod(nextMethod),
      ]);
      showSuccessMessage('备份配置已导入并保存');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入配置失败：文件无法解析');
    }
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

  // 表单正文：移动端 SubPage 与桌面端自绘弹层共用同一份内容
  const formBody = (
    <>
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
    </>
  );

  // 底部操作（含隐藏 file input：两套布局都会触发它，不能挂在单一分支里）
  // 移动端按钮规格对齐「新建案例」底部（h-10 + font-medium），比桌面 h-9 大一档
  const footerActions = (
    <>
      <input
        ref={configFileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // 先清空 value，否则连续选择同一个文件不会再次触发 change
          event.target.value = '';
          if (file) void importConfig(file);
        }}
      />
      {/* 移动端：一行四个次级操作 + 一行主操作 */}
      <div className="w-full sm:hidden">
        <div className="grid grid-cols-4 gap-1.5">
          <button type="button" onClick={() => void exportConfig()} disabled={busy !== null || !configLoaded} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-1 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50 focus-ring"><FileDown className="h-4 w-4 shrink-0" />导出</button>
          <button type="button" onClick={() => configFileInputRef.current?.click()} disabled={busy !== null || !configLoaded} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-1 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50 focus-ring"><FileUp className="h-4 w-4 shrink-0" />导入</button>
          <button type="button" onClick={() => void run('test')} disabled={busy !== null || !configLoaded} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-1 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50 focus-ring"><RefreshCw className={`h-4 w-4 shrink-0 ${busy === 'test' ? 'animate-spin' : ''}`} />测试</button>
          <button type="button" onClick={() => void run('manager')} disabled={busy !== null || !configLoaded} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-1 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50 focus-ring"><Upload className="h-4 w-4 shrink-0" />恢复</button>
        </div>
        <button type="button" onClick={() => void run('backup')} disabled={busy !== null || !configLoaded} className="mt-1.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary hover:opacity-90 disabled:opacity-50 focus-ring"><HardDriveUpload className="h-4 w-4" />{busy === 'backup' ? '备份中' : '备份'}</button>
      </div>

      {/* 桌面端：导入/导出用 mr-auto 推到最左 */}
      <div className="mr-auto hidden flex-wrap items-center gap-2 sm:flex">
        <button type="button" onClick={() => void exportConfig()} disabled={busy !== null || !configLoaded} className={ACTION_BUTTON_BASE}><FileDown className="h-4 w-4" />导出</button>
        <button type="button" onClick={() => configFileInputRef.current?.click()} disabled={busy !== null || !configLoaded} className={ACTION_BUTTON_BASE}><FileUp className="h-4 w-4" />导入</button>
      </div>
      <button type="button" onClick={() => void run('test')} disabled={busy !== null || !configLoaded} className={`${ACTION_BUTTON_BASE} hidden sm:inline-flex`}><RefreshCw className={`h-4 w-4 ${busy === 'test' ? 'animate-spin' : ''}`} />测试</button>
      <button type="button" onClick={() => void run('manager')} disabled={busy !== null || !configLoaded} className={`${ACTION_BUTTON_BASE} hidden sm:inline-flex`}><Upload className="h-4 w-4" />恢复</button>
      <button type="button" onClick={() => void run('backup')} disabled={busy !== null || !configLoaded} className={`${ACTION_BUTTON_BASE} hidden border-transparent bg-primary text-primary-foreground hover:bg-primary hover:opacity-90 sm:inline-flex`}><HardDriveUpload className="h-4 w-4" />{busy === 'backup' ? '备份中' : '备份'}</button>
    </>
  );

  // 移动端：统一二级页面壳（返回手势 + 统一页头）；此前居中小卡片在手机上
  // 表单超高会被裁切，整页展示更合适。
  if (isMobile) {
    return (
      <>
        <SubPage
          isOpen={isOpen}
          onClose={onClose}
          title="数据备份"
          bodyClassName="overflow-hidden flex flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
            {formBody}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-secondary/10 px-3 py-2.5">
            {footerActions}
          </div>
        </SubPage>
        <RemoteBackupManagerModal isOpen={showManager} method={method} config={method === 's3' ? s3Config : webdavConfig} onClose={() => setShowManager(false)} onRestored={(filename) => showSuccessMessage(`已恢复：${filename}`)} />
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="private-data-title"
        // 表单很长：居中布局配合内部滚动 + 安全区留白，避免关闭按钮被裁出屏幕。
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
            {formBody}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-secondary/10 px-3 py-2.5 sm:px-5 sm:py-3">
            {footerActions}
          </div>
        </div>
      </div>
      <RemoteBackupManagerModal isOpen={showManager} method={method} config={method === 's3' ? s3Config : webdavConfig} onClose={() => setShowManager(false)} onRestored={(filename) => showSuccessMessage(`已恢复：${filename}`)} />
    </>
  );
}
