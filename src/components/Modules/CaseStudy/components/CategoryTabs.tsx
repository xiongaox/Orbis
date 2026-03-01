/**
 * CategoryTabs - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default CategoryTabs`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

interface Category {
    id: string;
    label: string;
    name: string;
}

interface CategoryTabsProps {
    categories: Category[];
    selectedId: string;
    onSelect: (id: string) => void;
    variant?: 'sidebar' | 'drawer';
}

export default function CategoryTabs({ categories, selectedId, onSelect, variant = 'sidebar' }: CategoryTabsProps) {
    if (variant === 'drawer') {
        return (
            <div className="w-full border-b border-border/40 bg-card/30 flex flex-col">
                <div className="py-2 px-4 border-b border-border/40 bg-card/50 flex items-center justify-between">
                    <span className="font-serif font-bold text-foreground/80">术数</span>
                    <span className="text-xs text-muted-foreground">左右滑动切换</span>
                </div>
                <div className="flex items-stretch overflow-x-auto scrollbar-none">
                    {categories.map(cat => {
                        const isActive = selectedId === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => onSelect(cat.id)}
                                className={`
                                    flex-shrink-0 px-4 py-3 flex flex-col items-center gap-0.5 transition-all
                                    border-r border-border/20 last:border-r-0
                                    ${isActive ? 'bg-primary/5' : 'hover:bg-muted/30'}
                                `}
                            >
                                <span className={`text-[10px] ${isActive ? 'text-[#d4b185]/80' : 'text-muted-foreground/50'}`}>
                                    {cat.label}
                                </span>
                                <span className={`text-sm font-serif ${isActive ? 'text-[#d4b185] font-bold' : 'text-muted-foreground'}`}>
                                    {cat.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="w-[5%] min-w-[80px] border-r border-border/40 bg-card/30 flex flex-col">
            <div className="py-3 text-center border-b border-border/40 bg-card/50">
                <span className="font-serif font-bold text-foreground/80">术数</span>
            </div>
            {categories.map(cat => {
                const isActive = selectedId === cat.id;
                return (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(cat.id)}
                        className={`
                            relative w-full py-3 px-2 flex flex-col items-center gap-1 transition-all
                            border-b border-border/20
                            ${isActive ? 'bg-primary/5' : 'hover:bg-muted/30'}
                        `}
                    >
                        {/* Active Indicator Line */}
                        {isActive && (
                            <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#d4b185] rounded-r-md" />
                        )}

                        {/* Label */}
                        <span className={`text-[10px] ${isActive ? 'text-[#d4b185]/80' : 'text-muted-foreground/50'}`}>
                            {cat.label}
                        </span>

                        {/* Value */}
                        <span className={`text-sm font-serif ${isActive ? 'text-[#d4b185] font-bold' : 'text-muted-foreground'}`}>
                            {cat.name}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
