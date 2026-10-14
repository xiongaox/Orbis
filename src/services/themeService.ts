/**
 * 主题（深浅色）持久化。
 *
 * theme 是唯一无法「只靠 SQLite」的设置：index.html 的内联脚本在 React 挂载前
 * 就同步读 localStorage 决定首屏底色，避免白闪；SQLite 是异步的，那一刻读不了。
 * 故采用双写：
 * - localStorage：仅供 index.html 内联脚本同步读取（首屏防闪），不作为真值源。
 * - SQLite(app_setting)：真值源，随备份跨设备同步；恢复备份后由 preloadTheme 对齐。
 */

import { readSetting, writeSetting } from './appSettingStore';

const THEME_KEY = 'theme';

function applyDomTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
}

/** 切换并持久化主题：双写 localStorage（防闪）与 SQLite（备份真值）。 */
export function persistTheme(isDark: boolean): void {
  applyDomTheme(isDark);
  try {
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  } catch { /* 防闪镜像写失败不影响主流程 */ }
  writeSetting(THEME_KEY, isDark ? 'dark' : 'light');
}

/**
 * 启动对齐：SQLite 里若有主题（例如恢复了备份），以它为准同步 localStorage 与 DOM，
 * 让跨设备/恢复来的主题即时生效。无记录时不动（沿用 index.html 已应用的首屏态）。
 */
export function preloadTheme(): void {
  const stored = readSetting<string>(THEME_KEY, '');
  if (stored !== 'dark' && stored !== 'light') return;
  const isDark = stored === 'dark';
  applyDomTheme(isDark);
  try {
    if (localStorage.getItem(THEME_KEY) !== stored) localStorage.setItem(THEME_KEY, stored);
  } catch { /* 忽略 */ }
}
