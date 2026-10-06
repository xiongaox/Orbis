
import React, { useLayoutEffect, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { pushBackHandler, popBackHandler } from '../../utils/androidBackButton';

let openModalCount = 0;
let previousBodyOverflow = '';

/**
 * 紧凑弹层标题：底部弹层等小头部场景使用（text-sm medium），
 * 区别于表单弹窗默认的 text-lg semibold 头部（如设置生日）。
 */
export function CompactModalTitle({ children }: { children: React.ReactNode }) {
    return <span className="text-sm font-medium text-foreground">{children}</span>;
}

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    /**
     * 标题内容。
     * - 传 ReactNode：由 BaseModal 统一摆放标题与关闭按钮（单行头部）。
     * - 传函数：调用方自行摆放（多行自定义头部场景），函数收到关闭按钮节点，
     *   需把它放进「标题行」内部，例如 `{(close) => <div><div>标题{close}</div><Tabs/></div>}`。
     *   这样 × 才会与标题行垂直居中，而不是被居中到整个多行块上。
     */
    title?: React.ReactNode | ((closeButton: React.ReactNode) => React.ReactNode);
    titleIcon?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string; // e.g. 'max-w-sm', 'max-w-md', 'max-w-4xl'；bottomSheet 场景请传 md:max-w-*（移动端始终全宽，仅 md+ 居中形态限宽）
    closeOnBackdropClick?: boolean;
    showCloseButton?: boolean;
    className?: string; // For the modal card itself
    bodyClassName?: string; // For the content wrapper
    fullScreen?: boolean; // 全屏模式（移动端适配）
    responsiveDrawer?: boolean; // 桌面端右侧抽屉，移动端保持居中弹窗
    drawerWidth?: string; // 桌面端抽屉宽度样式
    bottomSheet?: boolean; // 移动端底部滑出弹层（桌面端仍为居中弹窗）
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
    bottomSheet = false,
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

  // 安卓返回手势/返回键：把 onClose 压入返回栈，侧滑关闭最上层浮层（桌面端为 no-op）
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => onCloseRef.current();
    pushBackHandler(handler);
    return () => popBackHandler(handler);
  }, [isOpen]);

    if (!isOpen) return null;

    // 关闭按钮：图标 20px，靠 p-1.5 撑到 32px 热区；
    // -my-1.5 抵消纵向 padding，使按钮盒高等于 20px，父级 items-center 即让
    // 图标中心精确落在同行的文字中心；-mr-1.5 抵消横向 padding，
    // 使按钮右边缘贴齐头部 p-4 的 16px 内边距。
    const closeButton = showCloseButton ? (
        <button
            type="button"
            onClick={onClose}
            className="-my-1.5 -mr-1.5 p-1.5 shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors focus-ring"
            aria-label="Close"
        >
            <X className="w-5 h-5" />
        </button>
    ) : null;

    const isTitleRenderFn = typeof title === 'function';
    const renderedTitle = isTitleRenderFn
        ? (title as (close: React.ReactNode) => React.ReactNode)(closeButton)
        : title;

    // Portal 到 body：弹窗可能挂在 overflow 滚动容器内（如个人中心），
    // WebKit 下容器内的 position:fixed 会退化成相对容器定位而被底栏遮挡
    return createPortal(
        <div
            className={`fixed inset-0 z-[100] isolate flex ${
                bottomSheet
                    ? 'items-end justify-center bg-black/50 md:items-center md:p-4'
                    : responsiveDrawer
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
                    ${bottomSheet
                        ? `w-full ${maxWidth} max-h-[85vh] rounded-t-2xl border-t border-x-0 border-b-0 border-border animate-slide-up md:rounded-xl md:border md:animate-none`
                        : responsiveDrawer
                            ? `w-full ${maxWidth} max-h-[85vh] rounded-xl border border-border ${drawerWidth || 'md:w-[500px] lg:w-[580px] xl:w-[640px] md:max-w-[85vw] lg:max-w-[50vw]'} md:h-full md:max-h-screen md:rounded-none md:border-l md:border-y-0 md:border-r-0 md:border-border md:animate-slide-in-right`
                            : `${fullScreen ? '' : 'border border-border rounded-xl'} w-full ${maxWidth} ${fullScreen ? 'h-full' : 'max-h-[85vh]'}`
                    }
                    ${className}
                `}
                // 全屏弹层铺满屏幕，需自行避开系统栏；背景仍延伸到状态栏下方，
                // 只把内容顶下来。非全屏弹层居中且留有 p-4，无需处理。
                // 底部弹层贴底，底部同样需要避让系统手势条。
                style={
                    fullScreen
                        ? {
                            paddingTop: 'var(--safe-area-inset-top, 0px)',
                            paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
                        }
                        : bottomSheet
                            ? { paddingBottom: 'var(--safe-area-inset-bottom, 0px)' }
                            : undefined
                }
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header
                    ⚠️ 关闭按钮不能作为本行的 flex 兄弟节点：title 常被调用方塞进「多行自定义头部」
                    （如 PhysicsLogModal 的「标题行 + 全宽 Tab 条」），此时本行 items-center 是按
                    整个多行节点居中，× 会掉到第二行（实测偏低 24px）。
                    因此多行头部由调用方用 title 函数形式把按钮放进「标题行」内部；
                    这里的兄弟位按钮只服务于「title 是普通节点」的单行兜底。
                    （已用 Chrome 实测：多行场景 24px 偏差 → 0.00px，右边缘贴齐 16px。） */}
                {(title || showCloseButton) && (
                    <div className="p-4 border-b border-border shrink-0">
                        <div className="flex items-center gap-2 text-lg font-semibold text-foreground w-full" id="modal-title">
                            {titleIcon && <span className="text-primary shrink-0">{titleIcon}</span>}
                            <div className="flex-1 min-w-0">{renderedTitle}</div>
                            {showCloseButton && !isTitleRenderFn && closeButton}
                        </div>
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
                {/* ⚠️ 此处 sheet 闭合标签后不可留逗号：JSX 内的逗号会渲染成文本节点，
                    在 flex 弹层里成为约 4.6px 宽的匿名子项，把全宽弹层挤出一道右侧缝隙 */}
            </div>
        </div>,
        document.body,
    );
}
