/**
 * 云同步完成提示（2026-10-16）：
 * 监听调度器广播的 CLOUD_SYNC_DONE_EVENT（自动同步有数据流动时），
 * 弹出「已同步：推送 N 条，拉取 M 条」。挂载于 AppShell，桌面/移动统一。
 *
 * 为什么用事件而不是回调：调度器挂载在 Navbar，而移动端 Navbar 整体
 * 不渲染（return null）——事件广播解耦，提示组件在 AppShell 层常驻，
 * 任何端都能收到。
 */
import { useEffect } from 'react';
import Toast from './Toast';
import { useToast } from '../../hooks/useToast';
import {
  CLOUD_SYNC_DONE_EVENT,
  type SyncRunResult,
} from '../../services/cloudSyncService';

export default function CloudSyncToastListener() {
  const { toast, showToast } = useToast();

  useEffect(() => {
    const handler = (event: Event) => {
      const run = (event as CustomEvent<SyncRunResult>).detail;
      const parts: string[] = [];
      if (run.pushed > 0) parts.push(`推送 ${run.pushed} 条`);
      if (run.pulled > 0) parts.push(`拉取 ${run.pulled} 条`);
      if (run.conflicts > 0) parts.push(`冲突 ${run.conflicts} 条`);
      showToast(`已同步：${parts.join('，')}`, 'success');
    };
    window.addEventListener(CLOUD_SYNC_DONE_EVENT, handler);
    return () => window.removeEventListener(CLOUD_SYNC_DONE_EVENT, handler);
  }, [showToast]);

  return <Toast toast={toast} />;
}
