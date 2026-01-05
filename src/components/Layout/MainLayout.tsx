import type { ReactNode } from 'react';

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
    return (
        <div className="flex flex-1 min-h-0 overflow-hidden">
            {sidebar && sidebar}
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
                {children}
            </main>
            {(liuYiPanel || insightPanel) && (
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
