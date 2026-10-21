/**
 * 模块定位：
 * - 主要目标：移动端底部导航栏（方案 C · 极简文字墨栏）
 *
 * 交互模型（design-demos/mobile-bottom-nav 定稿）：
 * - 底栏形态恒定，不随层级变形：进模块后仍是主菜单那四槽，只是当前模块高亮。
 *   左右抽屉改由主内容区左右滑拉开（侧栏已并排式），底栏不再承担「案例 / 排盘信息」入口
 * - 分两页，靠底栏上下滑切换（底栏在系统手势区内，故同时保留顶边点击兜底）：
 *   第一页 = 万年通历（首页固定）+ 可更换术数槽 + 个人中心
 *   第二页 = 分类槽 + 个人中心（默认 术数基础 · 八字案例 · 奇门案例）
 * - 已锁定多个模块时，点当前模块槽在它们之间轮换
 *
 * 形态：纯文字 13px 衬线高亮 + 顶部墨线，无图标；56px 高，槽间短竖线分隔。
*/
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ChartType } from '../../types';
import type { MobileModuleDrawers } from '../../contexts/MobileNavContext';
import {
    MOBILE_NAV_CASE_CANDIDATES,
    MOBILE_NAV_HOME_CHART,
    mobileNavModuleName,
    type CaseNavSlot,
} from '../../lib/mobileNavStorage';
import { caseStudyLockKey } from '../../lib/lockedChartStorage';

interface MobileTabBarProps {
    activeChart: ChartType;
    /** 个人中心页是否展开（展开时底栏回主菜单层并高亮个人中心） */
    profileOpen: boolean;
    /** 已固定的可换槽位（不含首页） */
    slots: ChartType[];
    /** 第二页已固定分类槽；个人中心恒在末位 */
    caseSlots: CaseNavSlot[];
    /** 当前激活模块注册的抽屉；缺省时模块层自动收窄 */
    drawers?: MobileModuleDrawers;
    onSelectChart: (chart: ChartType) => void;
    /** 锁定键列表：术数为 ChartType，案例学习为 xiaoliuren:<category> */
    lockedCharts: string[];
    /** 左滑锁定 / 右滑解锁（个人中心与万年通历不可锁） */
    onToggleSlotLock: (lockKey: string) => void;
    onOpenProfile: () => void;
    /** 底栏第二页分类槽直达 */
    onSelectCaseSlot: (category: CaseNavSlot) => void;
}

type BarSlot = {
    key: string;
    label: string;
    active: boolean;
    onTap: () => void;
    /** 该槽位是否已锁定：文案加描边框作标记 */
    locked: boolean;
    /** 是否允许锁定（个人中心与万年通历除外） */
    lockable: boolean;
    /** 所属页：跨页轮换锁定槽时要跟着翻页 */
    page: 0 | 1;
};

/** 底栏翻页手势阈值：纵向位移超过它、且明显大于横向位移才翻页 */
const PAGE_SWIPE_DISTANCE_PX = 24;
/** 纵向 / 横向位移比下限，避免斜着划时误翻页 */
const PAGE_SWIPE_RATIO = 1.5;


