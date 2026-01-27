/**
 * 奇门可拖拽案例卡片
 * 统一样式与八字案例卡片一致
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { type QimenCase, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';

interface QimenSortableCaseCardProps {
    caseData: QimenCase;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isDragging?: boolean;
}

export default function QimenSortableCaseCard({
    caseData,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
}: QimenSortableCaseCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: caseData.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    const displayDate = caseData.test_date ? new Date(caseData.test_date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }) : '无日期';

    const categoryName = QIMEN_CATEGORIES.find(c => c.id === caseData.category)?.name || '未知';

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${isSelected
                ? 'bg-card border border-primary/40 ring-1 ring-primary/20 shadow-md z-10'
                : 'bg-card shadow-[0_2px_6px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:z-10'
                } ${isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
        >
            <div className="flex items-start justify-between gap-2">
                {/* 左侧内容 */}
                <div className="min-w-0">
                    {/* 标题 + 拖拽 */}
                    <div className="flex items-center gap-1.5 mb-1">
                        <button
                            type="button"
                            {...attributes}
                            {...listeners}
                            onClick={(e) => e.stopPropagation()}
                            className="p-0.5 rounded hover:bg-secondary/50 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
                            aria-label="拖拽排序"
                        >
                            <GripVertical className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium text-foreground truncate">{caseData.title}</span>
                    </div>
                    {/* 描述摘要 */}
                    {caseData.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                            {caseData.description}
                        </div>
                    )}
                    {/* 日期 */}
                    <div className="text-xs text-muted-foreground">{displayDate}</div>
                </div>

                {/* 右侧内容 */}
                <div className="flex flex-col items-end justify-between shrink-0 self-stretch">
                    {/* 顶部：分类标签 */}
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary/80">
                        {categoryName}
                    </span>
                    {/* 底部：操作按钮 */}
                    <div className="flex gap-1.5">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-1.5 rounded-md border border-border hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                            aria-label="编辑"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1.5 rounded-md border border-border hover:border-red-400 hover:bg-red-100 dark:hover:bg-destructive/20 text-muted-foreground hover:text-red-500"
                            aria-label="删除"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
