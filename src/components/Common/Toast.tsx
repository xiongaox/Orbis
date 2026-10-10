/**
 * 模块定位：
 * - 主要目标：操作反馈卡片（右上角浮层，自动消失）
 *
 * 关键职责：
 * - 统一三端（桌面/平板/手机）呈现：右上角大卡片，图标 + 消息
 * - 状态与定时由 hooks/useToast 管理，本组件只负责视图
 *
 * 为什么 portal 到 body：Toast 在 SubPage 等滚动容器内渲染时，
 * WebKit 会把 position:fixed 退化成相对容器定位而被裁剪（手机端完全看不到）。
 */
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ToastState, ToastTone } from '../../hooks/useToast';

const TONE_STYLES: Record<ToastTone, { border: string; iconBg: string; icon: ReactNode }> = {
    success: {
        border: 'border-primary/40',
        iconBg: 'bg-primary/12 text-primary',
        icon: <CheckCircle2 className="h-5 w-5" />,
    },
    error: {
        border: 'border-destructive/50',
        iconBg: 'bg-destructive/12 text-destructive',
        icon: <AlertCircle className="h-5 w-5" />,
    },
    info: {
        border: 'border-border',
        iconBg: 'bg-muted text-muted-foreground',
        icon: <Info className="h-5 w-5" />,
    },
};

export default function Toast({ toast }: { toast: ToastState | null }) {
    if (!toast) return null;
    const tone = TONE_STYLES[toast.tone];
    return createPortal(
        <div
            key={toast.id}
            // 右上角浮层：安全区 + 页头高度之下，避免压住页头右上角的操作按钮
            className="fixed right-3 z-[200] w-[min(22rem,calc(100vw-1.5rem))] animate-in fade-in slide-in-from-top-2 duration-200 sm:right-4"
            style={{ top: 'calc(var(--safe-area-inset-top, 0px) + 68px)' }}
            role="status"
            aria-live="polite"
        >
            <div className={`flex items-start gap-3 rounded-xl border bg-card p-3.5 shadow-2xl sm:p-4 ${tone.border}`}>
                <span className={`shrink-0 grid h-9 w-9 place-items-center rounded-full ${tone.iconBg}`}>
                    {tone.icon}
                </span>
                <span className="min-w-0 flex-1 pt-1 text-sm font-medium leading-snug text-foreground break-words">
                    {toast.message}
                </span>
            </div>
        </div>,
        document.body,
    );
}
