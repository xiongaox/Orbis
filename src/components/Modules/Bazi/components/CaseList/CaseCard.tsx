/**
 * CaseCard - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染侧边栏案例卡片：左侧姓名/性别/分类/出生日期时辰，右侧四柱迷你排盘
 * - 仅日干保留五行色，其余干支压暗；年龄与日期合并为一行弱信息
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


// 五行文字色常量，仅用于日干
const ELEMENT_TEXT_COLOR: Record<string, string> = {
    木: 'text-[var(--element-wood)]',
    火: 'text-[var(--element-fire)]',
    土: 'text-[var(--element-earth)]',
    金: 'text-[var(--element-metal)]',
    水: 'text-[var(--element-water)]',
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
    // 四柱：年 月 日 时（每柱天干 + 地支）
    const pillars = getBaziPillarsFromDateString(item.birthDate ?? item.date);
    const pillarPairs = pillars.length === 8
        ? [0, 2, 4, 6].map(i => [pillars[i], pillars[i + 1]] as const)
        : [];

    const age = getAgeFromBirth(item.birthDate);

    // 仅日干使用五行色，其余干支统一压暗
    const dayGan = pillarPairs[2]?.[0] ?? '';
    const dayGanColor = ELEMENT_TEXT_COLOR[TIAN_GAN_WU_XING[dayGan] || ''] ?? '';
    const isMale = item.gender === '男';

    // 日期与时间拆成两段展示，与案例库卡片（SortableCaseCard）同一度量
    const birth = new Date(item.birthDate);
    const hasBirth = !Number.isNaN(birth.getTime());
    const pad = (n: number) => String(n).padStart(2, '0');
    const displayDate = hasBirth
        ? `${birth.getFullYear()}年${birth.getMonth() + 1}月${birth.getDate()}日`
        : item.date;
    const displayTime = hasBirth ? `${pad(birth.getHours())}:${pad(birth.getMinutes())}` : '';

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
            className={`group relative mb-2 w-full cursor-pointer select-none rounded-xl border px-3.5 py-3 text-left transition-colors ${isSelected
                ? 'border-primary/40 bg-card shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
                : 'border-border/40 bg-card hover:border-border/60 dark:border-border/30'
                }`}
        >
            <div className="flex items-center justify-between gap-3">
                {/* 左侧：姓名 / 性别 / 分类 / 出生日期时辰 */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
                        {/* 性别印章：专用性别色实底容器，同分类 chip 一套度量（demo shared.css .seal） */}
                        <span className={`inline-flex h-[21px] w-5 shrink-0 items-center justify-center rounded-md text-xs leading-none ${isMale
                            ? 'bg-[var(--gender-male-bg)] text-[var(--gender-male)]'
                            : 'bg-[var(--gender-female-bg)] text-[var(--gender-female)]'
                            }`}>
                            {isMale ? '乾' : '坤'}
                        </span>
                        {item.tags && item.tags.length > 0 && (
                            <span className="inline-flex h-5 shrink-0 items-center rounded-[5px] bg-primary/10 px-1.5 text-[13px] leading-none text-primary">
                                {item.tags[0]}
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <span>{displayDate}</span>
                        {displayTime && <span className="tabular-nums">{displayTime}</span>}
                        {age !== null && (
                            <>
                                <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-border" />
                                <span>{age}岁</span>
                            </>
                        )}
                    </div>
                </div>

                {/* 右侧：四列迷你排盘（干上支下），尺寸与案例库卡片一致 */}
                {pillarPairs.length > 0 && (
                    <div className="flex shrink-0 gap-[3px]">
                        {pillarPairs.map(([gan, zhi], i) => (
                            <div key={i} className="flex w-6 flex-col items-center font-serif leading-tight">
                                <span className={`text-[19px] font-semibold ${i === 2 ? dayGanColor : 'text-foreground/55'}`}>{gan}</span>
                                <span className="text-[19px] font-semibold text-foreground/55">{zhi}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 悬停时露出操作，浏览时列表保持安静。
                触屏上 hover / focus 会粘住（点一下就常驻），故仅在具备悬停能力的指针设备上按 hover/focus 露出；
                触屏改为「当前选中案例」常显，避免误触后按钮一直挂着 */}
            {isAuthenticated && (
                <div className={`mt-1.5 flex justify-end gap-1.5 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'} [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100`}>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onEdit(item.id);
                        }}
                        className="flex h-6 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                        aria-label="编辑案例"
                    >
                        <Pencil className="w-3 h-3" />
                        编辑
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete(item.id);
                        }}
                        className="flex h-6 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                        aria-label="删除案例"
                    >
                        <Trash2 className="w-3 h-3" />
                        删除
                    </button>
                </div>
            )}
        </div>
    );
}
