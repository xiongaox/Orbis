/**
 * 可拖拽的案例卡片组件
 * 使用 dnd-kit 实现排序功能
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { getBaziPillarsFromDateString, getAgeFromBirth } from '../../utils/lunarUtil';
import { TIAN_GAN_WU_XING } from '../../lib/xuan-bazi/maps';
import type { BaziCase } from '../../services/baziCaseService';

// 五行背景和文字颜色
const ELEMENT_BG_10: Record<string, string> = {
    木: 'var(--element-wood-bg)',
    火: 'var(--element-fire-bg)',
    土: 'var(--element-earth-bg)',
    金: 'var(--element-metal-bg)',
    水: 'var(--element-water-bg)',
};
const ELEMENT_TEXT_COLOR: Record<string, string> = {
    木: 'var(--element-wood-text)',
    火: 'var(--element-fire-text)',
    土: 'var(--element-earth-text)',
    金: 'var(--element-metal-text)',
    水: 'var(--element-water-text)',
};

interface SortableCaseCardProps {
    caseData: BaziCase;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isDragging?: boolean;
}

export default function SortableCaseCard({
    caseData,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
}: SortableCaseCardProps) {
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

    // 计算显示数据
    const pillars = getBaziPillarsFromDateString(caseData.birth_date);
    const displayPillars = pillars.length === 8 ? [
        pillars[0], pillars[2], pillars[4], pillars[6],
        pillars[1], pillars[3], pillars[5], pillars[7]
    ] : pillars;
    const age = getAgeFromBirth(caseData.birth_date);
    const dayGan = displayPillars.length >= 3 ? displayPillars[2] : '';
    const dayGanElement = TIAN_GAN_WU_XING[dayGan] || '';
    const dayGanBg = ELEMENT_BG_10[dayGanElement];
    const dayGanColor = ELEMENT_TEXT_COLOR[dayGanElement];

    const displayDate = new Date(caseData.birth_date).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            className={`p-2.5 rounded-lg transition-all cursor-pointer border ${isSelected
                ? 'bg-sidebar-accent border-primary/30'
                : 'bg-card border-border/60 hover:border-border hover:shadow-sm'
                } ${isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
        >
            <div className="flex items-start justify-between gap-2">
                {/* 左侧内容 */}
                <div className="min-w-0">
                    {/* 姓名 + 性别 */}
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
                        <span className="text-sm font-medium text-foreground truncate">{caseData.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                            {caseData.gender === 'male' ? '男' : '女'}
                        </span>
                    </div>
                    {/* 日期 */}
                    <div className="text-xs text-muted-foreground mb-1.5">{displayDate}</div>
                    {/* 八字 2x4 */}
                    <div className="grid grid-cols-4 gap-1 w-fit">
                        {displayPillars.map((pillar, index) => (
                            <span
                                key={index}
                                style={index === 2 && (dayGanBg || dayGanColor)
                                    ? { backgroundColor: dayGanBg, color: dayGanColor }
                                    : undefined}
                                className="w-6 h-6 flex items-center justify-center text-xs bg-secondary/50 border border-border/30 rounded text-foreground/80 font-mono"
                            >
                                {pillar}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 右侧内容 */}
                <div className="flex flex-col items-end justify-between shrink-0 self-stretch">
                    {/* 顶部：标签 */}
                    {caseData.tags && caseData.tags.length > 0 ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary/80">
                            {caseData.tags[0]}
                        </span>
                    ) : <div />}
                    {/* 底部：年龄 + 操作按钮 */}
                    <div className="flex flex-col items-end gap-2">
                        {age !== null && (
                            <span className="text-xs text-muted-foreground">今年{age}岁</span>
                        )}
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
        </div>
    );
}
