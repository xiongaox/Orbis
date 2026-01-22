/**
 * 断法右侧大纲导航组件
 */
import type { DuanFaOutlineItem } from '../../../../lib/caseStudy/duanfaData';

interface DuanFaOutlineProps {
    outline: DuanFaOutlineItem[];
    activeSectionId: string | null;
    onItemClick: (sectionId: string) => void;
}

export default function DuanFaOutline({ outline, activeSectionId, onItemClick }: DuanFaOutlineProps) {
    if (outline.length === 0) {
        return (
            <div className="w-[15%] min-w-[120px] bg-muted/10 border-l border-border/40 flex flex-col">
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
        <div className="w-[15%] min-w-[120px] bg-muted/10 border-l border-border/40 flex flex-col overflow-hidden">
            {/* 标题 */}
            <div className="py-3 px-3 border-b border-border/40 bg-muted/20 flex-shrink-0">
                <span className="text-xs font-medium text-muted-foreground">大纲</span>
            </div>

            {/* 大纲列表 */}
            <div className="flex-1 overflow-y-auto scrollbar-none py-2">
                {outline.map((item) => {
                    const isActive = activeSectionId === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onItemClick(item.id)}
                            className={`
                                w-full text-left py-1.5 px-3 transition-all
                                ${item.level === 1 ? '' : 'pl-5'}
                                ${isActive
                                    ? 'text-primary font-medium bg-primary/5'
                                    : 'text-muted-foreground hover:text-foreground/80 hover:bg-muted/20'
                                }
                            `}
                        >
                            <span
                                className={`
                                    block truncate
                                    ${item.level === 1 ? 'text-base font-medium' : 'text-sm'}
                                `}
                                title={item.title}
                            >
                                {item.title}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
