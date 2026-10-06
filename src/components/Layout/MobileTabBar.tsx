/**
 * 模块定位：
 * - 主要目标：移动端底部导航栏（方案 C · 极简文字墨栏）与「重选菜单」模块网格浮层
 *
 * 交互模型（design-demos/mobile-bottom-nav 定稿）：
 * - 主菜单层（万年通历首页 / 个人中心）：底栏 = 万年通历（首页固定）+ 可更换术数槽 + 个人中心
 * - 模块层：进入具备抽屉的术数后，底栏原地变为 案例 · 当前模块 · 参考面板 · 重选菜单；
 *   未注册抽屉的模块自动收窄为 当前模块 · 重选菜单
 * - 重选菜单：底部浮层网格，可跳任意已上线术数或返回主菜单
 *
 * 形态：纯文字 13px 衬线高亮 + 顶部墨线，无图标；56px 高，槽间短竖线分隔。
*/
import { useMemo, useState, type ReactNode } from 'react';
import { Home, User } from 'lucide-react';
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

interface MobileTabBarProps {
    activeChart: ChartType;
    /** 个人中心页是否展开（展开时底栏回主菜单层并高亮个人中心） */
    profileOpen: boolean;
    /** 已固定的可换槽位（不含首页） */
    slots: ChartType[];
    /** 当前激活模块注册的抽屉；缺省时模块层自动收窄 */
    drawers?: MobileModuleDrawers;
    onSelectChart: (chart: ChartType) => void;
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
};

export default function MobileTabBar({
    activeChart,
    profileOpen,
    slots,
    drawers,
    onSelectChart,
    onOpenProfile,
    onSelectCaseStudyCategory,
    caseStudyFromProfile = false,
}: MobileTabBarProps) {
    const [gridOpen, setGridOpen] = useState(false);
    // 重选菜单双模式：案例学习内为分类导航，其余为术数模块网格；打开时按当前模块决定
    const [casestudyMode, setCasestudyMode] = useState(false);
    const isHomeLevel = activeChart === MOBILE_NAV_HOME_CHART || profileOpen;

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
        list.push({
            key: 'module',
            label: mobileNavModuleName(activeChart),
            active: true,
            onTap: () => undefined,
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
    }, [isHomeLevel, profileOpen, activeChart, slots, drawers, onSelectChart, onOpenProfile]);

    const renderBar = () => {
        const nodes: ReactNode[] = [];
        barSlots.forEach((slot, index) => {
            if (index > 0) {
                nodes.push(<span key={`sep-${slot.key}`} className="self-center h-3.5 w-px shrink-0 bg-border/60" aria-hidden="true" />);
            }
            nodes.push(
                <button
                    key={slot.key}
                    type="button"
                    onClick={slot.onTap}
                    className={`relative flex-1 min-w-0 h-full flex items-center justify-center text-[15px] font-medium tracking-[0.12em] indent-[0.12em] transition-colors focus:outline-none focus-ring ${
                        slot.active ? 'text-primary font-serif font-bold' : 'text-muted-foreground'
                    }`}
                >
                    {slot.active && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-[26px] h-[3px] rounded-b-sm bg-primary" aria-hidden="true" />
                    )}
                    <span className="truncate">{slot.label}</span>
                </button>,
            );
        });
        return nodes;
    };

    return (
        <>
            <nav className="relative shrink-0 h-14 border-t border-border bg-background/95 backdrop-blur-sm" aria-label="主导航">
                <div key={isHomeLevel ? `home-${slots.join('-')}` : `module-${activeChart}`} className="flex h-full animate-fade-in">
                    {renderBar()}
                </div>
            </nav>

            <BaseModal
                isOpen={gridOpen}
                onClose={() => setGridOpen(false)}
                title={<CompactModalTitle>{casestudyMode ? '案例分类' : '选择功能模块'}</CompactModalTitle>}
                maxWidth="max-w-md"
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
                        <button
                            type="button"
                            onClick={() => {
                                setGridOpen(false);
                                onSelectChart(MOBILE_NAV_HOME_CHART);
                            }}
                            className="w-full h-10 rounded-lg border border-border bg-secondary/60 text-sm text-foreground flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
                        >
                            <Home className="w-4 h-4 text-muted-foreground" />
                            返回主菜单
                        </button>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                            {[
                                MOBILE_NAV_HOME_CHART,
                                ...MOBILE_NAV_CANDIDATES.map((item) => item.id),
                                ...MOBILE_NAV_INDEPENDENT.map((item) => item.id),
                            ].map((id) => {
                                const isHome = id === MOBILE_NAV_HOME_CHART;
                                const isIndependent = MOBILE_NAV_INDEPENDENT.some((item) => item.id === id);
                                const pinned = isHome || isIndependent || slots.includes(id);
                                const tag = isHome ? '首页' : isIndependent ? '独立' : pinned ? '已固定' : '可固定';
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => {
                                            setGridOpen(false);
                                            onSelectChart(id);
                                        }}
                                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-4 transition-colors ${
                                            id === activeChart && !profileOpen
                                                ? 'border-primary/50 bg-primary/10'
                                                : 'border-border bg-background hover:bg-secondary/40'
                                        }`}
                                    >
                                        <span className={`text-[13px] font-medium ${id === activeChart && !profileOpen ? 'text-primary' : 'text-foreground'}`}>
                                            {mobileNavModuleName(id)}
                                        </span>
                                        <span className={`text-[10px] leading-none px-1.5 py-0.5 rounded ${
                                            pinned ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                                        }`}>
                                            {tag}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </BaseModal>
        </>
    );
}
