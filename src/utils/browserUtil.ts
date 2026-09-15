/**
 * browserUtil - 浏览器与外部链接调用工具
 *
 * 关键职责：
 * - 在 Tauri 桌面客户端环境下通过 IPC 调用原生能力，使用系统默认浏览器打开外部链接
 * - 在普通 Web 浏览器环境下回退至 window.open
 */

import { isTauri, invoke } from '@tauri-apps/api/core';

export async function openExternalUrl(url: string): Promise<void> {
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