export default function MobileTabBar({
    activeChart,
    profileOpen,
    slots,
    caseSlots,
    drawers,
    onSelectChart,
    lockedCharts,
    onToggleSlotLock,
    onOpenProfile,
    onSelectCaseSlot,
}: MobileTabBarProps) {
    // 当前页：0 = 术数页，1 = 案例学习页。
    // 任何层级都沿用 pageState：八字/奇门/个人中心里同样能上下翻页，页选择跨模块保留
    const [pageState, setPageState] = useState<0 | 1>(0);
    const page: 0 | 1 = pageState;
    // 案例学习当前分类：第二页据此高亮对应槽位（其他模块不注册，自然为空）
    const activeCaseSlot = drawers?.caseCategory;

    // 槽位构建抽成纯函数：跨页轮换需要同时算出两页的锁定槽
    const buildSlots = (targetPage: 0 | 1): BarSlot[] => {
        // 个人中心恒在末位，两页都保留；首页只在第一页。二者都不可锁定
        const profileSlot: BarSlot = {
            key: 'profile',
            label: '个人中心',
            active: profileOpen,
            onTap: onOpenProfile,
            locked: false,
            lockable: false,
            page: targetPage,
        };
        if (targetPage === 1) {
            // 第二页：案例学习分类槽（默认 术数基础 · 八字案例 · 奇门案例）。
            // 每个分类独立锁定，锁定键为 xiaoliuren:<category>
            const caseList: BarSlot[] = caseSlots.map((id) => {
                const lockKey = caseStudyLockKey(id);
                return {
                    key: lockKey,
                    label: MOBILE_NAV_CASE_CANDIDATES.find((item) => item.id === id)?.name ?? id,
                    active: !profileOpen && activeChart === 'xiaoliuren' && id === activeCaseSlot,
                    onTap: () => onSelectCaseSlot(id),
                    locked: lockedCharts.includes(lockKey),
                    lockable: true,
                    page: 1 as const,
                };
            });
            return [...caseList, profileSlot];
        }
        // 第一页：万年通历 + 可换术数槽 + 个人中心。模块层与主菜单层同一套槽位，
        // 只是当前模块高亮——底栏形态不再随层级变形（开抽屉走左右滑）
        const list: BarSlot[] = [
            {
                key: MOBILE_NAV_HOME_CHART,
                label: mobileNavModuleName(MOBILE_NAV_HOME_CHART),
                active: !profileOpen && activeChart === MOBILE_NAV_HOME_CHART,
                onTap: () => onSelectChart(MOBILE_NAV_HOME_CHART),
                locked: false,
                lockable: false,
                page: 0 as const,
            },
        ];
        for (const id of slots) {
            const isCurrent = !profileOpen && activeChart === id;
            list.push({
                key: id,
                label: mobileNavModuleName(id),
                active: isCurrent,
                onTap: () => onSelectChart(id),
                locked: lockedCharts.includes(id),
                lockable: true,
                page: 0 as const,
            });
        }
        list.push(profileSlot);
        return list;
    };

    /** 两页合起来的已锁定槽位：锁定是全局的，两页各锁一个也要联动轮换 */
    const lockedAcrossPages = useMemo<BarSlot[]>(() => {
        const first = buildSlots(0).filter((slot) => slot.locked);
        const second = buildSlots(1).filter((slot) => slot.locked);
        return [...first, ...second];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileOpen, activeChart, activeCaseSlot, slots, caseSlots, lockedCharts, onSelectChart, onOpenProfile, onSelectCaseSlot]);

    /** 点击当前锁定槽在「两页所有锁定槽」之间轮换，跨页时顺带翻页 */
    const withLockCycling = (list: BarSlot[]): BarSlot[] => {
        if (lockedAcrossPages.length < 2) return list;
        return list.map((slot) => {
            if (!slot.active || !slot.locked) return slot;
            return {
                ...slot,
                onTap: () => {
                    const index = lockedAcrossPages.findIndex((item) => item.key === slot.key);
                    const next = lockedAcrossPages[(index + 1) % lockedAcrossPages.length];
                    if (!next) return;
                    // 目标槽在另一页时先翻过去，否则会停在本页看不到高亮
                    if (next.page !== page) setPageState(next.page);
                    next.onTap();
                },
            };
        });
    };

    const barSlots = useMemo<BarSlot[]>(() => {
        const list = buildSlots(page);
        return withLockCycling(list);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, profileOpen, activeChart, activeCaseSlot, slots, caseSlots, lockedCharts, onSelectChart, onOpenProfile, onSelectCaseSlot]);


    // 手势监听在 effect 内注册，槽位变化时不该重建监听，故用 ref 读最新值
    const slotsRef = useRef<BarSlot[]>([]);
    useEffect(() => {
        slotsRef.current = barSlots;
    }, [barSlots]);

    // 回调同理：锁定会改状态、引起重渲染，但手势监听不该跟着重建
    const toggleLockRef = useRef(onToggleSlotLock);
    useEffect(() => {
        toggleLockRef.current = onToggleSlotLock;
    }, [onToggleSlotLock]);

    const renderBar = () => {
        const nodes: ReactNode[] = [];
        barSlots.forEach((slot, index) => {
            if (index > 0) {
                nodes.push(<span key={`sep-${slot.key}`} className="self-center h-3.5 w-px shrink-0 bg-border/60 pointer-events-none" aria-hidden="true" />);
            }
            const labelClass = `relative min-w-0 h-full flex items-center justify-center text-[15px] font-medium tracking-[0.12em] indent-[0.12em] transition-colors focus:outline-none focus-ring ${
                slot.active ? 'text-primary font-serif font-bold' : 'text-muted-foreground'
            }`;
            nodes.push(
                <button
                    key={slot.key}
                    type="button"
                    onClick={slot.onTap}
                    data-slot-key={slot.key}
                    className={`flex-1 touch-manipulation ${labelClass}`}
                >
                    {slot.active && (
                        // 多个槽位锁定时用并排多段指示（高亮位对应该槽在两页锁定列表中的位置），
                        // 否则单条墨线
                        lockedAcrossPages.length > 1 && slot.locked ? (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-[5px]" aria-hidden="true">
                                {lockedAcrossPages.map((item) => (
                                    <span
                                        key={item.key}
                                        className={`w-[15px] h-[3px] rounded-b-sm ${
                                            item.key === slot.key ? 'bg-primary' : 'bg-primary/35'
                                        }`}
                                    />
                                ))}
                            </span>
                        ) : (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-[26px] h-[3px] rounded-b-sm bg-primary" aria-hidden="true" />
                        )
                    )}
                    <span
                        className={`truncate ${
                            slot.locked ? 'rounded-[6px] border border-primary/70 px-1.5 py-0.5' : ''
                        }`}
                    >{slot.label}</span>
                </button>,
            );
        });
        return nodes;
    };

    // 底栏翻页手势：上滑到第二页（案例学习），下滑回第一页（术数）
    // 底栏正好压在手机系统手势区（iOS 回主屏、安卓回桌面都会抢上滑），所以：
    // - 只在主菜单层与案例学习页接管（两页之间可来回翻）；八字/奇门等模块层不响应
    // - 顶边那枚短横是可点按钮，系统抢走手势时仍能翻页
    const navRef = useRef<HTMLElement | null>(null);
    // slot：本次手势起始所在的槽位（左右滑锁定只作用于按下的那个槽）
    const gestureRef = useRef<{ y0: number; x0: number; slot: BarSlot | null; fired: boolean } | null>(null);
    const [pulling, setPulling] = useState(false);
    // 翻页后要吞掉紧随其后的 click，避免松手被当成点了某个槽位。
    // 关键在复位时机：翻页后浏览器常常根本不派发那个 click（槽位 DOM 已重建），
    // 若只靠「click 时复位」，标记会一直为真并吞掉下一次真实点击——表现为「要点两下」。
    // 因此每次 touchstart 都清空：只可能吞掉翻页同一触摸序列产生的 click
    const swallowClickRef = useRef(false);

    useEffect(() => {
        const node = navRef.current;
        if (!node) return;
        const start = (event: TouchEvent) => {
            const touch = event.touches[0];
            if (!touch) return;
            // 新手势开始即作废上一次的吞 click 标记（见 swallowClickRef 注释）
            swallowClickRef.current = false;
            // 左右滑锁定只作用于按下时所在的槽位
            const target = event.target as HTMLElement | null;
            const key = target?.closest<HTMLElement>('[data-slot-key]')?.dataset.slotKey;
            const slot = key ? slotsRef.current.find((item) => item.key === key) ?? null : null;
            gestureRef.current = { y0: touch.clientY, x0: touch.clientX, slot, fired: false };
        };
        const move = (event: TouchEvent) => {
            const gesture = gestureRef.current;
            const touch = event.touches[0];
            if (!gesture || !touch || gesture.fired) return;
            const dy = touch.clientY - gesture.y0;
            const dx = touch.clientX - gesture.x0;
            // 横向明显大于纵向 → 切换该槽位的锁定状态（任一方向都可）
            const horizontal = Math.abs(dx) > Math.abs(dy) * PAGE_SWIPE_RATIO;
            if (horizontal && Math.abs(dx) >= PAGE_SWIPE_DISTANCE_PX) {
                gesture.fired = true;
                swallowClickRef.current = true;
                const slot = gesture.slot;
                // 横滑即切换锁定：未锁定时滑一下锁上，已锁定时任一方向都解开。
                // 不再用方向区分锁/解——方向判定在窄高度底栏里容易误判，且记不住
                if (slot?.lockable) toggleLockRef.current(slot.key);
                setPulling(false);
                return;
            }
            // 纵向已明显大于横向即进入「正在拉」状态，短横随之变长，给出手势反馈
            const vertical = Math.abs(dy) > Math.abs(dx) * PAGE_SWIPE_RATIO;
            setPulling(vertical && Math.abs(dy) >= PAGE_SWIPE_DISTANCE_PX / 2);
            if (Math.abs(dy) < PAGE_SWIPE_DISTANCE_PX) return;
            if (!vertical) return;
            gesture.fired = true;
            // 第一页只有上滑翻页（下滑留给正常滚动）；第二页上下滑都回第一页——
            // 「只能靠下滑回去」等于把唯一出口放在最容易误触的方向上
            const next: 0 | 1 = page === 1 ? 0 : dy < 0 ? 1 : 0;
            if (next !== page) {
                swallowClickRef.current = true;
                setPageState(next);
            }
        };
        const end = () => {
            gestureRef.current = null;
            setPulling(false);
        };
        node.addEventListener('touchstart', start, { passive: true });
        node.addEventListener('touchmove', move, { passive: true });
        node.addEventListener('touchend', end, { passive: true });
        node.addEventListener('touchcancel', end, { passive: true });
        return () => {
            node.removeEventListener('touchstart', start);
            node.removeEventListener('touchmove', move);
            node.removeEventListener('touchend', end);
            node.removeEventListener('touchcancel', end);
        };
    }, [page]);

    const flipPage = () => {
        setPageState(page === 0 ? 1 : 0);
    };

    return (
        <>
            <nav
                ref={navRef}
                // touch-manipulation 而非 touch-pan-x：后者在手指纵向微动时会让浏览器
                // 取消这次 click（被判定成纵向手势），表现为「只有点到文字才有反应」。
                // manipulation 保留点击灵敏度，手势仍由下面的 passive 监听处理
                className="relative shrink-0 h-14 border-t border-border bg-background touch-manipulation"
                aria-label="主导航"
                // 翻页后吞掉紧随的 click，避免松手被当成点了槽位
                onClickCapture={(event) => {
                    if (!swallowClickRef.current) return;
                    swallowClickRef.current = false;
                    event.stopPropagation();
                    event.preventDefault();
                }}
            >
                {/* 翻页提示：底边短横，主菜单层可点；上滑/下滑判定中变长变亮 */}
                {(
                    <button
                        type="button"
                        onClick={flipPage}
                        aria-label={page === 0 ? '切换到案例学习菜单' : '切换到术数菜单'}
                        title={page === 0 ? '上滑或点此：案例学习' : '下滑或点此：术数'}
                        className="absolute -bottom-[3px] left-1/2 z-10 -translate-x-1/2 flex h-3 w-14 items-center justify-center focus:outline-none focus-ring"
                    >
                        <span
                            className={`h-[2px] rounded-full bg-primary transition-all ${
                                pulling ? 'w-12 opacity-100' : 'w-6 opacity-40'
                            }`}
                        />
                    </button>
                )}
                {/* 不用毛玻璃：WKWebView 下 backdrop-filter 合成层会盖住后续 fixed 弹层（如设置生日） */}
                {/* key 不能含 page：翻页时 key 变化会让 React 卸载重建整排槽位，
                    松手后的 click 落在被替换的节点上，第一次点击就丢（表现为「要点两次」）。
                    槽位本身已带 key，内容变化由 React 按 key 复用即可 */}
                <div key="main-menu" className="flex h-full">
                    {renderBar()}
                </div>
            </nav>

        </>
    );
}
