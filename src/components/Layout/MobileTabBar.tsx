/**
 * 模块定位：
 * - 主要目标：移动端底部导航栏（方案 C · 极简文字墨栏）与「重选菜单」模块网格浮层
 *
 * 交互模型（design-demos/mobile-bottom-nav 定稿）：
 * - 主菜单层（万年通历首页 / 个人中心）：底栏 = 万年通历（首页固定）+ 可更换术数槽 + 个人中心
 * - 模块层：进入具备抽屉的术数后，底栏原地变为 案例 · 当前模块 · 参考面板 · 重选菜单；
 *   未注册抽屉的模块自动收窄为 当前模块 · 重选菜单
 * - 重选菜单：底部浮层网格（2 列），可跳任意已上线术数或返回主菜单；
 *   格子右侧锁键切换盘面锁定（与桌面端右键锁定等价）
 * - 已锁定模块的底栏槽位：顶部指示位让给切换点（两枚小圆点），点击在已锁定模块间轮换
 *
 * 形态：纯文字 13px 衬线高亮 + 顶部墨线，无图标；56px 高，槽间短竖线分隔。
*/
import { useMemo, useState, type ReactNode } from 'react';
import { Home, LockKeyhole, LockKeyholeOpen, User } from 'lucide-react';
import type { ChartType } from '../../types';
import { CATEGORIES } from '../../lib/caseStudy/constants';
import type { MobileModuleDrawers } from '../../contexts/MobileNavContext';
import BaseModal, { CompactModalTitle } from '../UI/BaseModal';
import {
    MOBILE_NAV_CANDIDATES,
    MOBILE_NAV_HOME_CHART,
    MOBILE_NAV_INDEPENDENT,
    mobileNavModuleName,
} from '../../lib/mobileNavStorage';
import { LOCKABLE_CHARTS } from '../../lib/lockedChartStorage';

interface MobileTabBarProps {
    activeChart: ChartType;
    /** 个人中心页是否展开（展开时底栏回主菜单层并高亮个人中心） */
    profileOpen: boolean;
    /** 已固定的可换槽位（不含首页） */
    slots: ChartType[];
    /** 当前激活模块注册的抽屉；缺省时模块层自动收窄 */
    drawers?: MobileModuleDrawers;
    onSelectChart: (chart: ChartType) => void;
    /** 已锁定盘面的模块（八字 · 奇门）：模块槽标题下方出现切换键，可在已锁定模块间轮换 */
    lockedCharts: ChartType[];
    /** 锁定 / 解锁盘面（不影响底栏槽位，槽位在个人中心管理） */
    onToggleChartLock: (chart: ChartType) => void;
    onOpenProfile: () => void;
    /** 案例学习分类直达（重选菜单在案例学习内变为分类导航） */
    onSelectCaseStudyCategory: (category: string) => void;
    /** 案例学习是否从个人中心进入：案例分类弹层的返回按钮据此回个人中心 */
    caseStudyFromProfile?: boolean;
}

type BarSlot = {
    key: string;
    label: string;
    active: boolean;
    onTap: () => void;
    /** 已锁定模块槽的切换键：在全部已锁定模块间轮换（不影响锁定状态本身） */
    onSwitch?: () => void;
};

