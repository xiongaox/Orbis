import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, RefreshCw, Trash2 } from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import ConfirmModal from './ConfirmModal';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { webDavBackupService, type WebDavConfig } from '../../services/webdavBackupService';
import { s3BackupService, type S3Config } from '../../services/s3BackupService';
import type { RemoteBackupMethod } from '../../services/remoteBackupService';
import type { RemoteBackupMeta } from '../../services/remoteBackupShared';

interface RemoteBackupManagerModalProps {
  isOpen: boolean;
  method: RemoteBackupMethod;
  config: WebDavConfig | S3Config;
  onClose: () => void;
  onRestored: (filename: string) => void;
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
  const [message, setMessage] = useState('');
  const [pendingRestore, setPendingRestore] = useState<RemoteBackupMeta | null>(null);
  const [pendingDeletePaths, setPendingDeletePaths] = useState<string[] | null>(null);

  const pageCount = Math.max(1, Math.ceil(backups.length / PAGE_SIZE));
  const visibleBackups = useMemo(() => backups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [backups, page]);
  const allVisibleSelected = visibleBackups.length > 0 && visibleBackups.every((backup) => selectedPaths.has(backup.path));

  const loadBackups = async () => {
    setBusy('load');
    setMessage('');
    try {
      const nextBackups = method === 's3'
        ? await s3BackupService.listBackups(config as S3Config)
        : await webDavBackupService.listBackups(config as WebDavConfig);
      setBackups(nextBackups);
      setSelectedPaths((current) => new Set([...current].filter((path) => nextBackups.some((backup) => backup.path === path))));
      setPage((current) => Math.min(current, Math.max(1, Math.ceil(nextBackups.length / PAGE_SIZE))));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取备份列表失败');
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
    setMessage('');
    try {
      await Promise.all(paths.map(async (path) => {
        if (method === 's3') await s3BackupService.deleteBackup(config as S3Config, path);
        else await webDavBackupService.deleteBackup(config as WebDavConfig, path);
      }));
      await loadBackups();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '删除备份失败');
    } finally {
      setBusy(null);
    }
  };
  const restore = async (backup: RemoteBackupMeta) => {
    setBusy('restore');
    setMessage('');
    try {
      if (method === 's3') await s3BackupService.restore(config as S3Config, backup.path);
      else await webDavBackupService.restore(config as WebDavConfig, backup.path);
      onRestored(backup.filename);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '恢复备份失败');
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
      <div className="px-5 pt-5 text-base leading-6 text-muted-foreground">选择需要保留、恢复或删除的远端备份版本。列表固定分页显示，不会影响备份设置弹窗大小。</div>
      {message && <p className="mx-5 mt-3 rounded-lg bg-secondary/50 px-3 py-2.5 text-base text-foreground" role="status">{message}</p>}
      <div className="m-5 overflow-hidden rounded-xl border border-border">
        <div className={`hidden ${TABLE_GRID} items-center border-b border-border bg-secondary/30 px-3 py-3.5 text-left text-sm font-medium text-muted-foreground md:grid`}>
          <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} aria-label="选择当前页全部备份" className="h-4 w-4 accent-primary" />
          <span className="text-left">文件名</span><span className="text-left">修改时间</span><span className="text-left">文件大小</span><span className="text-left">操作</span>
        </div>
        {busy === 'load' ? <p className="px-4 py-12 text-center text-base text-muted-foreground">正在读取备份文件…</p> : visibleBackups.length === 0 ? <p className="px-4 py-12 text-center text-base text-muted-foreground">当前文件夹还没有备份版本。</p> : visibleBackups.map((backup) => (
          <div key={backup.path} className={`grid ${TABLE_GRID} border-b border-border/70 px-3 py-3.5 text-left last:border-b-0 md:items-center`}>
            <input type="checkbox" checked={selectedPaths.has(backup.path)} onChange={() => toggleSelection(backup.path)} aria-label={`选择 ${backup.filename}`} className="h-4 w-4 accent-primary" />
            <span className="truncate text-left font-mono text-sm text-foreground" title={backup.filename}>{backup.filename}</span>
            <span className="text-left text-sm text-muted-foreground">{formatDate(backup.createdAt)}</span>
            <span className="text-left text-sm text-muted-foreground">{formatSize(backup.size)}</span>
            <div className="flex items-center justify-start gap-1">
              <button type="button" onClick={() => setPendingRestore(backup)} disabled={busy !== null} className="rounded-md px-2 py-1.5 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"><Download className="mr-1 inline h-3.5 w-3.5" />{busy === 'restore' ? '恢复中' : '恢复'}</button>
              <button type="button" onClick={() => setPendingDeletePaths([backup.path])} disabled={busy !== null} className="rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50">删除</button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-3 px-5 pb-5 text-base text-muted-foreground">
        <span>{backups.length} 个备份 · {page} / {pageCount} 页</span>
        <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-md p-1.5 hover:bg-secondary disabled:opacity-40" aria-label="上一页"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="rounded-md p-1.5 hover:bg-secondary disabled:opacity-40" aria-label="下一页"><ChevronRight className="h-4 w-4" /></button>
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
        footer={<div className="flex items-center justify-end gap-3">{footerNode}</div>}
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
