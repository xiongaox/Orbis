/**
 * 模块定位：
 * - 主要目标：操作反馈卡片（右上角浮层，自动消失）
 *
 * 关键职责：
 * - 统一三端（桌面/平板/手机）呈现：右上角窄卡片，语义色小图标 + 消息
 * - 状态与定时由 hooks/useToast 管理，本组件只负责视图
 *
 * 为什么 portal 到 body：Toast 在 SubPage 等滚动容器内渲染时，
 * WebKit 会把 position:fixed 退化成相对容器定位而被裁剪（手机端完全看不到）。
 *
 * 视觉说明（2026-03 重构，demo 见 design-demos/toast/）：
 * - 此前是 36px 大圆底图标 + 粗语义色描边 + shadow-2xl，短消息时又重又空；
 *   现收敛为细边框 + 17px 语义色图标，颜色只落在图标上，状态靠图标形状与
 *   --status-* 前景色表达（深浅主题各一套，勿用 --success/--destructive 淡底色）。
 * - 宽度自适应内容（w-max + max-w）：短句是窄条，长文换行且图标顶对齐首行。
 */
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ToastState, ToastTone } from '../../hooks/useToast';

const TONE_STYLES: Record<ToastTone, { toneClass: string; icon: ReactNode }> = {
    success: {
        toneClass: 'text-status-success',
        icon: <CheckCircle2 className="h-[17px] w-[17px]" />,
    },
    error: {
        toneClass: 'text-status-destructive',
        icon: <XCircle className="h-[17px] w-[17px]" />,
    },
    info: {
        toneClass: 'text-status-info',
        icon: <Info className="h-[17px] w-[17px]" />,
    },
};

export default function Toast({ toast }: { toast: ToastState | null }) {
    if (!toast) return null;
    const tone = TONE_STYLES[toast.tone];
    return createPortal(
        <div
            key={toast.id}
            // 右上角浮层：安全区 + 页头高度之下，避免压住页头右上角的操作按钮
            className="fixed right-3 z-[200] w-max max-w-[min(22rem,calc(100vw-1.5rem))] animate-in fade-in slide-in-from-top-2 duration-200 sm:right-4"
            style={{ top: 'calc(var(--safe-area-inset-top, 0px) + 68px)' }}
            role="status"
            aria-live="polite"
        >
            {/* items-start：多行消息时图标顶对齐首行；mt-0.5 让 17px 图标与单行文字视觉居中 */}
            <div className="flex items-start gap-2 rounded-lg border border-border bg-popover py-2.5 pl-2.5 pr-3.5 shadow-lg">
                <span className={`mt-0.5 shrink-0 ${tone.toneClass}`}>{tone.icon}</span>
                <span className="min-w-0 text-sm font-medium leading-snug text-foreground break-words">
                    {toast.message}
                </span>
            </div>
        </div>,
        document.body,
    );
}
