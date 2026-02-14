import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import SideDrawer from '../UI/SideDrawer';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useIsPadLandscape } from '../../hooks/useIsPadLandscape';
import { Library, Sparkles } from 'lucide-react';

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

    if (useDesktopLayout) {
        return (
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {sidebar && sidebar}
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

    const showTopBar = !isPadLandscape && (sidebar || hasRightPanel);

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

                    {/* Pad 横屏：左右贴边竖排入口（不占用顶部空间） */}
                    {isPadLandscape && sidebar && (
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(true)}
                            className={[
                                "absolute left-0 top-1/2 -translate-y-1/2 z-30",
                                "inline-flex flex-col items-center justify-center gap-2",
                                "h-[132px] w-[44px]",
                                "rounded-r-2xl border border-border/50 border-l-0",
                                "bg-card/90 shadow-[0_10px_22px_rgba(15,23,42,0.12)] ring-1 ring-black/5",
                                "dark:bg-background/45 dark:backdrop-blur-md dark:shadow-[0_10px_26px_rgba(0,0,0,0.35)] dark:ring-white/10",
                                "hover:bg-card hover:border-border/70 hover:shadow-[0_12px_28px_rgba(15,23,42,0.14)]",
                                "dark:hover:bg-background/60",
                                "active:translate-x-[1px] transition-[background-color,border-color,transform,box-shadow] duration-200",
                            ].join(' ')}
                            aria-label="打开案例"
                        >
                            <Library className="w-4 h-4 text-primary/80" />
                            <span
                                className="text-[12px] font-semibold text-foreground/85 tracking-[0.35em]"
                                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                            >
                                案例
                            </span>
                        </button>
                    )}

                    {isPadLandscape && hasRightPanel && (
                        <button
                            type="button"
                            onClick={() => setIsRightPanelOpen(true)}
                            className={[
                                "absolute right-0 top-1/2 -translate-y-1/2 z-30",
                                "inline-flex flex-col items-center justify-center gap-2",
                                "h-[132px] w-[44px]",
                                "rounded-l-2xl border border-border/50 border-r-0",
                                "bg-card/90 shadow-[0_10px_22px_rgba(15,23,42,0.12)] ring-1 ring-black/5",
                                "dark:bg-background/45 dark:backdrop-blur-md dark:shadow-[0_10px_26px_rgba(0,0,0,0.35)] dark:ring-white/10",
                                "hover:bg-card hover:border-border/70 hover:shadow-[0_12px_28px_rgba(15,23,42,0.14)]",
                                "dark:hover:bg-background/60",
                                "active:-translate-x-[1px] transition-[background-color,border-color,transform,box-shadow] duration-200",
                            ].join(' ')}
                            aria-label="打开参考面板"
                        >
                            <Sparkles className="w-4 h-4 text-primary/80" />
                            <span
                                className="text-[12px] font-semibold text-foreground/85 tracking-[0.35em]"
                                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                            >
                                参考
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
                    onClose={() => setIsSidebarOpen(false)}
                >
                    {sidebar}
                </SideDrawer>
            )}

            {hasRightPanel && (
                <SideDrawer
                    open={isRightPanelOpen}
                    title="参考面板"
                    side="right"
                    onClose={() => setIsRightPanelOpen(false)}
                >
                    <div className="h-full flex flex-col min-h-0 overflow-hidden">
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
                    </div>
                </SideDrawer>
            )}
        </div>
    );
}
