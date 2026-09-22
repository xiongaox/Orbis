/**
 * browserUtil - 浏览器与外部链接调用工具
 *
 * 关键职责：
 * - 安卓 WebView 内优先走原生桥（由 MainActivity.kt 注入，用 Intent 调起系统浏览器）
 * - 桌面客户端通过 Tauri IPC 调用原生能力打开外部链接
 * - 普通 Web 浏览器环境下回退至 window.open
 */

import { isTauri, invoke } from '@tauri-apps/api/core';

/** 安卓端注入的原生桥，见 MainActivity.kt 的 addJavascriptInterface。 */
interface OrbisNativeBridge {
  openUrl: (url: string) => void;
}

declare global {
  interface Window {
    OrbisNative?: OrbisNativeBridge;
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  // 安卓必须排在最前：Tauri 的 open_external_url 没有安卓实现，
  // 若先走 invoke 就会静默成功、连兜底都不会执行。
  if (typeof window !== 'undefined' && typeof window.OrbisNative?.openUrl === 'function') {
    try {
      window.OrbisNative.openUrl(url);
      return;
    } catch (err) {
      console.warn('通过安卓原生桥打开外部链接失败，回退至后续方式:', err);
    }
  }

  if (typeof window !== 'undefined' && isTauri()) {
    try {
      await invoke('open_external_url', { url });
      return;
    } catch (err) {
      console.warn('通过 Tauri 原生打开外部链接失败，回退至 window.open:', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
