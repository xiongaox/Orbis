/**
 * Toast - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：轻量操作反馈小弹窗（页头下方居中浮层，自动消失）
 *
 * 关键职责：
 * - 固定渲染在页头下方的胶囊浮层，长文案截断
 * - 状态与定时由 hooks/useToast 管理，本组件只负责视图
 */
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ToastState, ToastTone } from '../../hooks/useToast';

const TONE_STYLES: Record<ToastTone, { border: string; icon: ReactNode }> = {
    success: { border: 'border-primary/40', icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" /> },
    error: { border: 'border-destructive/50', icon: <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" /> },
    info: { border: 'border-border', icon: <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> },
};

export default function Toast({ toast }: { toast: ToastState | null }) {
    if (!toast) return null;
    const tone = TONE_STYLES[toast.tone];
    return (
        <div
            key={toast.id}
            // 定位 = 安全区(原生注入) + 56px 页头 + 12px 间距，落在标题下方一点点；
            // 上一版用固定 top 值，在带状态栏避让的设备上会压住页头标题
            className="fixed left-1/2 z-[120] max-w-[86vw] -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ top: 'calc(var(--safe-area-inset-top, 0px) + 68px)' }}
            role="status"
            aria-live="polite"
        >
            <div className={`flex items-center gap-2 rounded-lg border bg-card px-4 py-2 shadow-lg ${tone.border}`}>
                {tone.icon}
                <span className="truncate text-xs font-medium text-foreground">{toast.message}</span>
            </div>
        </div>
    );
}
