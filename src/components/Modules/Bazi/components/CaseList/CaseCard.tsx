/**
 * 关键职责：
 * - 渲染侧栏案例卡片：上区为左侧「姓名独占一行 + 性别印章/分类 chip 一行」与右侧四柱
 *   顶对齐；底行横跨整卡宽度，岁数（左）+ 出生日期·时辰（右对齐）
 * - 仅日干保留五行色，其余干支压暗；编辑 / 删除由常驻改为右滑露出，
 *   展开后点击卡片以外任意位置经 useSwipeDismiss 全局收起
 *
 * 排版约束（改动前必读）：
 * - 侧栏宽度固定为桌面 w-56 = 224px（2xl 断点 w-64 = 256px），本组件不得改变自身宽度。
 *   移动端是 SideDrawer 的 xxs 档（62vw / 最大 248px），只比侧栏宽，按 224px 设计即可两者通吃。
 * - 列表容器（BaseCaseList）已有 p-4（左右各 16px），卡片自身左右内边距为 4px。
 * - 卡片上下内边距固定 8px；左右内边距按容器宽度分档（@container 查询卡片自身）：
 *   内容宽 ≥200px 时升到 8px 与上下对齐（对称内边距），不足则维持 4px。
 *   容器查询不受支持时回退 4px。
 * - 四柱在宽容器（内容 ≥206px）下放宽呼吸感：柱宽 15→16px（消除 16px 字形压 15px 列的
 *   两侧 bleed）、柱间距 3→5px、与左列间隙 7→5px，视觉柱间隙约 2.5px → 6px。
 *   两档阈值沿用定稿前的实测结论，定稿排版下已无截断风险（见下条），仅保留既定视觉规格。
 * - 排版（2026-09-29 定稿）：姓名独占一行（14px，超长 CSS truncate 省略，无字数上限），
 *   第二行性别印章 + 分类 chip，右侧四柱与上区顶对齐；底行横跨整卡宽度，
 *   岁数（左）+ 日期·时辰（右对齐）。岁数复用领域层 getAgeFromBirth
 *   （虚岁 = 当年 - 出生年 + 1）。底行最坏内容约 137px vs 可用 181px+（360dp 小屏），
 *   日期不再与四柱争宽，历史上有三次截断事故的约束已解除。
 *   性别印章与分类 chip 统一规格：字号 10.5px、高 17px、圆角 4px，chip 左右内边距 3px。
 *   ⚠ 数值依然耦合，单独放大任一项都可能让最长的「1996-12-31 + 16:00」被省略号吃掉末位。
 *   改后务必用「真实 Tailwind 编译 + 真实渲染」量测最窄场景，仅凭肉眼或手算都会误判。
 * - 日期必须用短横线格式（1996-12-31）。早期中文「1996年12月31日」占满整行零余量，字号无法放大；
 *   该缺陷实测复现过三次（demo 阶段 16px 柱宽、落地时忽略容器 p-4、恢复四柱字号时）。
 *   改动以上任一数值后，务必用真实渲染重新量测 224px 下是否截断。
 
*/

import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useSwipeDismiss } from '../../../../../hooks/useSwipeDismiss';
import CaseCardBody, { type CaseCardAiStatus } from './CaseCardBody';

/** 左滑露出的操作区宽度，与案例库 SortableCaseCard 的 REVEAL_PX 保持同一度量 */
const REVEAL_PX = 120;
/** 超过该位移即判定为「打开」，否则回弹 */
const OPEN_THRESHOLD = 34;

interface CaseCardDisplayItem {
    id: string;
    name: string;
    date: string;
    gender: string;
    birthDate: string;
    tags?: string[];
    /** 生平记事条数：有记录时在底行岁数后展示圆标 */
    lifeEventCount?: number;
}

/** AI 研判任务状态（见 aiTaskStatusService）：类型定义移至 CaseCardBody（B6），此处随导出沿用 */
export type { CaseCardAiStatus } from './CaseCardBody';

