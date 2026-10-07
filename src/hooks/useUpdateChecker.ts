/**
 * 模块定位：
 * - 「检查更新」逻辑聚合（移动端个人中心与桌面端用户菜单共用）
 * - 版本来源：GitHub 最新 Release 与当前版本（__APP_VERSION__，源自 tauri.conf.json）对比
 * - 网络策略（实测代理出口常对 api.github.com 限流/超时，而主站可达，直连则正好相反）：
 *   1) 主路径 GitHub API——覆盖直连与浏览器场景；
 *   2) 兜底仅 Tauri：请求 releases/latest 主站页，302 落地 /releases/tag/vX.Y.Z 后从
 *      页面 HTML 解析版本号（跨域重定向读不到 Location 头，只能扫落地页）
 * - 发现新版后再次调用 checkUpdate 打开 Release 下载页
 */
import { useState } from 'react';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { isTauriRuntime } from '../services/remoteBackupShared';
import { isNewerVersion } from '../lib/appChangelog';
import { openExternalUrl } from '../utils/browserUtil';

export type UpdateCheckState = 'idle' | 'checking' | 'latest' | 'newer' | 'error';

const API_URL = 'https://api.github.com/repos/xiongaox/Orbis/releases/latest';
const RELEASE_PAGE_URL = 'https://github.com/xiongaox/Orbis/releases/latest';
const API_TIMEOUT_MS = 6000;
const PAGE_TIMEOUT_MS = 10000;

async function requestWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
        const init: RequestInit = { signal: controller.signal };
        return isTauriRuntime() ? tauriFetch(url, init) : fetch(url, init);
    } finally {
        window.clearTimeout(timer);
    }
}

async function fetchLatestTag(): Promise<string> {
    // 主路径：GitHub API（CORS 已放行，浏览器与 Tauri 直连均可达）
    try {
        const res = await requestWithTimeout(API_URL, API_TIMEOUT_MS);
        if (res.ok) {
            const data = (await res.json()) as { tag_name?: string };
            const tag = (data.tag_name ?? '').trim().replace(/^v/i, '');
            if (/^\d+(\.\d+)*$/.test(tag)) return tag;
        }
    } catch {
        /* 主路径不可达时走主站兜底 */
    }

    // 兜底（仅 Tauri）：代理环境下 api 子域常不可达而主站可达，
    // releases/latest 重定向落地版本页，从 HTML 里的 /releases/tag/vX.Y.Z 解析
    if (!isTauriRuntime()) throw new Error('release api unavailable');
    const page = await requestWithTimeout(RELEASE_PAGE_URL, PAGE_TIMEOUT_MS);
    if (!page.ok) throw new Error(`HTTP ${page.status}`);
    const html = await page.text();
    const match = html.match(/\/releases\/tag\/(v?\d+(?:\.\d+)*)/i);
    if (!match) throw new Error('未在发布页解析到版本号');
    return match[1].replace(/^v/i, '');
}

export function useUpdateChecker() {
    const [updateState, setUpdateState] = useState<UpdateCheckState>('idle');
    const [latestVersion, setLatestVersion] = useState<string | null>(null);

    const checkUpdate = () => {
        if (updateState === 'checking') return;
        if (updateState === 'newer' && latestVersion) {
            void openExternalUrl('https://github.com/xiongaox/Orbis/releases/latest');
            return;
        }
        setUpdateState('checking');
        void (async () => {
            try {
                const tag = await fetchLatestTag();
                setLatestVersion(tag);
                setUpdateState(isNewerVersion(tag, __APP_VERSION__) ? 'newer' : 'latest');
            } catch {
                setUpdateState('error');
            }
        })();
    };

    return { updateState, latestVersion, checkUpdate } as const;
}
