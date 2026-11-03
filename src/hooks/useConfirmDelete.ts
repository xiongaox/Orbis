import { useState } from 'react';

/**
 * 删除操作的二次确认状态编排（只放状态，不含 JSX，见 hooks/AGENTS.md）。
 * - request(target)：记录待删目标并打开确认弹窗
 * - confirm()：执行 onConfirm；成功关闭弹窗，失败保留以便重试
 * 具体错误提示由 onConfirm 内部负责（toast / console），这里只管弹窗生命周期。
 */
export function useConfirmDelete<T>(onConfirm: (target: T) => Promise<void> | void) {
    const [pending, setPending] = useState<T | null>(null);
    const [busy, setBusy] = useState(false);

    const request = (target: T) => setPending(target);
    const cancel = () => {
        if (!busy) setPending(null);
    };
    const confirm = async () => {
        if (pending === null) return;
        setBusy(true);
        try {
            await onConfirm(pending);
            setPending(null);
        } catch {
            // 失败时保留弹窗允许重试；具体错误已由 onConfirm 提示
        } finally {
            setBusy(false);
        }
    };

    return { pending, busy, request, cancel, confirm };
}
