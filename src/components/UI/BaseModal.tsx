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
    responsiveDrawer?: boolean; // 桌面端右侧抽屉，移动端保持居中弹窗
    drawerWidth?: string; // 桌面端抽屉宽度样式
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
    responsiveDrawer = false,
    drawerWidth,
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
            className={`fixed inset-0 z-[100] isolate flex ${
                responsiveDrawer
                    ? 'items-center justify-center p-4 bg-black/50 md:items-stretch md:justify-end md:p-0 md:bg-black/20 dark:md:bg-black/35 transition-colors duration-200'
                    : `items-center justify-center ${fullScreen ? 'p-0' : 'p-4'} bg-black/50`
            }`}
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
                    relative z-10 bg-background shadow-2xl flex flex-col
                    ${responsiveDrawer
                        ? `w-full ${maxWidth} max-h-[85vh] rounded-xl border border-border ${drawerWidth || 'md:w-[500px] lg:w-[580px] xl:w-[640px] md:max-w-[85vw] lg:max-w-[50vw]'} md:h-full md:max-h-screen md:rounded-none md:border-l md:border-y-0 md:border-r-0 md:border-border md:animate-slide-in-right`
                        : `${fullScreen ? '' : 'border border-border rounded-xl'} w-full ${maxWidth} ${fullScreen ? 'h-full' : 'max-h-[85vh]'}`
                    }
                    ${className}
                `}
                // 全屏弹层铺满屏幕，需自行避开系统栏；背景仍延伸到状态栏下方，
                // 只把内容顶下来。非全屏弹层居中且留有 p-4，无需处理。
                style={
                    fullScreen
                        ? {
                            paddingTop: 'var(--safe-area-inset-top, 0px)',
                            paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
                        }
                        : undefined
                }
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="relative p-4 border-b border-border shrink-0">
                        <div className="flex items-center gap-2 text-lg font-semibold text-foreground w-full" id="modal-title">
                            {titleIcon && <span className="text-primary shrink-0">{titleIcon}</span>}
                            <div className="flex-1 min-w-0">{title}</div>
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="absolute top-3.5 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring z-10"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className={`overflow-y-auto flex-1 min-h-0 overscroll-contain ${bodyClassName || 'p-6'}`}>
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
