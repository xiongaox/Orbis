/**
 * 关键职责：
 * - 渲染案例库卡片：乾/坤 印章、四列迷你排盘、出生日期时辰、年龄
 * - 左滑露出 编辑 / 删除，展开后点击卡片以外任意位置经 useSwipeDismiss 全局收起
 * - 拖拽手动排序已移除：案例顺序一律为数据源的新建顺序（创建时间）
*/
import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { getBaziPillarsFromDateString, getAgeFromBirth } from '../../../utils/lunarUtil';
import { getElementTextColor } from '../../../lib/xuan-bazi/maps';
import type { BaziCase } from '../../../services/baziCaseService';
import { useSwipeDismiss } from '../../../hooks/useSwipeDismiss';

const REVEAL_PX = 140;

interface SortableCaseCardProps {
    caseData: BaziCase;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export default function SortableCaseCard({
    caseData,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
}: SortableCaseCardProps) {
    // 左滑位移（px，负值向左）
    const [swipeX, setSwipeX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    // 起手时的手指坐标与卡片已有位移：位移叠加后双向跟手，右滑收回不再瞬移
    const dragStart = useRef({ x: 0, y: 0, offset: 0, locked: false, aborted: false });
    // 真实滑动后浏览器补发的 click 不当作点选（与 demo suppressClick 同思路）
    const suppressClick = useRef(false);
    // 长按守卫：按下后若在 350ms 内没有形成横向拖动，即判定为长按，本次手势不再触发左滑
    const longPressTimer = useRef<number | null>(null);
    // 展开态下点击卡片以外任意位置（空白/其他卡片）全局收起
    const rootRef = useRef<HTMLDivElement | null>(null);
    useSwipeDismiss(rootRef, swipeX !== 0, () => setSwipeX(0));

    const clearLongPress = () => {
        if (longPressTimer.current !== null) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    useEffect(() => () => {
        if (longPressTimer.current !== null) clearTimeout(longPressTimer.current);
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsSwiping(true);
        dragStart.current = { x: e.clientX, y: e.clientY, offset: swipeX, locked: false, aborted: false };
        suppressClick.current = false;
        clearLongPress();
        longPressTimer.current = window.setTimeout(() => {
            dragStart.current.aborted = true;
            setSwipeX(dragStart.current.offset);
            longPressTimer.current = null;
        }, 350);
        e.currentTarget.style.transition = 'none';
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isSwiping) return;
        const s = dragStart.current;
        if (s.aborted) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (!s.locked) {
            // 16px 死区内不表态：长按时的指尖抖动不应把卡片带走；超出后纵向占优即判定为滚动
            if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
            s.locked = true;
            if (Math.abs(dy) > Math.abs(dx)) {
                s.aborted = true;
                setSwipeX(s.offset);
                return;
            }
            // 已确认为横向拖动：撤销长按守卫，滑动后补发的 click 也不当作点选
            clearLongPress();
            suppressClick.current = true;
        }
        const delta = dx + s.offset;
        setSwipeX(Math.max(Math.min(0, delta), -REVEAL_PX));
    };

    const endSwipe = (e: React.PointerEvent<HTMLDivElement>) => {
        clearLongPress();
        if (!isSwiping) return;
        setIsSwiping(false);
        e.currentTarget.style.transition = '';
        // 被判定为滚动（aborted）或浏览器接管手势（pointercancel）时一律回到起手状态，杜绝滚动误驻留展开
        if (dragStart.current.aborted) {
            setSwipeX(dragStart.current.offset);
            return;
        }
        if (e.type === 'pointercancel') {
            setSwipeX(0);
            return;
        }
        // 松手按中线吸附：过半吸附展开，未过半收回，两侧对称
        setSwipeX(prev => (prev < -REVEAL_PX / 2 ? -REVEAL_PX : 0));
    };

    const handleCardClick = () => {
        // 真实滑动后的补发 click：吞掉一次，不当作点选
        if (suppressClick.current) {
            suppressClick.current = false;
            return;
        }
        // 已滑开时先收回，避免误触进入案例
        if (swipeX !== 0) {
            setSwipeX(0);
            return;
        }
        onSelect();
    };

    // 四柱：年 月 日 时（每柱天干 + 地支）
    const pillars = getBaziPillarsFromDateString(caseData.birth_date);
    const pillarPairs = pillars.length === 8
        ? [0, 2, 4, 6].map(i => [pillars[i], pillars[i + 1]] as const)
        : [];
    const age = getAgeFromBirth(caseData.birth_date);

    // 仅日干使用五行色，其余干支统一压暗
    const dayGan = pillarPairs[2]?.[0] ?? '';
    const dayGanColor = getElementTextColor(dayGan);

    const birth = new Date(caseData.birth_date);
    const hasValidBirth = !Number.isNaN(birth.getTime());
    const pad = (n: number) => String(n).padStart(2, '0');
    const displayDate = hasValidBirth
        ? `${birth.getFullYear()}年${birth.getMonth() + 1}月${birth.getDate()}日`
        : caseData.birth_date;
    const displayTime = hasValidBirth ? `${pad(birth.getHours())}:${pad(birth.getMinutes())}` : '';

    return (
        <div
            ref={rootRef}
            className={`relative select-none overflow-hidden rounded-xl border transition-colors ${isSelected
                ? 'border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]'
                : 'border-border/40'
                }`}
        >
            {/* 左滑露出的操作层：仅在拖动中或已展开时挂载，静止时不存在任何可透出的底层 */}
            {(isSwiping || swipeX !== 0) && (
                <div className="absolute inset-y-0 right-0 z-[1] flex">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSwipeX(0); onEdit(); }}
                        className="flex w-[70px] flex-col items-center justify-center gap-1 bg-secondary text-xs font-medium text-primary"
                        aria-label="编辑案例"
                    >
                        <Pencil className="h-4 w-4" />
                        编辑
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSwipeX(0); onDelete(); }}
                        className="flex w-[70px] flex-col items-center justify-center gap-1 bg-destructive/15 text-xs font-medium text-destructive"
                        aria-label="删除案例"
                    >
                        <Trash2 className="h-4 w-4" />
                        删除
                    </button>
                </div>
            )}

