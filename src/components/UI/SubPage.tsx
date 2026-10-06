/**
 * 模块定位：
 * - 主要目标：移动端二级页面壳，承载从弹窗迁移过来的整页界面
 *
 * 关键职责：
 * - 提供统一的页头版式：返回键 + 标题（可选图标）+ 右侧操作区
 * - 全屏铺满并避让系统栏：--safe-area-inset-* 由 MainActivity.kt 原生注入
 * - 接入 androidBackButton 返回栈：安卓边缘侧滑/返回键按打开顺序逐层关闭页面
 *
 * 使用约束：
 * - 仅移动端使用；桌面端各业务组件保留原弹窗布局（居中/右侧抽屉），不要强行换壳
 * - 页头右侧操作区放当前页的开关/按钮组（如流年/大运切换），不放关闭类按钮
 * - 页内 tab 切换用 tabBar 插槽挂 SubPageTabs，钉在页头正下方，不要塞进滚动正文
 
*/
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';
import { pushBackHandler, popBackHandler } from '../../utils/androidBackButton';

interface SubPageProps {
    isOpen: boolean;
    onClose: () => void;
    title: ReactNode;
    titleIcon?: ReactNode;
    /** 页头右侧操作区（当前页的常驻按钮/开关组） */
    actions?: ReactNode;
    /** 页头正下方的 tab 切换条（可选，配合 SubPageTabs 使用），不随正文滚动 */
    tabBar?: ReactNode;
    children: ReactNode;
    bodyClassName?: string;
    /** 需要钉在底部的操作条（可选） */
    footer?: ReactNode;
}

export default function SubPage({
    isOpen,
    onClose,
    title,
    titleIcon,
    actions,
    tabBar,
    children,
    bodyClassName = '',
    footer,
}: SubPageProps) {
    // 与 BaseModal 同款：onClose 走 ref，返回栈回调始终拿到最新闭包而不重注册
    const onCloseRef = useRef(onClose);
    useLayoutEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // 安卓返回手势/返回键：与 BaseModal 共用返回栈，按打开顺序逐层关闭
    useEffect(() => {
        if (!isOpen) return;
        const handler = () => onCloseRef.current();
        pushBackHandler(handler);
        return () => popBackHandler(handler);
    }, [isOpen]);

    if (!isOpen) return null;

    // Portal 到 body：二级页可能挂在 overflow 滚动容器内（如个人中心），
    // WebKit 下容器内的 position:fixed 会退化成相对容器定位而被底栏遮挡
    return createPortal(
        <div
            className="fixed inset-0 z-[60] isolate flex flex-col bg-background"
            role="dialog"
            aria-modal="true"
            style={{
                paddingTop: 'var(--safe-area-inset-top, 0px)',
                paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
            }}
        >
            {/* 统一页头：所有二级页面共用同一版式 */}
            <div className="h-14 shrink-0 flex items-center gap-1.5 px-2 border-b border-border">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="返回"
                    className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/70 transition-colors focus-ring cursor-pointer"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                {titleIcon && <span className="text-primary shrink-0">{titleIcon}</span>}
                <h1 className="flex-1 min-w-0 text-lg font-semibold text-foreground truncate">{title}</h1>
                {actions && <div className="shrink-0 flex items-center gap-2 pr-1">{actions}</div>}
            </div>
            {tabBar && <div className="shrink-0">{tabBar}</div>}
            <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${bodyClassName}`}>
                {children}
            </div>
            {footer && (
                <div className="shrink-0 border-t border-border bg-background px-4 py-3">{footer}</div>
            )}
        </div>,
        document.body,
    );
}
