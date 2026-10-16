import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Wifi } from 'lucide-react';
import Toast from './Toast';
import { useToast } from '../../hooks/useToast';
import {
  getStatus,
  readConfig,
  saveConfig,
  syncNow,
  testConnection,
  type CloudSyncStatus,
} from '../../services/cloudSyncService';
import type { CloudSyncConfig } from '../../services/cloudSyncStore';
import { localPrivateStore } from '../../services/localPrivateStore';

/** 同步密钥输入留空时的占位提示：保持已保存的值不变 */
const KEEP_TOKEN_PLACEHOLDER = '已配置，留空保持不变';

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="启用云同步"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full shrink-0 transition-colors focus:outline-none focus-ring ${
        checked ? 'bg-primary/80' : 'bg-muted/60'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow-sm transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </button>
  );
}

const INPUT_CLASS =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus-ring';
const SECONDARY_BUTTON_CLASS =
  'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50 focus-ring';
const PRIMARY_BUTTON_CLASS =
  'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-ring';

/**
 * 云同步设置面板（T07）：无壳正文，只作为「数据备份」弹窗的第三个配置 tab 出现
 * （2026-10-15 界面合并修订；独立入口已于 2026-10 下线，同一功能不再留两处入口）。
 *
 * 敏感字段约定：同步密钥以密码态输入、不回显明文；界面留空表示保持已保存的值。
 * 配置保存与「测试连接 / 立即同步」共用同一份校验与持久化逻辑，
 * 保证测试与同步用的永远是已落盘的配置。
 *
 * 挂载即载入配置：调用方须仅在弹窗打开时挂载本组件。
 */
export default function CloudSyncSettingsPanel() {
  const { toast, showToast } = useToast();

  const [enabled, setEnabled] = useState(false);
  const [workerUrl, setWorkerUrl] = useState('');
  const [syncToken, setSyncToken] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  /** 已保存的密钥（仅存内存，用于「留空保持不变」，绝不渲染） */
  const [savedToken, setSavedToken] = useState('');
  const [status, setStatus] = useState<CloudSyncStatus | null>(null);
  const [busy, setBusy] = useState<'test' | 'sync' | null>(null);

  // 挂载时载入配置与状态：密钥不回显明文（留空表示保持不变）
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [config, nextStatus] = await Promise.all([readConfig(), getStatus()]);
        if (cancelled) return;
        setEnabled(config?.enabled ?? false);
        setWorkerUrl(config?.workerUrl ?? '');
        setSyncToken('');
        setWorkspaceId(config?.workspaceId ?? '');
        setSavedToken(config?.syncToken ?? '');
        setHasSavedConfig(config !== null);
        setStatus(nextStatus);
      } catch {
        if (!cancelled) showToast('读取云同步配置失败', 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 校验表单并保存配置；nextEnabled 用于开关切换时同步写入启用状态 */
  const persistConfig = async (nextEnabled: boolean = enabled): Promise<CloudSyncConfig> => {
    const url = workerUrl.trim();
    const workspace = workspaceId.trim();
    if (!url) throw new Error('请填写 Worker 地址');
    if (!workspace) throw new Error('请填写工作区标识（两台设备需填同一标识）');
    const token = syncToken.trim() || savedToken;
    if (!token) throw new Error('请填写同步密钥');
    const config: CloudSyncConfig = { enabled: nextEnabled, workerUrl: url, syncToken: token, workspaceId: workspace };
    await saveConfig(config);
    setSavedToken(token);
    setHasSavedConfig(true);
    return config;
  };

  const refreshStatus = async () => {
    try {
      setStatus(await getStatus());
    } catch {
      setStatus(null);
    }
  };

  const handleToggleEnabled = async (next: boolean) => {
    try {
      await persistConfig(next);
      setEnabled(next);
      showToast(next ? '云同步已启用' : '云同步已关闭', 'success');
      await refreshStatus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存配置失败', 'error');
    }
  };

  const handleTestConnection = async () => {
    setBusy('test');
    try {
      await persistConfig();
      const info = await testConnection();
      showToast(`连接正常（${info.service} v${info.version}）`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '连接失败', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleSyncNow = async () => {
    setBusy('sync');
    try {
      await persistConfig();
      // 有待推送数据时给出进行中提示；无数据保持无感
      const pending = await localPrivateStore.countOutbox();
      if (pending > 0) {
        showToast(`正在同步 ${pending} 条数据…`, 'info');
      }
      const result = await syncNow();
      if (result.status === 'skipped') {
        showToast('同步正在进行中，请稍候再试', 'info');
      } else if (result.status === 'disabled') {
        showToast('云同步未启用', 'info');
      } else {
        const parts: string[] = [];
        if (result.pushed > 0) parts.push(`推送 ${result.pushed} 条`);
        if (result.pulled > 0) parts.push(`拉取 ${result.pulled} 条`);
        if (result.conflicts > 0) parts.push(`冲突 ${result.conflicts} 条（案例类已存冲突副本）`);
        // 有数据流动才提示结果；无变更无感
        if (parts.length > 0) {
          showToast(`同步完成：${parts.join('，')}`, 'success');
        }
      }
      await refreshStatus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '同步失败', 'error');
      await refreshStatus();
    } finally {
      setBusy(null);
    }
  };

  const pendingHint = status?.pendingCount
    ? `${status.pendingCount} 条待同步`
    : '无待同步变更';
  const lastSyncHint = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString('zh-CN')
    : '从未同步';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-foreground">启用云同步</div>
          <div className="text-xs text-muted-foreground mt-0.5">{pendingHint}</div>
        </div>
        <ToggleSwitch checked={enabled} onChange={(next) => void handleToggleEnabled(next)} />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1" htmlFor="cloud-sync-worker-url">
          Worker 地址
        </label>
        <input
          id="cloud-sync-worker-url"
          type="url"
          value={workerUrl}
          onChange={(event) => setWorkerUrl(event.target.value)}
          placeholder="https://your-worker.example.com"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1" htmlFor="cloud-sync-token">
          同步密钥
        </label>
        <input
          id="cloud-sync-token"
          type="password"
          value={syncToken}
          onChange={(event) => setSyncToken(event.target.value)}
          placeholder={hasSavedConfig ? KEEP_TOKEN_PLACEHOLDER : ''}
          autoComplete="new-password"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1" htmlFor="cloud-sync-workspace">
          工作区标识
        </label>
        <input
          id="cloud-sync-workspace"
          type="text"
          value={workspaceId}
          onChange={(event) => setWorkspaceId(event.target.value)}
          placeholder="例如：xiongaox"
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          首次配置必填、不默认生成；两台设备填写同一个标识才能互相同步
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void handleTestConnection()}
          className={SECONDARY_BUTTON_CLASS}
        >
          {busy === 'test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
          测试连接
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void handleSyncNow()}
          className={PRIMARY_BUTTON_CLASS}
        >
          {busy === 'sync' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          立即同步
        </button>
      </div>

      <div className="rounded-lg border border-border bg-background px-3 py-2 space-y-1">
        <div className="text-xs text-muted-foreground">最近同步：{lastSyncHint}</div>
        {status?.lastSyncError && (
          <div className="text-xs text-destructive">{status.lastSyncError}</div>
        )}
      </div>

      <p className="text-[11px] leading-5 text-muted-foreground">
        需自行部署 Cloudflare Worker 与 D1 数据库；同步密钥等价于整个工作区的钥匙，请勿分享；
        数据与费用由您自己的 Cloudflare 账号承担。
      </p>

      <Toast toast={toast} />
    </div>
  );
}