            {/* 卡片主体 */}
            <div
                role="button"
                tabIndex={0}
                onClick={handleCardClick}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect();
                    }
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endSwipe}
                onPointerCancel={endSwipe}
                onContextMenu={(e) => e.preventDefault()}
                style={{ transform: `translateX(${swipeX}px)`, transition: isSwiping ? 'none' : 'transform .18s' }}
                className={`relative z-[2] flex cursor-pointer touch-pan-y items-center gap-3 bg-card px-3.5 py-3 ${swipeX !== 0 ? '' : 'active:bg-secondary/40'}`}
            >
                {/* 左侧：姓名 / 性别 / 分类 / 出生日期时辰 */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{caseData.name}</span>
                        {/* 性别印章：专用性别色实底容器，同分类 chip 一套度量（demo shared.css .seal） */}
                        <span className={`inline-flex h-[21px] w-5 shrink-0 items-center justify-center rounded-md text-xs leading-none ${caseData.gender === 'male'
                            ? 'bg-[var(--gender-male-bg)] text-[var(--gender-male)]'
                            : 'bg-[var(--gender-female-bg)] text-[var(--gender-female)]'
                            }`}>
                            {caseData.gender === 'male' ? '乾' : '坤'}
                        </span>
                        {caseData.tags && caseData.tags.length > 0 && (
                            <span className="inline-flex h-5 shrink-0 items-center rounded-[5px] bg-primary/10 px-1.5 text-[13px] leading-none text-primary">
                                {caseData.tags[0]}
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <span>{displayDate}</span>
                        {displayTime && <span className="tabular-nums">{displayTime}</span>}
                        {age !== null && (<><span className="h-[3px] w-[3px] rounded-full bg-border" /><span>{age}岁</span></>)}
                    </div>
                </div>

                {/* 右侧：四列迷你排盘（干上支下），日干保留五行色，其余压暗 */}
                <div className="flex shrink-0 gap-[3px]">
                    {pillarPairs.map(([gan, zhi], i) => (
                        <div key={i} className="flex w-6 flex-col items-center font-serif leading-tight">
                            <span className={`text-[19px] font-semibold ${i === 2 ? dayGanColor : 'text-foreground/55'}`}>{gan}</span>
                            <span className="text-[19px] font-semibold text-foreground/55">{zhi}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
