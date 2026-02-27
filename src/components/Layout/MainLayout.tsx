import { cloneElement, isValidElement, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import SideDrawer from '../UI/SideDrawer';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useIsPadLandscape } from '../../hooks/useIsPadLandscape';

interface MainLayoutProps {
    sidebar?: ReactNode;
    insightPanel?: ReactNode;
    liuYiPanel?: ReactNode;
    children: ReactNode;
}

/**
 * 统一布局结构组件
 * 左侧栏 + 中间内容 + 右侧栏（干支留意 + 智能咨询参考）
 */
export default function MainLayout({ sidebar, insightPanel, liuYiPanel, children }: MainLayoutProps) {
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const isPadLandscape = useIsPadLandscape();
    const useDesktopLayout = isDesktop && !isPadLandscape;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

    const hasRightPanel = useMemo(() => Boolean(liuYiPanel || insightPanel), [liuYiPanel, insightPanel]);

    const sidebarNode = useMemo(() => {
        if (!sidebar) return null;
        const variant = useDesktopLayout ? 'sidebar' : 'drawer';
        if (isValidElement(sidebar)) {
            return cloneElement(sidebar as React.ReactElement, {
                variant,
                ...(variant === 'drawer' ? { onDrawerClose: () => setIsSidebarOpen(false) } : {}),
            } as Record<string, unknown>);
        }
        return sidebar;
    }, [sidebar, useDesktopLayout]);

    if (useDesktopLayout) {
        return (
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {sidebarNode}
                <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
                    {children}
                </main>
                {hasRightPanel && (
                    <aside className="w-80 bg-card border-l border-border flex flex-col min-h-0 flex-shrink-0">
                        {liuYiPanel && (
                            <div className="border-b border-border">
                                {liuYiPanel}
                            </div>
                        )}
                        {insightPanel && (
                            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                                {insightPanel}
                            </div>
                        )}
                    </aside>
                )}
            </div>
        );
    }

    // 移动端和 Pad 端都使用竖线把手，不再显示顶部 bar
    const showTopBar = false;

    return (
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
                {showTopBar && (
                    <div className="px-3 py-2 border-b border-border/40 bg-background/70 backdrop-blur-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {sidebar && (
                                <button
                                    type="button"
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="px-3 py-1.5 rounded-lg border border-border bg-card/60 text-sm text-foreground hover:bg-muted/40 transition-colors"
                                >
                                    案例
                                </button>
                            )}
                            {hasRightPanel && (
                                <button
                                    type="button"
                                    onClick={() => setIsRightPanelOpen(true)}
                                    className="px-3 py-1.5 rounded-lg border border-border bg-card/60 text-sm text-foreground hover:bg-muted/40 transition-colors"
                                >
                                    参考面板
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
                    {children}

                    {/* Pad 横屏：隐藏式边缘“把手”（视觉占用小，但触摸面积大） */}
                    {sidebar && (
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(true)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-start group focus:outline-none"
                            aria-label="打开案例"
                        >
                            {/* 可见部分：细线；触摸/点击面积来自 button 的宽度 */}
                            <span className="w-[3px] h-20 rounded-r bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />

                            {/* 桌面 hover 提示（触控设备一般不出现） */}
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">
                                    案例
                                </span>
                            </span>
                        </button>
                    )}

                    {hasRightPanel && (
                        <button
                            type="button"
                            onClick={() => setIsRightPanelOpen(true)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-end group focus:outline-none"
                            aria-label="打开参考面板"
                        >
                            <span className="w-[3px] h-20 rounded-l bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />

                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">
                                    参考
                                </span>
                            </span>
                        </button>
                    )}
                </div>
            </main>

            {sidebar && (
                <SideDrawer
                    open={isSidebarOpen}
                    title="案例"
                    side="left"
                    hideHeader={isPadLandscape}
                    size={isPadLandscape ? 'xs' : 'xxs'}
                    onClose={() => setIsSidebarOpen(false)}
                >
                    {sidebarNode}
                </SideDrawer>
            )}

            {hasRightPanel && (
                <SideDrawer
                    open={isRightPanelOpen}
                    title="参考面板"
                    side="right"
                    hideHeader={isPadLandscape}
                    size={isPadLandscape ? 'md' : 'sm'}
                    onClose={() => setIsRightPanelOpen(false)}
                >
                    {/* 整体可滚动，干支留意可以滚出视野 */}
                    <div className="h-full overflow-y-auto">
                        {liuYiPanel && (
                            <div className="border-b border-border">
                                {liuYiPanel}
                            </div>
                        )}
                        {insightPanel && isValidElement(insightPanel)
                            ? cloneElement(insightPanel as React.ReactElement, { flat: true } as Record<string, unknown>)
                            : insightPanel
                        }
                    </div>
                </SideDrawer>
            )}
        </div>
    );
}
