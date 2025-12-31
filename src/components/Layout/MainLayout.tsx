import type { ReactNode } from 'react';

interface MainLayoutProps {
    sidebar?: ReactNode;
    insightPanel?: ReactNode;
    children: ReactNode;
}

/**
 * 统一布局结构组件
 * 左侧栏 + 中间内容 + 右侧栏
 */
export default function MainLayout({ sidebar, insightPanel, children }: MainLayoutProps) {
    return (
        <div className="flex flex-1 min-h-0 overflow-hidden">
            {sidebar && sidebar}
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
                {children}
            </main>
            {insightPanel && insightPanel}
        </div>
    );
}
