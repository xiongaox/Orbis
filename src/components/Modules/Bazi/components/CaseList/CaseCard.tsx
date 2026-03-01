/**
 * CaseCard - 应用源码层
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
 * - `default CaseCard`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `lucide-react`、内部模块 `lunarUtil`、内部模块 `maps`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { Pencil, Trash2 } from 'lucide-react';
import { getBaziPillarsFromDateString, getAgeFromBirth } from '../../../../../utils/lunarUtil';
import { TIAN_GAN_WU_XING } from '../../../../../lib/xuan-bazi/maps';


// 五行背景色常量
const ELEMENT_BG_10: Record<string, string> = {
    木: 'var(--element-wood-bg)',
    火: 'var(--element-fire-bg)',
    土: 'var(--element-earth-bg)',
    金: 'var(--element-metal-bg)',
    水: 'var(--element-water-bg)',
};

// 五行文字色常量
const ELEMENT_TEXT_COLOR: Record<string, string> = {
    木: 'var(--element-wood-text)',
    火: 'var(--element-fire-text)',
    土: 'var(--element-earth-text)',
    金: 'var(--element-metal-text)',
    水: 'var(--element-water-text)',
};

interface CaseCardDisplayItem {
    id: string;
    name: string;
    date: string;
    gender: string;
    birthDate: string;
    tags?: string[];
}

interface CaseCardProps {
    item: CaseCardDisplayItem;
    isSelected: boolean;
    isAuthenticated: boolean;
    onSelectCase: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function CaseCard({
    item,
    isSelected,
    isAuthenticated,
    onSelectCase,
    onEdit,
    onDelete,
}: CaseCardProps) {
    const pillars = getBaziPillarsFromDateString(item.birthDate ?? item.date);
    const displayPillars = pillars.length === 8 ? [
        pillars[0], pillars[2], pillars[4], pillars[6],
        pillars[1], pillars[3], pillars[5], pillars[7]
    ] : pillars;
    const age = getAgeFromBirth(item.birthDate);
    const dayGan = displayPillars.length >= 3 ? displayPillars[2] : '';
    const dayGanElement = TIAN_GAN_WU_XING[dayGan] || '';
    const dayGanBg = ELEMENT_BG_10[dayGanElement];
    const dayGanColor = ELEMENT_TEXT_COLOR[dayGanElement];

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectCase(item.id)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectCase(item.id);
                }
            }}
            className={`group relative w-full text-left p-3 rounded-xl mb-2 transition-[box-shadow,transform] duration-300 cursor-pointer border ${isSelected
                ? 'bg-card border-primary/40 ring-1 ring-primary/20 shadow-md z-10'
                : 'bg-card border-border/40 dark:border-border/30 shadow-[0_2px_6px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:z-10 hover:border-border/60'
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                        <span className="text-xs text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground">{item.gender}</span>
                    </div>
                    <div className="text-xs text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground mb-2">{item.date}</div>
                    <div className="grid grid-cols-4 gap-1 w-fit">
                        {displayPillars.map((pillar, index) => (
                            <span
                                key={index}
                                style={index === 2 && (dayGanBg || dayGanColor)
                                    ? { backgroundColor: dayGanBg, color: dayGanColor }
                                    : undefined}
                                className={`w-6 h-6 flex items-center justify-center text-xs bg-[hsl(var(--muted-hover))] dark:bg-sidebar-accent/80 border rounded text-foreground/80 font-mono ${isSelected ? 'border-border' : 'border-[hsl(var(--border-lighter))] dark:border-sidebar-border/30'}`}
                            >
                                {pillar}
                            </span>
                        ))}
                    </div>
                </div>
                {isAuthenticated && (
                    <div className="flex flex-col items-end self-stretch">
                        {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap justify-end gap-1 mb-2 max-w-[96px]">
                                {item.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-[hsl(var(--accent-primary)/0.12)] text-[hsl(var(--accent-primary))] dark:bg-primary/10 dark:text-primary/80">
                                        {tag}
                                    </span>
                                ))}
                                {item.tags.length > 3 && (
                                    <span className="text-xs text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground">+{item.tags.length - 3}</span>
                                )}
                            </div>
                        )}
                        <div className="flex flex-col items-end gap-2 mt-auto">
                            {age !== null && (
                                <div className="text-xs text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground">今年{age}岁</div>
                            )}
                            <div className="flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onEdit(item.id);
                                    }}
                                    className="p-1.5 rounded-md border border-border hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                    aria-label="编辑案例"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onDelete(item.id);
                                    }}
                                    disabled={false} // Loading state handled by parent via ConfirmModal usually, but visual disable could be passed
                                    className="p-1.5 rounded-md border border-border hover:border-red-400 hover:bg-red-100 dark:hover:bg-destructive/20 text-muted-foreground hover:text-red-500 dark:hover:text-destructive disabled:opacity-60 disabled:cursor-not-allowed"
                                    aria-label="删除案例"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
