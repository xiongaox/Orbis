/**
 * 断法右侧大纲导航组件
 */
import type { DuanFaOutlineItem } from '../../../../lib/caseStudy/duanfaData';

interface DuanFaOutlineProps {
    outline: DuanFaOutlineItem[];
    activeSectionId: string | null;
    onItemClick: (sectionId: string) => void;
    variant?: 'sidebar' | 'drawer';
}

export default function DuanFaOutline({ outline, activeSectionId, onItemClick, variant = 'sidebar' }: DuanFaOutlineProps) {
    const containerClassName = variant === 'drawer'
        ? 'w-full h-full bg-muted/10 border-t border-border/40 flex flex-col overflow-hidden'
        : 'w-[15%] min-w-[120px] bg-muted/10 border-l border-border/40 flex flex-col overflow-hidden';

    if (outline.length === 0) {
        return (
            <div className={containerClassName}>
                <div className="py-3 px-3 border-b border-border/40 bg-muted/20 flex-shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">大纲</span>
                </div>
                <div className="flex-1 flex items-center justify-center text-muted-foreground/40 text-xs">
                    暂无大纲
                </div>
            </div>
        );
    }

    return (
        <div className={containerClassName}>
            {/* 标题 */}
            <div className="py-3 px-3 border-b border-border/40 bg-muted/20 flex-shrink-0">
                <span className="text-xs font-medium text-muted-foreground">大纲</span>
            </div>

            {/* 大纲列表 */}
            <div className="flex-1 overflow-y-auto scrollbar-none py-2">
                {outline.map((item) => {
                    const isActive = activeSectionId === item.id;
                    // 计算缩进：基础 12px + 每级 12px
                    const paddingLeft = 12 + (item.level - 1) * 12;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onItemClick(item.id)}
                            className={`
                                w-full text-left py-1.5 pr-3 transition-all border-l-2
                                ${isActive
                                    ? 'text-primary font-medium bg-primary/5 border-primary'
                                    : 'text-muted-foreground border-transparent hover:text-foreground/80 hover:bg-muted/20'
                                }
                            `}
                            style={{ paddingLeft: `${paddingLeft}px` }}
                        >
                            <span
                                className={`
                                    block truncate
                                    ${item.level === 1 ? 'text-base font-medium' : 'text-sm'}
                                `}
                                title={item.title}
                            >
                                {item.level === 2 && <span className="mr-1 opacity-60 text-lg leading-none align-middle">•</span>}
                                {item.level > 2 && <span className="mr-1.5 opacity-40 text-[10px] leading-none align-middle">▪</span>}
                                {item.title}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
