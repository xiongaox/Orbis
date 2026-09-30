/**
 * 模块定位：
 * - 所在层级：业务 hooks 层
 * - 主要目标：持有当前 toast 状态并按语气自动清除
 *
 * 关键职责：
 * - showToast(message, tone)：弹出新提示，重复调用会重置定时器
 * - 与 Common/Toast.tsx 视图组件配套使用
 *
 * 为什么独立成文件：此前各弹窗的操作反馈以内联段落挂在内容尾部，
 * 内容一长就被推出视口；统一收敛为顶部浮层后各处行为一致。
 
*/
import { useEffect, useRef, useState } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastState {
    id: number;
    message: string;
    tone: ToastTone;
}

// 三种语气统一 3s：足够读完一行反馈，又不至于挡住后续操作
const TOAST_DURATION_MS: Record<ToastTone, number> = {
    success: 3000,
    info: 3000,
    error: 3000,
};

export function useToast() {
    const [toast, setToast] = useState<ToastState | null>(null);
    const timerRef = useRef<number | undefined>(undefined);

    const showToast = (message: string, tone: ToastTone = 'success') => {
        if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
        setToast({ id: Date.now(), message, tone });
        timerRef.current = window.setTimeout(() => setToast(null), TOAST_DURATION_MS[tone]);
    };

    useEffect(() => () => {
        if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    }, []);

    return { toast, showToast };
}
