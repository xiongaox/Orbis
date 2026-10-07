/**
 * 模块定位：
 * - 「检查更新」逻辑聚合（移动端个人中心与桌面端用户菜单共用）
 * - 请求 GitHub 最新 Release 与当前版本（__APP_VERSION__，源自 tauri.conf.json）对比
 * - Tauri 环境走 Rust HTTP 通道直连 GitHub（系统代理/VPN 出口 IP 常被 GitHub API 限流
 *   403），浏览器环境走普通 fetch；发现新版后再次调用 checkUpdate 打开 Release 下载页
 */
import { useState } from 'react';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { isTauriRuntime } from '../services/remoteBackupShared';
import { isNewerVersion } from '../lib/appChangelog';
import { openExternalUrl } from '../utils/browserUtil';

export type UpdateCheckState = 'idle' | 'checking' | 'latest' | 'newer' | 'error';

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
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 10000);
        void (async () => {
            try {
                const request = (url: string, init: RequestInit) =>
                    isTauriRuntime() ? tauriFetch(url, init) : fetch(url, init);
                const res = await request('https://api.github.com/repos/xiongaox/Orbis/releases/latest', {
                    headers: { Accept: 'application/vnd.github+json' },
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()) as { tag_name?: string };
                const tag = (data.tag_name ?? '').trim().replace(/^v/i, '');
                if (!/^\d+(\.\d+)*$/.test(tag)) throw new Error('invalid tag');
                setLatestVersion(tag);
                setUpdateState(isNewerVersion(tag, __APP_VERSION__) ? 'newer' : 'latest');
            } catch {
                setUpdateState('error');
            } finally {
                window.clearTimeout(timer);
            }
        })();
    };

    return { updateState, latestVersion, checkUpdate } as const;
}
