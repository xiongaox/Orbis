/**
 * 关键职责：
 * - 奇门案例卡片（侧栏与案例库弹窗共用同一排版）：上区左列「标题 + 事件描述」
 *   与右侧四柱顶对齐，底行左侧为标签（分类/盘式/盘状态，线框样式、常规状态不显示），
 *   底行右侧为求测日期时间；编辑 / 删除由常驻改为左滑露出，
 *   展开后点击卡片以外任意位置经 useSwipeDismiss 全局收起
 * - 四柱来自 lunarUtil 的 getEightCharFromDate（与盘面同一来源）；
 *   盘状态（伏吟/反吟/常规）在组件内经 useQimenCasePanStatus 按「排盘方式 +
 *   求测时间」共享缓存计算，列表与弹窗各自渲染时无需穿参
 *
 * 排版约束：
 * - 侧栏与奇门 Pad 布局同为 w-56 = 224px，卡片不得改变自身宽度；
 *   容器 p-4 后内容宽约 184px：上区右侧四柱占 69px（柱宽 15px、间距 3px，
 *   同八字紧凑档）；底行「标签组 + 日期时间」并排，超宽时标签组 flex-wrap
 *   换行兜底、日期保持右侧不截断。
 * - 手势与左滑规格（REVEAL_PX/阈值/收起逻辑）与八字 CaseCard 保持同一度量。
 */

