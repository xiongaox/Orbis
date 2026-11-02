/**
 * 模块定位：
 * - 全局「关键点击」触感：给 button / [role=button] / a[href] 的点击统一补一个轻点震动
 *
 * 关键取舍：
 * - 用 click 而非 pointerdown：手指滚动经过按钮不会误震，只有真实点按才触发。
 * - 用捕获阶段（capture）：卡片删/编辑等按钮会 stopPropagation，冒泡到不了 document；
 *   捕获阶段照常触发，保证这类关键按钮也有反馈。
 * - 元素可加 data-haptic="off" 跳过、data-haptic="confirm" 加强（如删除确认）。
 *
 * 仅在 App 挂一次。
 */
import { useEffect } from 'react';
import { haptic, type HapticKind } from '../utils/haptics';

const SELECTOR = 'button, [role="button"], a[href], [data-haptic], .cursor-pointer';

export function useHapticClicks(): void {
    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const el = target.closest<HTMLElement>(SELECTOR);
            if (!el) return;
            if (el.getAttribute('data-haptic') === 'off') return;
            if (el instanceof HTMLButtonElement && el.disabled) return;
            if (el.getAttribute('aria-disabled') === 'true') return;
            const kind: HapticKind = el.getAttribute('data-haptic') === 'confirm' ? 'confirm' : 'tick';
            haptic(kind);
        };
        // 捕获阶段：即便元素自身的 onClick 里 stopPropagation 也能触发
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, []);
}
