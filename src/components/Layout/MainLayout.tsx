import { useMemo, useState } from 'react';
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

    return (
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
                {(sidebar || hasRightPanel) && (
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

                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {children}
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
