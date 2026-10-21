import type { ReactNode } from 'react';

interface NavSidebarItem {
    id: string;
    label: string;
}

interface NavSidebarProps {
    title: ReactNode;
    widthClass: string;
    items: NavSidebarItem[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    variant?: 'sidebar' | 'drawer';
    /** 选中项左侧 1px 指示条 */
    showActiveBar?: boolean;
}

/** 断法/术数等窄列表侧栏的通用实现（标题栏 + 滚动列表 + 激活态） */
export default function NavSidebar({
    title,
    widthClass,
    items,
    selectedId,
    onSelect,
    variant = 'sidebar',
    showActiveBar = false,
}: NavSidebarProps) {
    const containerClassName = variant === 'drawer'
        ? 'w-full h-full border-b border-border/40 bg-card/30 flex flex-col overflow-hidden'
        : `${widthClass} border-r border-border/40 bg-card/30 flex flex-col overflow-hidden`;

    return (
        <div className={containerClassName}>
            {/* 标题：固定 40px，与常识篇目表头（.nav-header）等高 */}
            <div className="h-10 px-4 border-b border-border/40 bg-card/50 flex-shrink-0 flex items-center">
                <span className="font-serif text-sm font-bold text-foreground/80">{title}</span>
            </div>

            {/* 列表 */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
                {items.map((item) => {
                    const isActive = item.id === selectedId;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            className={`
                                w-full text-left h-10 px-3.5 flex items-center transition-all
                                border-b border-border/20 relative
                                ${isActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'hover:bg-muted/30 text-foreground/70'
                                }
                            `}
                        >
                            {isActive && showActiveBar && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                            )}
                            {/* 字号与常识篇目（.l2-item-btn）对齐，避免同类侧栏列表忽大忽小 */}
                            <span className="font-serif text-sm">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
