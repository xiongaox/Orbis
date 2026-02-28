/**
 * 基础案例列表布局 (Base Case List Layout)
 * 提取了 Sidebar 结构的通用外围容器、搜索栏和操作按钮栏
 */
import type { ReactNode } from 'react';
import { Search, LogIn, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';

interface BaseCaseListProps {
    variant?: 'sidebar' | 'drawer';
    isAuthenticated: boolean;
    onLoginClick?: () => void;

    // Header actions
    onOpenLibrary?: () => void;
    renderFilter?: ReactNode; // 例如 Bazi 的 TagFilter 或 Qimen 的 Category Dropdown

    // Search
    search: string;
    onSearchChange: (val: string) => void;

    // Main Actions
    onExport?: () => void;
    onImport?: () => void;
    onCreate?: () => void;

    // Main Content
    isLoading: boolean;
    isEmpty: boolean;
    emptyText: string;
    children: ReactNode; // 列表项

    // Side Modals
    modals?: ReactNode;
}

export default function BaseCaseList({
    variant = 'sidebar',
    isAuthenticated,
    onLoginClick,
    onOpenLibrary,
    renderFilter,
    search,
    onSearchChange,
    onExport,
    onImport,
    onCreate,
    isLoading,
    isEmpty,
    emptyText,
    children,
    modals
}: BaseCaseListProps) {
    return (
        <aside className={variant === 'drawer'
            ? "w-full h-full bg-card flex flex-col min-h-0"
            : "w-full h-full bg-sidebar/5 border-r border-border/50 flex flex-col min-h-0"
        }>
            <div className={variant === 'drawer' ? 'p-3 border-b border-border/60 space-y-2 shrink-0' : 'p-4 border-b border-border/50 space-y-3 shrink-0'}>
                {/* 顶部：案例库与筛选 */}
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onOpenLibrary}
                        className="px-2 py-1 -ml-2 rounded-lg font-display text-base font-medium text-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        案例库
                        <Search className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </button>

                    {renderFilter}
                </div>

                {/* 搜索框 */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <input
                        type="text"
                        placeholder="搜索案例..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-card border border-border/40 hover:border-border/60 rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-light"
                    />
                </div>

                {/* 操作按钮 */}
                {isAuthenticated ? (
                    <div className="flex gap-2">
                        {onExport && (
                            <button
                                type="button"
                                onClick={onExport}
                                className="flex items-center justify-center px-2.5 py-2 bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                                title="导出案例"
                            >
                                <ArrowUpFromLine className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {onImport && (
                            <button
                                type="button"
                                onClick={onImport}
                                className="flex items-center justify-center px-2.5 py-2 bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                                title="导入案例"
                            >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {onCreate && (
                            <button
                                type="button"
                                onClick={onCreate}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors border border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                title="新建案例"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                新建
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onLoginClick}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary/50 hover:bg-secondary text-[hsl(var(--text-secondary-light))] hover:text-[hsl(var(--text-primary-light))] dark:text-muted-foreground dark:hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <LogIn className="w-4 h-4" />
                        登录后可保存案例
                    </button>
                )}
            </div>

            {/* 列表内容区 */}
            <div className={`flex-1 min-h-0 overflow-y-auto ${variant === 'drawer' ? 'px-1.5 py-2' : 'p-4'}`}>
                {isLoading ? (
                    <div className="text-center text-xs text-muted-foreground py-6">
                        加载中...
                    </div>
                ) : isEmpty ? (
                    <div className="text-center text-xs text-muted-foreground py-6 rounded-lg border border-dashed border-[hsl(var(--border-light))] dark:border-sidebar-border/70 bg-sidebar-accent/10">
                        {emptyText}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {children}
                    </div>
                )}
            </div>

            {/* 各类附属弹窗 */}
            {modals}
        </aside>
    );
}
