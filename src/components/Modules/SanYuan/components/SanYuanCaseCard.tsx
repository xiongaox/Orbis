/**
 * 关键职责：
 * - 三元案例卡片（侧栏与案例库弹窗共用同一排版），左右两列结构：
 *   · 左列自上而下：标题、标签（阳宅/阴宅）、地点
 *   · 右列自上而下：X山X向、X运X卦、更新日期时间
 * - 编辑 / 删除由常驻改为左滑露出（与奇门/八字卡片同一手势规格），
 *   展开后点击卡片以外任意位置经 useSwipeDismiss 全局收起
 *
 * 排版约束：
 * - 右列三行右对齐，坐向为该卡片的盘面身份信息作轻度强调；
 *   日期时间用 tabular-nums 防数字跳动。
 */

import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
    SANYUAN_CASE_TYPES,
    type SanYuanCase,
    type SanYuanCaseType,
} from '../../../../services/sanyuanCaseService';
import { useSwipeDismiss } from '../../../../hooks/useSwipeDismiss';

/** 左滑露出的操作区宽度，与奇门/八字 CaseCard 保持同一度量 */
const REVEAL_PX = 120;
/** 超过该位移即判定为「打开」，否则回弹 */
const OPEN_THRESHOLD = 34;

function getCaseTypeName(caseType: SanYuanCaseType): string {
    return SANYUAN_CASE_TYPES.find((item) => item.id === caseType)?.name ?? caseType;
}

interface SanYuanCaseCardProps {
    caseData: SanYuanCase;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export default function SanYuanCaseCard({
    caseData,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
}: SanYuanCaseCardProps) {
    const caseTypeName = getCaseTypeName(caseData.case_type);
    const updatedAt = new Date(caseData.updated_at);
    const pad = (n: number) => String(n).padStart(2, '0');
    const displayDateTime = !Number.isNaN(updatedAt.getTime())
        ? `${updatedAt.getFullYear()}-${pad(updatedAt.getMonth() + 1)}-${pad(updatedAt.getDate())} ${pad(updatedAt.getHours())}:${pad(updatedAt.getMinutes())}`
        : '';

    // ---- 左滑露出 编辑 / 删除（手势规格与奇门 CaseCard 完全一致）----
    const [swipeX, setSwipeX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const gesture = useRef({ x: 0, y: 0, base: 0, lock: null as null | 'x' | 'y', moved: false });
    // 真实滑动后浏览器补发的 click 不应被当作点选
    const suppressClick = useRef(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    useSwipeDismiss(rootRef, swipeX !== 0, () => setSwipeX(0));

    const handlePointerDown = (event: ReactPointerEvent) => {
        gesture.current = { x: event.clientX, y: event.clientY, base: swipeX, lock: null, moved: false };
    };

    const handlePointerMove = (event: ReactPointerEvent) => {
        // 鼠标悬停（未按任何键）同样会派发 pointermove：直接忽略，避免卡片粘着光标滑走
        if (event.buttons === 0) return;
        const g = gesture.current;
        if (g.lock === null) {
            const dx = event.clientX - g.x;
            const dy = event.clientY - g.y;
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
            // 纵向意图交还给列表滚动，避免与滚动抢手势
            if (Math.abs(dy) > Math.abs(dx)) { g.lock = 'y'; return; }
            g.lock = 'x';
            setIsSwiping(true);
        }
        if (g.lock !== 'x') return;
        const next = Math.max(-REVEAL_PX, Math.min(0, g.base + (event.clientX - g.x)));
        g.moved = true;
        setSwipeX(next);
    };

    const endSwipe = () => {
        const g = gesture.current;
        if (g.lock === 'x' && g.moved) {
            setSwipeX(swipeX < -OPEN_THRESHOLD ? -REVEAL_PX : 0);
            suppressClick.current = true;
        }
        setIsSwiping(false);
        g.lock = null;
    };

    const stop = (event: ReactMouseEvent) => event.stopPropagation();

    const handleSelect = () => {
        if (suppressClick.current) { suppressClick.current = false; return; }
        // 已展开时，点卡片本体先收起而非选中
        if (swipeX !== 0) { setSwipeX(0); return; }
        onSelect();
    };

    /** 统一标签规格：线框 + 文案，与奇门卡片标签同款 */
    const chipClass = 'inline-flex h-[17px] shrink-0 items-center rounded-[4px] border border-border px-[4px] text-[10.5px] leading-none text-muted-foreground';

    return (
        <div
            ref={rootRef}
            data-case-selected={isSelected ? 'true' : undefined}
            className={`group relative w-full select-none overflow-hidden rounded-[10px] border transition-colors ${isSelected
                ? 'border-primary/40 bg-card shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
                : 'border-border/40 bg-card hover:border-border/60 dark:border-border/30'
                }`}
        >
            {/* 左滑露出的操作区：位于卡片底层，靠前景层位移显形 */}
            <div className="absolute inset-y-0 right-0 z-[1] flex">
                <button
                    type="button"
                    onClick={(event) => { stop(event); setSwipeX(0); onEdit(); }}
                    className="flex w-[60px] flex-col items-center justify-center gap-0.5 bg-secondary text-[11px] font-semibold text-primary"
                    aria-label="编辑案例"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    编辑
                </button>
                <button
                    type="button"
                    onClick={(event) => { stop(event); setSwipeX(0); onDelete(); }}
                    className="flex w-[60px] flex-col items-center justify-center gap-0.5 bg-destructive/15 text-[11px] font-semibold text-destructive"
                    aria-label="删除案例"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                </button>
            </div>

            {/* 前景层：卡片本体，grid 两列三行，左右同行走同一行轨道严格对齐 */}
            <div
                role="button"
                tabIndex={0}
                onClick={handleSelect}
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
                onPointerLeave={() => { if (gesture.current.lock === 'x') endSwipe(); }}
                style={{
                    transform: swipeX ? `translateX(${swipeX}px)` : undefined,
                    transition: isSwiping ? 'none' : 'transform 180ms cubic-bezier(0.2, 0.8, 0.3, 1)',
                    touchAction: 'pan-y',
                }}
                className="relative z-[2] grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[7px] gap-y-[4px] bg-card px-[8px] py-[8px] text-left"
            >
                {/* 行 1：标题 / 坐向 */}
                <div className="min-w-0 truncate text-[14px] font-semibold leading-[17px] text-foreground">
                    {caseData.title}
                </div>
                <div className="truncate text-right text-xs font-medium leading-[17px] text-foreground/80">
                    {caseData.mountain}山{caseData.facing}向
                </div>
                {/* 行 2：标签 / 运卦 */}
                <div className="min-w-0">
                    <span className={`${chipClass} border-transparent bg-primary/10 text-primary`}>{caseTypeName}</span>
                </div>
                <div className="text-right text-xs leading-[16px] text-muted-foreground">
                    {caseData.yun}运{caseData.pan_type === 'ti' ? '替卦' : '下卦'}
                </div>
                {/* 行 3：地点 / 日期时间 */}
                <div className="min-w-0 truncate text-xs leading-[16px] text-muted-foreground">
                    {caseData.location_label || '未填写地点 / 项目别名'}
                </div>
                {displayDateTime && (
                    <div className="shrink-0 text-right text-xs tabular-nums leading-[16px] text-muted-foreground" title="更新时间">
                        {displayDateTime}
                    </div>
                )}
            </div>
        </div>
    );
}
