/**
 * 奇门可拖拽案例卡片
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
            className={`p-3 rounded-lg transition-all cursor-pointer border relative group ${isSelected
                ? 'bg-sidebar-accent border-primary/30'
                : 'bg-card border-border/60 hover:border-border hover:shadow-sm'
                } ${isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
        >
            <div className="flex flex-col gap-2">
                {/* 标题 + 分类 */}
                <div className="flex items-center gap-1.5 mb-1 pr-14">
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        className="p-0.5 rounded hover:bg-secondary/50 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
                        aria-label="拖拽排序"
                    >
                        <GripVertical className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-medium text-foreground truncate">{caseData.title}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary/80 shrink-0">
                        {categoryName}
                    </span>
                </div>

                {/* 描述摘要 */}
                {caseData.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                        {caseData.description}
                    </div>
                )}

                {/* 日期 - 放在底部，为了不遮挡按钮可能需要 padding-right */}
                <div className="text-xs text-muted-foreground/70 font-mono pr-16">
                    {displayDate}
                </div>
            </div>

            {/* 右下角操作按钮 - 绝对定位 */}
            <div className="absolute bottom-3 right-3 flex gap-1 z-10 transition-opacity">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-1.5 rounded-md border border-border bg-card/80 backdrop-blur hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="编辑"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1.5 rounded-md border border-border bg-card/80 backdrop-blur hover:border-red-400 hover:bg-red-100 dark:hover:bg-destructive/20 text-muted-foreground hover:text-red-500 transition-colors"
                    aria-label="删除"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
