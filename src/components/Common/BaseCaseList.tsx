import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Search, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';

// 案例列表在移动端 / Pad 端装在 SideDrawer 里，抽屉关闭即整体卸载，重开后滚动位置归零。
// 这里按 scrollKey 在模块级缓存各列表的滚动位置，跨卸载/重挂载保留。
const scrollTopCache = new Map<string, number>();

interface BaseCaseListProps {
    variant?: 'sidebar' | 'drawer';
    /** 滚动位置缓存键（如 'bazi' / 'qimen'）：传入后关闭抽屉再打开可回到原滚动位置；
     *  列表项选中态需在卡片根节点标注 data-case-selected="true"，作为无缓存时的定位锚点 */
    scrollKey?: string;

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
    /** 操作按钮行的自定义动作（如排序按钮），渲染在新建按钮之前 */
    extraActions?: ReactNode;

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
    scrollKey,
    onOpenLibrary,
    renderFilter,
    search,
    onSearchChange,
    onExport,
    onImport,
    onCreate,
    extraActions,
    isLoading,
    isEmpty,
    emptyText,
    children,
    modals
    }: BaseCaseListProps) {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    // 每次挂载只定位一次（恢复位置或滚到选中案例），之后不干扰用户滚动
    const hasRestoredRef = useRef(false);

    // 卸载（抽屉关闭）时记录滚动位置，供下次挂载恢复
    useEffect(() => {
        if (!scrollKey) return;
        const el = scrollRef.current;
        return () => {
            if (el) scrollTopCache.set(scrollKey, el.scrollTop);
        };
    }, [scrollKey]);

    // 列表数据就绪后定位一次：优先恢复上次的滚动位置，没有则把当前选中案例滚到视野中央
    useLayoutEffect(() => {
        if (!scrollKey || isLoading || isEmpty || hasRestoredRef.current) return;
        const el = scrollRef.current;
        if (!el) return;
        hasRestoredRef.current = true;
        const saved = scrollTopCache.get(scrollKey) ?? 0;
        if (saved > 0) {
            el.scrollTop = saved;
            return;
        }
        el.querySelector<HTMLElement>('[data-case-selected="true"]')
            ?.scrollIntoView({ block: 'center' });
    }, [scrollKey, isLoading, isEmpty]);

    return (
        <aside className={variant === 'drawer'
            ? "w-full h-full select-none bg-card flex flex-col min-h-0"
            : "w-full h-full select-none bg-sidebar/5 border-r border-border/50 flex flex-col min-h-0"
        }>
            <div className={variant === 'drawer' ? 'p-3 border-b border-border/60 space-y-2 shrink-0' : 'p-4 border-b border-border/50 space-y-3 shrink-0'}>
                {/* 顶部：案例库与筛选。relative 供筛选下拉按整行宽度展开：
                    移动端抽屉只有 240px 上下，下拉若按固定宽度会超出抽屉被裁 */}
                <div className="relative flex items-center justify-between">
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
                        {extraActions}
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
            </div>

            {/* 列表内容区 */}
            <div
                ref={scrollRef}
                className={`flex-1 min-h-0 select-none overflow-y-auto ${variant === 'drawer' ? 'px-1.5 py-2' : 'p-4'}`}
                onContextMenu={(e) => e.preventDefault()}
            >
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
