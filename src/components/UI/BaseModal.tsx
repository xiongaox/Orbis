/**
 * BaseModal - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载前端具体功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default BaseModal`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import React, { useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';

let openModalCount = 0;
let previousBodyOverflow = '';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    titleIcon?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string; // e.g. 'max-w-sm', 'max-w-md', 'max-w-4xl'
    closeOnBackdropClick?: boolean;
    showCloseButton?: boolean;
    className?: string; // For the modal card itself
    bodyClassName?: string; // For the content wrapper
    fullScreen?: boolean; // 全屏模式（移动端适配）
}

export default function BaseModal({
    isOpen,
    onClose,
    title,
    titleIcon,
    children,
    footer,
    maxWidth = 'max-w-md',
    closeOnBackdropClick = true,
    showCloseButton = true,
    className = '',
    bodyClassName = '',
    fullScreen = false,
}: BaseModalProps) {
    const onCloseRef = useRef(onClose);

    useLayoutEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // Handle Escape key
    useLayoutEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCloseRef.current();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            if (openModalCount === 0) {
                previousBodyOverflow = document.body.style.overflow;
            }
            openModalCount += 1;
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (isOpen) {
                openModalCount = Math.max(0, openModalCount - 1);
                if (openModalCount === 0) {
                    document.body.style.overflow = previousBodyOverflow;
                }
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center ${fullScreen ? 'p-0' : 'p-4'} bg-black/50 backdrop-blur-[2px]`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            onClick={(e) => {
                if (e.target === e.currentTarget && closeOnBackdropClick) {
                    onClose();
                }
            }}
        >
            <div
                className={`
                    bg-background ${fullScreen ? '' : 'border border-border rounded-xl'} shadow-2xl flex flex-col 
                    w-full ${maxWidth} ${fullScreen ? 'h-full' : 'max-h-[85vh]'} 
                    ${className}
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 text-lg font-semibold text-foreground flex-1" id="modal-title">
                            {titleIcon && <span className="text-primary">{titleIcon}</span>}
                            {title}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring ml-auto"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className={`overflow-y-auto flex-1 ${bodyClassName || 'p-6'}`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
