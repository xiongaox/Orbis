/**
 * 关键职责：
 * - 渲染侧栏案例卡片：上区为左侧「姓名独占一行 + 性别印章/分类 chip 一行」与右侧四柱
 *   顶对齐；底行横跨整卡宽度，岁数（左）+ 出生日期·时辰（右对齐）
 * - 仅日干保留五行色，其余干支压暗；编辑 / 删除由常驻改为左滑露出，
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
import { getBaziPillarsFromDateString, getAgeFromBirth } from '../../../../../utils/lunarUtil';
import { getElementTextColor } from '../../../../../lib/xuan-bazi/maps';
import { useSwipeDismiss } from '../../../../../hooks/useSwipeDismiss';

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
}

/** AI 研判任务状态（见 aiTaskStatusService）：研判中 / 未读研判，展示为姓名后的小状态按钮 */
export type CaseCardAiStatus = 'running' | 'unread';

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
    // 四柱：年 月 日 时（每柱天干 + 地支）
    const pillars = getBaziPillarsFromDateString(item.birthDate ?? item.date);
    const pillarPairs = pillars.length === 8
        ? [0, 2, 4, 6].map(i => [pillars[i], pillars[i + 1]] as const)
        : [];

    // 仅日干使用五行色，其余干支统一压暗
    const dayGan = pillarPairs[2]?.[0] ?? '';
    const dayGanColor = getElementTextColor(dayGan);
    const isMale = item.gender === '男';

    // 出生日期与出生时辰拆成两段展示，不展示年龄
    const birth = new Date(item.birthDate);
    const hasBirth = !Number.isNaN(birth.getTime());
    const pad = (n: number) => String(n).padStart(2, '0');
    // 出生日期用短横线格式（1996-12-31）：中文「年月日」写法在 224px 侧栏里
    // 与出生时辰同排时会顶满整行（实测 75.6px / 可用 75.6px，零余量），字号无法再放大。
    // 换成短横线后第二行可放大到 12px 仍不截断。
    const displayDate = hasBirth
        ? `${birth.getFullYear()}-${pad(birth.getMonth() + 1)}-${pad(birth.getDate())}`
        : item.date;
    const displayTime = hasBirth ? `${pad(birth.getHours())}:${pad(birth.getMinutes())}` : '';
    // 岁数：复用领域层虚岁算法（当年 - 出生年 + 1），与案例库卡片同一来源
    const age = getAgeFromBirth(item.birthDate);

    // ---- 左滑露出 编辑 / 删除 ----
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
        onSelectCase(item.id);
    };

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
                        onClick={(event) => { stop(event); setSwipeX(0); onEdit(item.id); }}
                        className="flex w-[60px] flex-col items-center justify-center gap-0.5 bg-secondary text-[11px] font-semibold text-primary"
                        aria-label="编辑案例"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        编辑
                    </button>
                    <button
                        type="button"
                        onClick={(event) => { stop(event); setSwipeX(0); onDelete(item.id); }}
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
                {/* 上区：左「姓名 / 印章+分类」与右侧四柱顶对齐。
                    姓名固定最多 4 字省略：为研判状态按钮留位（名称过长会把状态按钮挤出卡外） */}
                <div className="flex min-w-0 items-start justify-between gap-[7px] @[206px]:gap-[5px]">
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-[4px]">
                            <span className="block truncate text-[14px] font-semibold leading-[17px] text-foreground">
                                {item.name.length > 4 ? `${item.name.slice(0, 4)}…` : item.name}
                            </span>
                            {aiStatus && onOpenAiResearch && (
                                <button
                                    type="button"
                                    onClick={(event) => { stop(event); onOpenAiResearch(item.id); }}
                                    title={aiStatus === 'running' ? 'AI 研判进行中，点击查看' : '有未读的 AI 研判结果，点击查看'}
                                    className={`shrink-0 h-[16px] px-[4px] rounded-[4px] text-[9.5px] leading-none inline-flex items-center transition-colors cursor-pointer ${aiStatus === 'running'
                                        ? 'border border-primary/40 bg-primary/10 text-primary animate-pulse'
                                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                        }`}
                                >
                                    {aiStatus === 'running' ? '研判中' : '未读研判'}
                                </button>
                            )}
                        </div>
                        <div className="mt-[4px] flex min-w-0 items-center gap-[4px]">
                            {/* 性别印章：第二行行首 */}
                            <span className={`inline-flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[4px] text-[10.5px] leading-none ${isMale
                                ? 'bg-[var(--gender-male-bg)] text-[var(--gender-male)]'
                                : 'bg-[var(--gender-female-bg)] text-[var(--gender-female)]'
                                }`}>
                                {isMale ? '乾' : '坤'}
                            </span>
                            {item.tags && item.tags.length > 0 && (
                                <span className="inline-flex h-[17px] shrink-0 items-center rounded-[4px] bg-primary/10 px-[3px] text-[10.5px] leading-none text-primary">
                                    {item.tags[0]}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* 右侧：四柱迷你排盘（干上支下 4 列）。
                        紧凑档（内容 <206px）：柱宽 15px、柱间距 3px —— 干支 16px 字形压 15px 列，
                        224px 侧栏下这是实测扫描出的最优解，再放大柱间距或日期字号都会让日期截断。
                        宽容器档（≥206px）：柱宽 16px、柱间距 5px，见头注释「四柱在宽容器下放宽呼吸感」。 */}
                    {pillarPairs.length > 0 && (
                        <div className="flex shrink-0 gap-[3px] font-serif leading-tight @[206px]:gap-[5px]">
                            {pillarPairs.map(([gan, zhi], i) => (
                                <div key={i} className="flex w-[15px] shrink-0 flex-col items-center @[206px]:w-[16px]">
                                    <span className={`text-[16px] font-semibold ${i === 2 ? dayGanColor : 'text-foreground/55'}`}>{gan}</span>
                                    <span className="text-[16px] font-semibold text-foreground/55">{zhi}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* 底行：岁数（左）+ 出生日期·时辰（右对齐）。底行横跨整卡宽度，
                    最坏内容约 137px vs 可用 181px+（360dp 小屏），日期不受左列宽度约束。
                    日期仍是唯一可省略项，其余节点 shrink-0。 */}
                <div className="mt-[4px] flex min-w-0 items-center gap-[4px] text-[12.5px] text-muted-foreground">
                    {age !== null && <span className="shrink-0 tabular-nums">{age}岁</span>}
                    <div className="ml-auto flex min-w-0 items-center gap-[1px]">
                        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{displayDate}</span>
                        {displayTime && (
                            <>
                                <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-border" />
                                <span className="shrink-0 tabular-nums">{displayTime}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
