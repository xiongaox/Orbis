/**
 * 云同步自动调度（T08）。
 *
 * 触发时机：应用挂载、回到前台（visibilitychange）、网络恢复（online）、
 * 本地写入后延迟合并（轮询 outbox 计数，1.5 秒去抖）、运行期低频同步（15 秒）。
 *
 * 门控（暂停、指数退避、连续失败上限）全部在 syncNowAuto 内；
 * 未配置或未启用时 syncNow 直接返回 disabled，不产生任何网络请求。
 *
 * 不承诺操作系统级后台常驻：进程退出即停。
 *
 * 同步完成且有数据流动时广播 CLOUD_SYNC_DONE_EVENT（App 层监听提示）；
 * 无变更的同步保持静默。
 */
import { useEffect, useRef } from 'react';
import { syncNowAuto, CLOUD_SYNC_DONE_EVENT } from '../services/cloudSyncService';
import { localPrivateStore } from '../services/localPrivateStore';

/** 运行期低频同步间隔（毫秒）：15 秒（2026-10-16 用户确认调整；原方案
 * 定 30–60 秒取中 45 秒。拉取侧只有轮询一种机制，15 秒是用户体验
 * 与请求开销的平衡点；实时推送需协议层加 WebSocket/SSE 通道，属二期） */
const AUTO_SYNC_INTERVAL_MS = 15_000;
/** outbox 计数轮询间隔（毫秒）：纯本地读取，无网络开销 */
const OUTBOX_POLL_INTERVAL_MS = 2_000;
/** 本地写入后的合并去抖窗口（毫秒）：方案定 1–3 秒，取中 */
const WRITE_DEBOUNCE_MS = 1_500;

export function useCloudSyncScheduler(): void {
  const debounceTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    // 统一触发：同步完成后有数据流动时广播完成事件（App 层监听提示）
    const triggerSync = () => {
      void syncNowAuto().then((run) => {
        if (cancelled || !run) return;
        if (run.pushed > 0 || run.pulled > 0) {
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent(CLOUD_SYNC_DONE_EVENT, { detail: run }));
          }
        }
      });
    };

    const scheduleWriteSync = () => {
      // 本地写入后延迟合并：去抖窗口内的反复写入只触发一次同步
      if (debounceTimer.current !== undefined) window.clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => {
        debounceTimer.current = undefined;
        if (!cancelled) triggerSync();
      }, WRITE_DEBOUNCE_MS);
    };

    // 挂载即同步一次（收敛存量变更）
    triggerSync();

    // 运行期低频同步（以 pull 增量为主）
    const interval = window.setInterval(() => {
      if (!cancelled) triggerSync();
    }, AUTO_SYNC_INTERVAL_MS);

    // 本地写入检测：轮询待同步计数（本地读取，不产生网络请求）
    const poll = window.setInterval(() => {
      if (cancelled) return;
      void localPrivateStore.countOutbox().then((count) => {
        if (!cancelled && count > 0) scheduleWriteSync();
      });
    }, OUTBOX_POLL_INTERVAL_MS);

    // 回到前台 / 网络恢复：经过去抖合并后触发
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') scheduleWriteSync();
    };
    const onOnline = () => scheduleWriteSync();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearInterval(poll);
      if (debounceTimer.current !== undefined) window.clearTimeout(debounceTimer.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
    };
  }, []);
}