interface CaseCardProps {
    item: CaseCardDisplayItem;
    isSelected: boolean;
    aiStatus?: CaseCardAiStatus | null;
    onSelectCase: (id: string) => void;
    onOpenAiResearch?: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function CaseCard({
    item,
    isSelected,
    aiStatus,
    onOpenAiResearch,
    onSelectCase,
    onEdit,
    onDelete,
}: CaseCardProps) {
    // 四柱/日期/时辰/岁数派生与静态展示渲染全部在 CaseCardBody（variant="sidebar"），
    // 本组件只保留手势/滑动外壳与卡级数值约束。
    // ---- 右滑露出 编辑 / 删除（与左侧抽屉「向左推回收起」反向，避免收侧栏时误触） ----
    const [swipeX, setSwipeX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const gesture = useRef({ x: 0, y: 0, base: 0, lock: null as null | 'x' | 'y', moved: false });
    // 真实滑动后浏览器补发的 click 不应被当作点选（与案例库 SortableCaseCard 同思路）
    const suppressClick = useRef(false);
    // 展开态下点击卡片以外任意位置（空白/其他卡片）全局收起
    const rootRef = useRef<HTMLDivElement | null>(null);
    useSwipeDismiss(rootRef, swipeX !== 0, () => setSwipeX(0));

    const handlePointerDown = (event: ReactPointerEvent) => {
        gesture.current = { x: event.clientX, y: event.clientY, base: swipeX, lock: null, moved: false };
    };

    const handlePointerMove = (event: ReactPointerEvent) => {
        // 鼠标悬停（未按下任何按键）同样会派发 pointermove：直接忽略，避免卡片粘着光标滑走
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
        const next = Math.max(0, Math.min(REVEAL_PX, g.base + (event.clientX - g.x)));
        g.moved = true;
        setSwipeX(next);
    };

    const endSwipe = () => {
        const g = gesture.current;
        if (g.lock === 'x' && g.moved) {
            setSwipeX(swipeX > OPEN_THRESHOLD ? REVEAL_PX : 0);
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
        onSelectCase(item.id);
    };

    return (
        <div
            ref={rootRef}
            data-case-selected={isSelected ? 'true' : undefined}
            className={`group @container relative w-full select-none overflow-hidden rounded-[10px] border transition-colors ${isSelected
                ? 'border-primary/40 bg-card shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
                : 'border-border/40 bg-card hover:border-border/60 dark:border-border/30'
                }`}
        >
            {/* 右滑露出的操作区（按钮在卡片左缘）：位于卡片底层，靠前景层位移显形 */}
                <div className="absolute inset-y-0 left-0 z-[1] flex">
                    <button
                        type="button"
                        onClick={(event) => { stop(event); setSwipeX(0); onDelete(item.id); }}
                        className="flex w-[60px] flex-col items-center justify-center gap-0.5 bg-destructive/15 text-[11px] font-semibold text-destructive"
                        aria-label="删除案例"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                    </button>
                    <button
                        type="button"
                        onClick={(event) => { stop(event); setSwipeX(0); onEdit(item.id); }}
                        className="flex w-[60px] flex-col items-center justify-center gap-0.5 bg-secondary text-[11px] font-semibold text-primary"
                        aria-label="编辑案例"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        编辑
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
                        onSelectCase(item.id);
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
                className="relative z-[2] flex cursor-pointer flex-col bg-card px-[4px] py-[8px] text-left @[200px]:px-[8px]"
            >
                {/* 静态展示区由 CaseCardBody 共享渲染：姓名/印章/chip/四柱（上区）+ 岁数/记事徽标/日期（底行），
                    数值规格见本文件头注释「排版约束」，对 sidebar 档依然生效 */}
                <CaseCardBody
                    variant="sidebar"
                    name={item.name}
                    isMale={item.gender === '男'}
                    pillarSource={item.birthDate ?? item.date}
                    birthDate={item.birthDate}
                    dateFallback={item.date}
                    tags={item.tags ?? []}
                    lifeEventCount={item.lifeEventCount ?? 0}
                    aiStatus={aiStatus}
                    aiTargetId={item.id}
                    onOpenAiResearch={onOpenAiResearch}
                    onAiButtonClick={stop}
                />
            </div>
        </div>
    );
}