import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { type QimenCase, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';
import { getEightCharFromDate } from '../../../utils/lunarUtil';
import { getElementTextColor } from '../../../lib/xuan-bazi/maps';
import { useSwipeDismiss } from '../../../hooks/useSwipeDismiss';
import { useQimenCasePanStatus } from './hooks/useQimenCasePanStatus';
import type { PaiPanMethod } from '../../../lib/csp-qimen/qimenService';

/** 左滑露出的操作区宽度，与八字 CaseCard 的 REVEAL_PX 保持同一度量 */
const REVEAL_PX = 120;
/** 超过该位移即判定为「打开」，否则回弹 */
const OPEN_THRESHOLD = 34;

/** 排盘方式短标签（chip 空间有限，用两字短名） */
const METHOD_SHORT: Record<string, string> = {
    zhirun: '置润',
    yinpan: '阴盘',
    chaibu: '拆补',
    maoshan: '茅山',
};

interface QimenCaseCardProps {
    caseItem: QimenCase;
    isSelected: boolean;
    onSelectCase: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    /** 旧案例（无 pai_pan_method 字段）盘状态的兜底排盘方法：当前页面所用方法 */
    paiPanMethod?: PaiPanMethod;
}

export default function QimenCaseCard({
    caseItem,
    isSelected,
    onSelectCase,
    onEdit,
    onDelete,
    paiPanMethod = 'zhirun',
}: QimenCaseCardProps) {
    // 盘状态：组件内共享缓存计算（useMemo 固定入参引用，避免 effect 反复重跑）；
    // 与页头 QimenHeader 同源同文字的全局格局徽标原样渲染（有几个显示几个，
    // 常规局为空数组不渲染），旧案例按当前页面排盘方法兜底计算
    const panList = useMemo(() => [caseItem], [caseItem]);
    const panStatuses = useQimenCasePanStatus(panList, paiPanMethod)[caseItem.id] ?? [];
    // 四柱：年 月 日 时（每柱天干 + 地支）
    const testDate = new Date(caseItem.test_date);
    const eightChar = Number.isNaN(testDate.getTime()) ? null : getEightCharFromDate(testDate);
    const pillarPairs = eightChar
        ? [
            [eightChar.yearGan, eightChar.yearZhi],
            [eightChar.monthGan, eightChar.monthZhi],
            [eightChar.dayGan, eightChar.dayZhi],
            [eightChar.timeGan, eightChar.timeZhi],
        ] as const
        : [];
    const dayGanColor = pillarPairs.length > 0 ? getElementTextColor(pillarPairs[2][0]) : '';

    const categoryName = QIMEN_CATEGORIES.find((cat) => cat.id === caseItem.category)?.name;
    // 旧案例没有排盘方式字段：按应用默认方法（zhirun）兜底，与盘状态计算的兜底一致
    const methodShort = METHOD_SHORT[caseItem.pai_pan_method ?? 'zhirun'];

    const pad = (n: number) => String(n).padStart(2, '0');
    const displayDateTime = !Number.isNaN(testDate.getTime())
        ? `${testDate.getFullYear()}-${pad(testDate.getMonth() + 1)}-${pad(testDate.getDate())} ${pad(testDate.getHours())}:${pad(testDate.getMinutes())}`
        : '';

    // ---- 左滑露出 编辑 / 删除 ----
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
        onSelectCase(caseItem.id);
    };

    /** 统一标签规格：线框 + 文案，不使用彩色底（分类/盘式/盘状态同款） */
    const chipClass = 'inline-flex h-[17px] shrink-0 items-center rounded-[4px] border border-border px-[4px] text-[10.5px] leading-none text-muted-foreground';

    return (
        <div
            ref={rootRef}
            className={`group @container relative w-full select-none overflow-hidden rounded-[10px] border transition-colors ${isSelected
                ? 'border-primary/40 bg-card shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
                : 'border-border/40 bg-card hover:border-border/60 dark:border-border/30'
                }`}
        >
            {/* 左滑露出的操作区：位于卡片底层，靠前景层位移显形 */}
            <div className="absolute inset-y-0 right-0 z-[1] flex">
                <button
                    type="button"
                    onClick={(event) => { stop(event); setSwipeX(0); onEdit(caseItem.id); }}
                    className="flex w-[60px] flex-col items-center justify-center gap-0.5 bg-secondary text-[11px] font-semibold text-primary"
                    aria-label="编辑案例"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    编辑
                </button>
                <button
                    type="button"
                    onClick={(event) => { stop(event); setSwipeX(0); onDelete(caseItem.id); }}
                    className="flex w-[60px] flex-col items-center justify-center gap-0.5 bg-destructive/15 text-[11px] font-semibold text-destructive"
                    aria-label="删除案例"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                </button>
            </div>

            {/* 前景层：卡片本体 */}
            <div
                role="button"
                tabIndex={0}
                onClick={handleSelect}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectCase(caseItem.id);
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
                className="relative z-[2] flex cursor-pointer flex-col bg-card px-[8px] py-[8px] text-left"
            >
                {/* 上区：左「标题 / 事件描述」与右侧四柱顶对齐 */}
                <div className="flex min-w-0 items-start justify-between gap-[7px]">
                    <div className="min-w-0 flex-1">
                        <div className="min-w-0 truncate text-[14px] font-semibold leading-[17px] text-foreground">
                            {caseItem.title}
                        </div>
                        {caseItem.description && (
                            <div className="mt-[4px] line-clamp-1 text-xs leading-[16px] text-muted-foreground">
                                {caseItem.description}
                            </div>
                        )}
                    </div>
                    {/* 右侧：四柱迷你排盘（干上支下 4 列，日干着五行色） */}
                    {pillarPairs.length > 0 && (
                        <div className="flex shrink-0 gap-[3px] font-serif leading-tight">
                            {pillarPairs.map(([gan, zhi], i) => (
                                <div key={i} className="flex w-[15px] shrink-0 flex-col items-center">
                                    <span className={`text-[16px] font-semibold ${i === 2 ? dayGanColor : 'text-foreground/55'}`}>{gan}</span>
                                    <span className="text-[16px] font-semibold text-foreground/55">{zhi}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 底行：左标签（常规状态不显示），右日期时间 */}
                <div className="mt-[4px] flex min-w-0 items-center justify-between gap-[6px]">
                    <div className="flex min-w-0 flex-wrap items-center gap-[3px]">
                        {categoryName && (
                            <span className={`${chipClass} border-transparent bg-primary/10 text-primary`}>{categoryName}</span>
                        )}
                        <span className={chipClass}>{methodShort}</span>
                        {panStatuses.map((pattern, idx) => (
                            <span key={idx} className={chipClass} title={pattern.fullLabel}>{pattern.label}</span>
                        ))}
                    </div>
                    {displayDateTime && (
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {displayDateTime}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
