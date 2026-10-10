import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Download, RefreshCw, Trash2 } from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import { useToast } from '../../hooks/useToast';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { webDavBackupService, type WebDavConfig } from '../../services/webdavBackupService';
import { s3BackupService, type S3Config } from '../../services/s3BackupService';
import type { RemoteBackupMethod } from '../../services/remoteBackupService';
import type { RemoteBackupMeta } from '../../services/remoteBackupShared';
import type { RestoreSummary } from '../../services/backupPackageService';

interface RemoteBackupManagerModalProps {
  isOpen: boolean;
  method: RemoteBackupMethod;
  config: WebDavConfig | S3Config;
  onClose: () => void;
  /** 恢复完成回调：带上恢复摘要，便于调用方提示恢复了多少条（空备份一眼可辨） */
  onRestored: (filename: string, summary: RestoreSummary) => void;
}

const PAGE_SIZE = 6;
const TABLE_GRID = 'md:grid-cols-[42px_minmax(0,1fr)_170px_110px_140px] md:gap-2';

function formatDate(value: string) {
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? value.replace('T', ' ') : new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date);
}

function formatSize(size: number | null) {
  if (size === null) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function RemoteBackupManagerModal({ isOpen, method, config, onClose, onRestored }: RemoteBackupManagerModalProps) {
  const [backups, setBackups] = useState<RemoteBackupMeta[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<'load' | 'restore' | 'delete' | null>(null);
  const { toast, showToast } = useToast();
  const [pendingRestore, setPendingRestore] = useState<RemoteBackupMeta | null>(null);
  const [pendingDeletePaths, setPendingDeletePaths] = useState<string[] | null>(null);

  const pageCount = Math.max(1, Math.ceil(backups.length / PAGE_SIZE));
  const visibleBackups = useMemo(() => backups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [backups, page]);
  const allVisibleSelected = visibleBackups.length > 0 && visibleBackups.every((backup) => selectedPaths.has(backup.path));
  // 全选针对全部备份（跨分页）：选中集在刷新时按现存列表裁剪，size 达到总数即为全选
  const allSelected = backups.length > 0 && selectedPaths.size >= backups.length;

  const toggleAllSelection = () => {
    setSelectedPaths(allSelected ? new Set() : new Set(backups.map((backup) => backup.path)));
  };

  const loadBackups = async () => {
    setBusy('load');
    try {
      const nextBackups = method === 's3'
        ? await s3BackupService.listBackups(config as S3Config)
        : await webDavBackupService.listBackups(config as WebDavConfig);
      setBackups(nextBackups);
      setSelectedPaths((current) => new Set([...current].filter((path) => nextBackups.some((backup) => backup.path === path))));
      setPage((current) => Math.min(current, Math.max(1, Math.ceil(nextBackups.length / PAGE_SIZE))));
    } catch (error) {
      showToast(error instanceof Error ? error.message : '读取备份列表失败', 'error');
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
    setSelectedPaths(new Set());
    void loadBackups();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelection = (path: string) => {
    setSelectedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };
  const toggleVisibleSelection = () => {
    setSelectedPaths((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleBackups.forEach((backup) => next.delete(backup.path));
      else visibleBackups.forEach((backup) => next.add(backup.path));
      return next;
    });
  };
  const deleteBackups = async (paths: string[]) => {
    if (paths.length === 0) return;
    setBusy('delete');
    try {
      await Promise.all(paths.map(async (path) => {
        if (method === 's3') await s3BackupService.deleteBackup(config as S3Config, path);
        else await webDavBackupService.deleteBackup(config as WebDavConfig, path);
      }));
      await loadBackups();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除备份失败', 'error');
    } finally {
      setBusy(null);
    }
  };
  const restore = async (backup: RemoteBackupMeta) => {
    setBusy('restore');
    try {
      const summary = method === 's3'
        ? await s3BackupService.restore(config as S3Config, backup.path)
        : await webDavBackupService.restore(config as WebDavConfig, backup.path);
      onRestored(backup.filename, summary);
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '恢复备份失败', 'error');
    } finally {
      setBusy(null);
    }
  };
  const confirmRestore = async () => {
    if (!pendingRestore) return;
    const backup = pendingRestore;
    await restore(backup);
    setPendingRestore(null);
  };
  const confirmDelete = async () => {
    if (!pendingDeletePaths) return;
    const paths = pendingDeletePaths;
    await deleteBackups(paths);
    setPendingDeletePaths(null);
  };

  // 移动端检测（该组件无 isOpen 早退，hooks 顺序天然稳定）
  const { isMobile } = useLayoutMode();

  // 正文：移动端 SubPage 与桌面端 BaseModal 共用
  const bodyContent = (
    <>
      <Toast toast={toast} />
      {/* 「分页不影响弹窗大小」是桌面弹窗才需要交代的事，移动端二级页面不带这句 */}
      <div className={`${isMobile ? 'text-sm' : 'text-base'} px-5 pt-5 leading-6 text-muted-foreground`}>
        {isMobile
          ? '选择需要保留、恢复或删除的远端备份版本。'
          : '选择需要保留、恢复或删除的远端备份版本。列表固定分页显示，不会影响备份设置弹窗大小。'}
      </div>
      <div className="m-5 overflow-hidden rounded-xl border border-border">
        <div className={`hidden ${TABLE_GRID} items-center border-b border-border bg-secondary/30 px-3 py-3.5 text-left text-sm font-medium text-muted-foreground md:grid`}>
          <label className="flex h-4 w-4 cursor-pointer items-center justify-center">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} aria-label="选择当前页全部备份" className="peer sr-only" />
            <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 ${allVisibleSelected ? 'bg-primary border-primary' : 'border-muted-foreground/50 bg-background hover:border-primary/50'}`}>
              {allVisibleSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </span>
          </label>
          <span className="text-left">文件名</span><span className="text-left">修改时间</span><span className="text-left">文件大小</span><span className="text-left">操作</span>
        </div>
        {busy === 'load' ? <p className="px-4 py-12 text-center text-base text-muted-foreground">正在读取备份文件…</p> : visibleBackups.length === 0 ? <p className="px-4 py-12 text-center text-base text-muted-foreground">当前文件夹还没有备份版本。</p> : visibleBackups.map((backup) => (
          <div key={backup.path} className="flex items-start gap-3 border-b border-border/70 px-4 py-3 text-left last:border-b-0 md:grid md:grid-cols-[42px_minmax(0,1fr)_170px_110px_140px] md:items-center md:gap-2 md:px-3 md:py-3.5">
            <label className="mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center md:mt-0">
              <input type="checkbox" checked={selectedPaths.has(backup.path)} onChange={() => toggleSelection(backup.path)} aria-label={`选择 ${backup.filename}`} className="peer sr-only" />
              <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 ${selectedPaths.has(backup.path) ? 'bg-primary border-primary' : 'border-muted-foreground/50 bg-background hover:border-primary/50'}`}>
                {selectedPaths.has(backup.path) && <Check className="h-3 w-3 text-primary-foreground" />}
              </span>
            </label>
            <div className="min-w-0 flex-1 md:contents">
              <span className="block truncate font-mono text-sm text-foreground" title={backup.filename}>{backup.filename}</span>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground md:contents">
                <span className="md:text-left md:text-sm">{formatDate(backup.createdAt)}</span>
                <span className="md:hidden" aria-hidden="true">·</span>
                <span className="md:text-left md:text-sm">{formatSize(backup.size)}</span>
              </div>
              <div className="-mr-2 mt-1.5 flex items-center justify-end gap-1 md:mr-0 md:mt-0 md:justify-start">
                <button type="button" onClick={() => setPendingRestore(backup)} disabled={busy !== null} className="min-h-10 rounded-md px-2.5 py-1.5 text-sm text-primary hover:bg-primary/10 disabled:opacity-50 md:min-h-0 md:px-2"><Download className="mr-1 inline h-3.5 w-3.5" />{busy === 'restore' ? '恢复中' : '恢复'}</button>
                <button type="button" onClick={() => setPendingDeletePaths([backup.path])} disabled={busy !== null} className="min-h-10 rounded-md px-2.5 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50 md:min-h-0 md:px-2">删除</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 px-5 pb-5 text-base text-muted-foreground">
        <div className="flex min-w-0 items-center gap-3">
          {/* 全选（跨分页）：桌面端表头已有本页全选框，这里仅移动端展示 */}
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-foreground md:min-h-0 md:hidden">
            <input type="checkbox" checked={allSelected} onChange={toggleAllSelection} aria-label="选择全部备份" className="peer sr-only" />
            <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 ${allSelected ? 'bg-primary border-primary' : 'border-muted-foreground/50 bg-background hover:border-primary/50'}`}>
              {allSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </span>
            全选
          </label>
          <span className="truncate">{backups.length} 个备份 · {page} / {pageCount} 页</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-md p-1.5 hover:bg-secondary disabled:opacity-40" aria-label="上一页"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="rounded-md p-1.5 hover:bg-secondary disabled:opacity-40" aria-label="下一页"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </>
  );

  const footerNode = (
    <>
      <button type="button" onClick={() => void loadBackups()} disabled={busy !== null} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground hover:bg-secondary/50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy === 'load' ? 'animate-spin' : ''}`} />刷新</button>
      <button type="button" onClick={() => setPendingDeletePaths([...selectedPaths])} disabled={busy !== null || selectedPaths.size === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-destructive px-3 text-sm text-destructive-foreground hover:opacity-90 disabled:opacity-50"><Trash2 className="h-4 w-4" />删除所选（{selectedPaths.size}）</button>
    </>
  );

  // 移动端：统一二级页面壳（返回手势 + 统一页头）
  if (isMobile) {
    return (
      <SubPage
        isOpen={isOpen}
        onClose={onClose}
        title="备份文件管理"
        footer={<div className="flex items-center justify-between gap-3">{footerNode}</div>}
      >
        {bodyContent}
        <ConfirmModal
          isOpen={pendingRestore !== null}
          onClose={() => { if (busy !== 'restore') setPendingRestore(null); }}
          onConfirm={() => { void confirmRestore(); }}
          title="确认恢复备份"
          description={pendingRestore ? <>将恢复备份“{pendingRestore.filename}”。当前本地数据可能被补充或更新。</> : undefined}
          confirmText={busy === 'restore' ? '恢复中…' : '确认恢复'}
          loading={busy === 'restore'}
        />
        <ConfirmModal
          isOpen={pendingDeletePaths !== null}
          onClose={() => { if (busy !== 'delete') setPendingDeletePaths(null); }}
          onConfirm={() => { void confirmDelete(); }}
          title="确认删除备份"
          description={pendingDeletePaths ? `确认删除 ${pendingDeletePaths.length} 个备份版本吗？此操作无法撤销。` : undefined}
          confirmText={busy === 'delete' ? '删除中…' : '确认删除'}
          loading={busy === 'delete'}
          variant="destructive"
        />
      </SubPage>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="备份文件管理"
      maxWidth="max-w-4xl"
      bodyClassName="p-0"
      footer={footerNode}
    >
      {bodyContent}
      <ConfirmModal
        isOpen={pendingRestore !== null}
        onClose={() => { if (busy !== 'restore') setPendingRestore(null); }}
        onConfirm={() => { void confirmRestore(); }}
        title="确认恢复备份"
        description={pendingRestore ? <>将恢复备份“{pendingRestore.filename}”。当前本地数据可能被补充或更新。</> : undefined}
        confirmText={busy === 'restore' ? '恢复中…' : '确认恢复'}
        loading={busy === 'restore'}
      />
      <ConfirmModal
        isOpen={pendingDeletePaths !== null}
        onClose={() => { if (busy !== 'delete') setPendingDeletePaths(null); }}
        onConfirm={() => { void confirmDelete(); }}
        title="确认删除备份"
        description={pendingDeletePaths ? `确认删除 ${pendingDeletePaths.length} 个备份版本吗？此操作无法撤销。` : undefined}
        confirmText={busy === 'delete' ? '删除中…' : '确认删除'}
        loading={busy === 'delete'}
        variant="destructive"
      />
    </BaseModal>
  );
}