export default function MobileTabBar({
    activeChart,
    profileOpen,
    slots,
    drawers,
    onSelectChart,
    lockedCharts,
    onToggleChartLock,
    onOpenProfile,
    onSelectCaseStudyCategory,
    caseStudyFromProfile = false,
}: MobileTabBarProps) {
    const [gridOpen, setGridOpen] = useState(false);
    // 重选菜单双模式：案例学习内为分类导航，其余为术数模块网格；打开时按当前模块决定
    const [casestudyMode, setCasestudyMode] = useState(false);
    const isHomeLevel = activeChart === MOBILE_NAV_HOME_CHART || profileOpen;
    // 已锁定盘面的模块，按可锁定顺序稳定排列（八字 · 奇门），切换键据此轮换
    const lockedList = useMemo(
        () => LOCKABLE_CHARTS.filter((chart) => lockedCharts.includes(chart)),
        [lockedCharts],
    );

    const barSlots = useMemo<BarSlot[]>(() => {
        const openCase = drawers?.openCase;
        const openPanel = drawers?.openPanel;

        if (isHomeLevel) {
            const list: BarSlot[] = [
                {
                    key: MOBILE_NAV_HOME_CHART,
                    label: mobileNavModuleName(MOBILE_NAV_HOME_CHART),
                    active: !profileOpen && activeChart === MOBILE_NAV_HOME_CHART,
                    onTap: () => onSelectChart(MOBILE_NAV_HOME_CHART),
                },
            ];
            for (const id of slots) {
                list.push({
                    key: id,
                    label: mobileNavModuleName(id),
                    active: !profileOpen && activeChart === id,
                    onTap: () => onSelectChart(id),
                });
            }
            list.push({ key: 'profile', label: '个人中心', active: profileOpen, onTap: onOpenProfile });
            return list;
        }

        const list: BarSlot[] = [];
        if (typeof openCase === 'function') {
            list.push({ key: 'case', label: '案例', active: false, onTap: () => openCase() });
        }
        // 当前模块已锁定且存在其他已锁定模块时，标题下方出现切换键
        const canSwitch = lockedList.length > 1 && lockedList.includes(activeChart);
        list.push({
            key: 'module',
            label: mobileNavModuleName(activeChart),
            active: true,
            onTap: () => undefined,
            onSwitch: canSwitch
                ? () => {
                    const index = lockedList.indexOf(activeChart);
                    const next = lockedList[(index + 1) % lockedList.length];
                    if (next) onSelectChart(next);
                }
                : undefined,
        });
        if (typeof openPanel === 'function') {
            list.push({ key: 'panel', label: '参考面板', active: false, onTap: () => openPanel() });
        }
        list.push({
            key: 'grid',
            label: '重选菜单',
            active: false,
            onTap: () => {
                setCasestudyMode(activeChart === 'xiaoliuren');
                setGridOpen(true);
            },
        });
        return list;
    }, [isHomeLevel, profileOpen, activeChart, slots, drawers, onSelectChart, onOpenProfile, lockedList]);

    const renderBar = () => {
        const nodes: ReactNode[] = [];
        barSlots.forEach((slot, index) => {
            if (index > 0) {
                nodes.push(<span key={`sep-${slot.key}`} className="self-center h-3.5 w-px shrink-0 bg-border/60" aria-hidden="true" />);
            }
            const labelClass = `relative min-w-0 h-full flex items-center justify-center text-[15px] font-medium tracking-[0.12em] indent-[0.12em] transition-colors focus:outline-none focus-ring ${
                slot.active ? 'text-primary font-serif font-bold' : 'text-muted-foreground'
            }`;
            nodes.push(
                <button
                    key={slot.key}
                    type="button"
                    // 已锁定模块槽：点标题本身即在已锁定模块间轮换（无切换目标时退化为普通槽位）
                    onClick={slot.onSwitch ?? slot.onTap}
                    className={`flex-1 ${labelClass}`}
                    aria-label={slot.onSwitch ? '切换到另一个已锁定模块' : undefined}
                    title={slot.onSwitch ? `在${lockedList.map(mobileNavModuleName).join(' / ')}之间切换` : undefined}
                >
                    {slot.active && (
                        // 双盘指示：两根缩短的黄条并排，高亮位对应当前盘在已锁定列表中的位置
                        slot.onSwitch ? (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-[5px]" aria-hidden="true">
                                {lockedList.map((chart) => (
                                    <span
                                        key={chart}
                                        className={`w-[15px] h-[3px] rounded-b-sm ${
                                            chart === activeChart ? 'bg-primary' : 'bg-primary/35'
                                        }`}
                                    />
                                ))}
                            </span>
                        ) : (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-[26px] h-[3px] rounded-b-sm bg-primary" aria-hidden="true" />
                        )
                    )}
                    <span className="truncate">{slot.label}</span>
                </button>,
            );
        });
        return nodes;
    };

    return (
        <>
            <nav className="relative shrink-0 h-14 border-t border-border bg-background" aria-label="主导航">
                {/* 不用毛玻璃：WKWebView 下 backdrop-filter 合成层会盖住后续 fixed 弹层（如设置生日） */}
                <div key={isHomeLevel ? `home-${slots.join('-')}` : `module-${activeChart}`} className="flex h-full animate-fade-in">
                    {renderBar()}
                </div>
            </nav>

            <BaseModal
                isOpen={gridOpen}
                onClose={() => setGridOpen(false)}
                title={<CompactModalTitle>{casestudyMode ? '案例分类' : '选择功能模块'}</CompactModalTitle>}
                // 底部弹层移动端始终全宽，maxWidth 仅作用于 md+ 居中形态
                maxWidth="md:max-w-md"
                bottomSheet
                bodyClassName="p-4"
            >
                {casestudyMode ? (
                    <>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setGridOpen(false);
                                    if (caseStudyFromProfile) onOpenProfile();
                                    else onSelectChart(MOBILE_NAV_HOME_CHART);
                                }}
                                className="flex-[2] h-10 rounded-lg border border-border bg-secondary/60 text-sm text-foreground flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
                            >
                                {caseStudyFromProfile ? <User className="w-4 h-4 text-muted-foreground" /> : <Home className="w-4 h-4 text-muted-foreground" />}
                                {caseStudyFromProfile ? '返回个人中心' : '返回主菜单'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setCasestudyMode(false)}
                                className="flex-1 h-10 rounded-lg border border-border bg-secondary/60 text-sm text-muted-foreground flex items-center justify-center hover:bg-secondary hover:text-foreground transition-colors"
                            >
                                切换术数
                            </button>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                        setGridOpen(false);
                                        onSelectCaseStudyCategory(cat.id);
                                    }}
                                    className="flex items-center justify-center rounded-xl border border-border bg-background py-5 hover:bg-secondary/40 transition-colors"
                                >
                                    <span className="text-[13px] font-medium text-foreground">
                                        {cat.name === '断法' ? '断法' : `${cat.name}案例`}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        {/* 3 列网格：万年通历 / 术数 / 案例学习 / 个人中心 共 6 格两行；
                            格子进入目标，术数格右侧锁键切换盘面锁定 */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                MOBILE_NAV_HOME_CHART,
                                ...MOBILE_NAV_CANDIDATES.map((item) => item.id),
                                ...MOBILE_NAV_INDEPENDENT.map((item) => item.id),
                            ].map((id) => {
                                const isHome = id === MOBILE_NAV_HOME_CHART;
                                const isIndependent = MOBILE_NAV_INDEPENDENT.some((item) => item.id === id);
                                // 锁键只管盘面锁定；首页与案例学习不可锁定，只显示归属标签
                                const lockable = !isHome && !isIndependent;
                                const locked = lockedCharts.includes(id);
                                const active = id === activeChart && !profileOpen;
                                return (
                                    <div
                                        key={id}
                                        className={`relative flex rounded-xl border transition-colors ${
                                            active
                                                ? 'border-primary/50 bg-primary/10'
                                                : 'border-border bg-background hover:bg-secondary/40'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setGridOpen(false);
                                                onSelectChart(id);
                                            }}
                                            className={`flex w-full min-w-0 flex-col justify-center gap-1.5 px-3 py-3 text-left focus:outline-none focus-ring min-h-[60px] ${
                                                lockable ? 'pr-9' : ''
                                            }`}
                                        >
                                            <span className={`truncate text-[13px] font-medium leading-none ${active ? 'text-primary' : 'text-foreground'}`}>
                                                {mobileNavModuleName(id)}
                                            </span>
                                            {/* 副标签行：统一为「分类」语义，与个人中心的「设置」同级别；
                                                锁定开关状态由右侧锁键表达，不在这里重复 */}
                                            <span className={`text-[10px] leading-none ${
                                                isHome ? 'text-primary' : 'text-muted-foreground'
                                            }`}>
                                                {isHome ? '首页' : isIndependent ? '案例' : '术数'}
                                            </span>
                                        </button>
                                        {/* 锁键固定在格子右侧、垂直居中，不参与标题排版 */}
                                        {lockable && (
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onToggleChartLock(id);
                                                }}
                                                onKeyDown={(event) => {
                                                    if (event.key !== 'Enter' && event.key !== ' ') return;
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    onToggleChartLock(id);
                                                }}
                                                aria-label={locked ? `解除${mobileNavModuleName(id)}盘面锁定` : `锁定${mobileNavModuleName(id)}盘面`}
                                                aria-pressed={locked}
                                                title={locked ? '解除盘面锁定' : '锁定盘面：切走再回来盘面保持不动'}
                                                className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md transition-colors focus:outline-none focus-ring ${
                                                    locked
                                                        ? 'bg-primary/10 text-primary hover:bg-primary/15'
                                                        : 'text-muted-foreground/40 hover:bg-secondary/60 hover:text-muted-foreground'
                                                }`}
                                            >
                                                {locked
                                                    ? <LockKeyhole className="h-3.5 w-3.5" />
                                                    : <LockKeyholeOpen className="h-3.5 w-3.5" />}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}

                            {/* 第 6 格：个人中心（与模块卡片同形同两行结构，补齐两行三列） */}
                            <button
                                type="button"
                                onClick={() => {
                                    setGridOpen(false);
                                    onOpenProfile();
                                }}
                                className="flex w-full min-w-0 flex-col justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-3 text-left transition-colors hover:bg-secondary/40 focus:outline-none focus-ring min-h-[60px]"
                            >
                                <span className="flex min-w-0 items-center gap-1">
                                    <span className="truncate text-[13px] font-medium leading-none text-foreground">个人中心</span>
                                </span>
                                <span className="text-[10px] leading-none text-muted-foreground">设置</span>
                            </button>
                        </div>
                    </>
                )}
            </BaseModal>
        </>
    );
}
