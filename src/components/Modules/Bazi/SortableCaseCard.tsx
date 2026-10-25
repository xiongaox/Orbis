/**
 * 关键职责：
 * - 渲染案例库卡片：乾/坤 印章、四列迷你排盘、出生日期时辰、年龄
 * - 右滑露出 编辑 / 删除（操作层在卡片左缘），展开后点击卡片以外任意位置经 useSwipeDismiss 全局收起
 * - 拖拽手动排序已移除：案例顺序一律为数据源的新建顺序（创建时间）
*/
import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { BaziCase, CaseTag } from '../../../services/baziCaseService';
import { useSwipeDismiss } from '../../../hooks/useSwipeDismiss';
import CaseCardBody from './components/CaseList/CaseCardBody';

const REVEAL_PX = 140;

interface SortableCaseCardProps {
    caseData: BaziCase;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    /** 当前浏览分组：案例含该标签时优先展示它，而非第一个标签 */
    preferredTag?: CaseTag | null;
}

export default function SortableCaseCard({
    caseData,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    preferredTag,
}: SortableCaseCardProps) {
    // 右滑位移（px，正值向右；与左侧抽屉「向左推回收起」反向，避免收侧栏时误触）
    const [swipeX, setSwipeX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    // 已确认为横向拖动：操作层仅在此时挂载。若在 pointerdown 就挂载，
    // 普通点击时按压态的半透明卡面（active:bg-secondary/40）会让按钮透出来闪一下
    const [dragConfirmed, setDragConfirmed] = useState(false);
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
            setDragConfirmed(true);
        }
        const delta = dx + s.offset;
        setSwipeX(Math.max(0, Math.min(REVEAL_PX, delta)));
    };

    const endSwipe = (e: React.PointerEvent<HTMLDivElement>) => {
        clearLongPress();
        if (!isSwiping) return;
        setIsSwiping(false);
        setDragConfirmed(false);
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
        setSwipeX(prev => (prev > REVEAL_PX / 2 ? REVEAL_PX : 0));
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

    return (
        <div
            ref={rootRef}
            className={`relative select-none overflow-hidden rounded-xl border transition-colors ${isSelected
                ? 'border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]'
                : 'border-border/40'
                }`}
        >
            {/* 右滑露出的操作层（按钮在卡片左缘）：仅在横向拖动确认或已展开时挂载，静止/普通点击时不存在任何可透出的底层 */}
            {(dragConfirmed || swipeX !== 0) && (
                <div className="absolute inset-y-0 left-0 z-[1] flex">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSwipeX(0); onDelete(); }}
                        className="flex w-[70px] flex-col items-center justify-center gap-1 bg-destructive/15 text-xs font-medium text-destructive"
                        aria-label="删除案例"
                    >
                        <Trash2 className="h-4 w-4" />
                        删除
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSwipeX(0); onEdit(); }}
                        className="flex w-[70px] flex-col items-center justify-center gap-1 bg-secondary text-xs font-medium text-primary"
                        aria-label="编辑案例"
                    >
                        <Pencil className="h-4 w-4" />
                        编辑
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
                className={`relative z-[2] flex cursor-pointer touch-pan-y items-center gap-3 bg-card px-3.5 py-3 ${swipeX !== 0 || dragConfirmed ? '' : 'active:bg-secondary/40'}`}
            >
                {/* 静态展示区（姓名/印章/chip/记事徽标/日期/四柱）由 CaseCardBody 共享渲染 */}
                <CaseCardBody
                    variant="library"
                    name={caseData.name}
                    isMale={caseData.gender === 'male'}
                    pillarSource={caseData.birth_date}
                    birthDate={caseData.birth_date}
                    dateFallback={caseData.birth_date}
                    tags={caseData.tags ?? []}
                    preferredTag={preferredTag}
                    lifeEventCount={caseData.life_events?.length ?? 0}
                />
            </div>
        </div>
    );
}
