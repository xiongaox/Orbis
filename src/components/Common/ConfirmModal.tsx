/**
 * ConfirmModal - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：提供跨模块的通用 UI 组件
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default ConfirmModal`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `lucide-react`、内部模块 `BaseModal`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    // 'destructive' renders the confirm button in red
    variant?: 'default' | 'destructive';
}

import BaseModal from '../UI/BaseModal';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = '确定',
    cancelText = '取消',
    loading = false,
    variant = 'default'
}: ConfirmModalProps) {

    // Custom Title with Icon
    const headerTitle = (
        <div className="flex items-center gap-2">
            {variant === 'destructive' && (
                <AlertTriangle className="w-5 h-5 text-destructive" />
            )}
            <span>{title}</span>
        </div>
    );

    // Footer Actions
    const footerContent = (
        <>
            <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-border hover:bg-muted text-foreground focus-ring"
            >
                {cancelText}
            </button>
            <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm focus-ring
                    ${variant === 'destructive'
                        ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }
                `}
            >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {confirmText}
            </button>
        </>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            footer={footerContent}
            maxWidth="max-w-sm"
        >
            {description && (
                <div className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                </div>
            )}
        </BaseModal>
    );
}
