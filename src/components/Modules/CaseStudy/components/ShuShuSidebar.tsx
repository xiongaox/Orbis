/**
 * 断法 - 术数分类侧边栏
 */
import { SHU_SHU_CATEGORIES } from '../../../../lib/caseStudy/duanfaCategories';

interface ShuShuSidebarProps {
    selectedId: string;
    onSelect: (id: string) => void;
    variant?: 'sidebar' | 'drawer';
}

export default function ShuShuSidebar({ selectedId, onSelect, variant = 'sidebar' }: ShuShuSidebarProps) {
    const containerClassName = variant === 'drawer'
        ? 'w-full h-full border-b border-border/40 bg-card/30 flex flex-col overflow-hidden'
        : 'w-[100px] min-w-[100px] border-r border-border/40 bg-card/30 flex flex-col overflow-hidden';

    return (
        <div className={containerClassName}>
            {/* 标题 */}
            <div className="py-3 px-4 border-b border-border/40 bg-card/50 flex-shrink-0">
                <span className="font-serif font-bold text-foreground/80">术数</span>
            </div>

            {/* 列表 */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
                {SHU_SHU_CATEGORIES.map((category) => {
                    const isActive = selectedId === category.id;
                    return (
                        <button
                            key={category.id}
                            onClick={() => onSelect(category.id)}
                            className={`
                                w-full text-left py-3 px-4 transition-all relative
                                border-b border-border/20
                                ${isActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'hover:bg-muted/30 text-foreground/70'
                                }
                            `}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                            )}
                            <span className="font-serif text-base">{category.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
