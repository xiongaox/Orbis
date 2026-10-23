import { useState, useMemo, useEffect } from 'react';
import type { BaziApiResponse } from '../../../../types/bazi';
import { getElementColor } from '../../../../lib/xuan-bazi/maps/baziStyleMap';
import { getShiShenAbbr, checkLiunianStatus } from '../../../Modules/Bazi/utils/dayunLiunianUtils';

interface CaseStudyDayunPanelProps {
    data: BaziApiResponse | null;
    loading?: boolean;
    currentYear?: number;
    selectedDaYunIndex?: number | null;
    selectedLiuNianYear?: number | null;
    onSelectDaYun?: (index: number | null) => void;
    onSelectLiuNian?: (year: number | null) => void;
    isMobile?: boolean;
}

export default function CaseStudyDayunPanel({
    data,
    loading = false,
    currentYear = new Date().getFullYear(),
    selectedDaYunIndex: propDaYunIndex,
    selectedLiuNianYear: propLiuNianYear,
    onSelectDaYun,
    onSelectLiuNian,
    isMobile = false,
}: CaseStudyDayunPanelProps) {
    // 内部状态
    const [internalDaYunIndex, setInternalDaYunIndex] = useState<number | null>(null);
    const [internalLiuNianYear, setInternalLiuNianYear] = useState<number | null>(null);
    const [activeHint, setActiveHint] = useState<{ year: number; message: string; type: 'danger' | 'warning' | 'success' } | null>(null);
    const [daYunPage, setDaYunPage] = useState(0);

    // 使用外部状态或内部状态
    const selectedDaYunIndex = propDaYunIndex !== undefined ? propDaYunIndex : internalDaYunIndex;
    const selectedLiuNianYear = propLiuNianYear !== undefined ? propLiuNianYear : internalLiuNianYear;

    // 数据提取
    const liuNian = useMemo(() => data?.liuNian ?? [], [data?.liuNian]);
    const pillars = useMemo(() => data?.pillars ?? [], [data?.pillars]);
    const dayMaster = pillars[2]?.tiangan || '丙';

    // 每页显示 10 个大运：移动端侧栏已占满主界面，一行放得下 10 列
    const ITEMS_PER_PAGE = 10;

    const allDaYun = useMemo(() => data?.daYun ?? [], [data?.daYun]);

    // 大运固定两页：第一页 = 出生前大运（整页低透明度），第二页 = 主大运（小运打头）。
    // 主大运原来要翻两页，收成一页后不再有第三页——第三页是离命主太远的大运，没有研读价值
    const preBirthDaYun = useMemo(() => allDaYun.filter((dy) => dy.index < 0).slice(-ITEMS_PER_PAGE), [allDaYun]);
    const mainDaYun = useMemo(() => allDaYun.filter((dy) => dy.index >= 0).slice(0, ITEMS_PER_PAGE), [allDaYun]);

    const hasPreBirthPage = preBirthDaYun.length > 0;
    // 页 0 = 出生前（有才存在），页 1 = 主大运
    const mainPageIndex = hasPreBirthPage ? 1 : 0;
    const totalDaYunPages = mainPageIndex + 1;
    const isPreBirthPage = hasPreBirthPage && daYunPage === 0;

    const displayDaYun = useMemo(() => {
        const list = (isPreBirthPage ? preBirthDaYun : mainDaYun).slice(0, ITEMS_PER_PAGE);
        // 补空格占位，保持网格列宽与边框稳定（不足一页时不会右侧留白）
        while (list.length < ITEMS_PER_PAGE) {
            list.push({ index: -1000 - list.length, startYear: 0, endYear: 0, startAge: 0, endAge: 0, ganZhi: '', tiangan: '', dizhi: '' });
        }
        return list;
    }, [isPreBirthPage, preBirthDaYun, mainDaYun]);

    // 默认停在主大运页：出生前那页只是备查，开卷就该看命主自己的运
    useEffect(() => {
        setDaYunPage(mainPageIndex);
    }, [data, mainPageIndex]);

    const handleDaYunPageChange = (pageIndex: number) => {
        setDaYunPage(Math.min(totalDaYunPages - 1, Math.max(0, pageIndex)));
    };

    // 自动确定当前大运
    const autoDaYunIndex = useMemo(() => {
        const found = allDaYun.find(dy => currentYear >= dy.startYear && currentYear <= dy.endYear);
        return found?.index ?? 1;
    }, [allDaYun, currentYear]);

    const activeDaYunIndex = selectedDaYunIndex ?? autoDaYunIndex;

    // 获取激活大运对应的流年（不显示小运）
    const displayLiuNian = useMemo(() => {
        let result = liuNian.filter(ln => ln.dayunIndex === activeDaYunIndex);
        if (result.length === 0) {
            result = liuNian.filter(ln => ln.dayunIndex === 1);
        }
        return result.slice(0, 10);
    }, [liuNian, activeDaYunIndex]);

    // 获取当前激活大运对象
    const activeDaYunObject = useMemo(() => {
        return allDaYun.find(d => d.index === activeDaYunIndex);
    }, [allDaYun, activeDaYunIndex]);

    // 流年选中变化时更新提示
    useEffect(() => {
        if (selectedLiuNianYear) {
            const selectedItem = displayLiuNian.find(ln => ln.year === selectedLiuNianYear);
            if (selectedItem) {
                const status = checkLiunianStatus(selectedItem, activeDaYunObject, pillars);
                if (status) {
                    setActiveHint({ year: selectedLiuNianYear, message: status.message, type: status.type });
                } else {
                    setActiveHint(null);
                }
            }
        } else {
            setActiveHint(null);
        }
    }, [selectedLiuNianYear, displayLiuNian, activeDaYunObject, pillars]);

    // 数据切换时重置提示
    useEffect(() => {
        setActiveHint(null);
    }, [data]);

    // 处理大运点击
    const handleDaYunClick = (index: number) => {
        const newIndex = index === selectedDaYunIndex ? null : index;
        if (onSelectDaYun) {
            onSelectDaYun(newIndex);
        } else {
            setInternalDaYunIndex(newIndex);
        }
        // 切换大运时清空流年选择
        if (onSelectLiuNian) {
            onSelectLiuNian(null);
        } else {
            setInternalLiuNianYear(null);
        }
    };

    // 处理流年点击
    const handleLiuNianClick = (year: number) => {
        const newYear = year === selectedLiuNianYear ? null : year;
        if (onSelectLiuNian) {
            onSelectLiuNian(newYear);
        } else {
            setInternalLiuNianYear(newYear);
        }
    };

    // Loading 状态
    if (loading) {
        return (
            <div className="min-h-0 min-w-0 overflow-hidden flex items-center justify-center">
                <div className="text-muted-foreground">加载中...</div>
            </div>
        );
    }

    // 无数据状态
    if (!data) {
        return (
            <div className="min-h-0 min-w-0 overflow-hidden flex items-center justify-center">
                <div className="text-muted-foreground">请选择案例</div>
            </div>
        );
    }

    return (
        <div className="min-h-0 min-w-0 overflow-hidden">
            <div className="overflow-hidden h-fit flex flex-col">
                {/* 大运行 - 每页8个 */}
                <div className="border-b border-border">
                    <div className="flex items-stretch">
                        {/* 左侧标题区（py-1.5 让上下翻页箭头不贴死格子边线） */}
                        <div className="w-10 bg-secondary/30 border-r border-border flex flex-col items-center justify-center gap-0.5 py-1.5">
                            {/* 上一页按钮 */}
                            {totalDaYunPages > 1 && (
                                <button
                                    onClick={() => handleDaYunPageChange(daYunPage - 1)}
                                    disabled={daYunPage === 0}
                                    className={`w-5 h-4 flex items-center justify-center rounded text-[10px] transition-colors
                                        ${daYunPage === 0
                                            ? 'text-muted-foreground/30 cursor-not-allowed'
                                            : 'text-muted-foreground hover:bg-primary/20 hover:text-primary cursor-pointer'}`}
                                    title={daYunPage > 0 ? `上一页 (${daYunPage}/${totalDaYunPages})` : '已是第一页'}
                                >
                                    ▲
                                </button>
                            )}

                            {/* 大运标题 */}
                            <div className="text-base text-foreground/70 font-medium leading-none flex flex-col items-center gap-0.5">
                                <span>大</span>
                                <span>运</span>
                            </div>

                            {/* 页码提示 */}
                            {totalDaYunPages > 1 && (
                                <div className="text-[9px] text-muted-foreground/60 leading-none">
                                    {daYunPage + 1}/{totalDaYunPages}
                                </div>
                            )}

                            {/* 下一页按钮 */}
                            {totalDaYunPages > 1 && (
                                <button
                                    onClick={() => handleDaYunPageChange(daYunPage + 1)}
                                    disabled={daYunPage >= totalDaYunPages - 1}
                                    className={`w-5 h-4 flex items-center justify-center rounded text-[10px] transition-colors
                                        ${daYunPage >= totalDaYunPages - 1
                                            ? 'text-muted-foreground/30 cursor-not-allowed'
                                            : 'text-muted-foreground hover:bg-primary/20 hover:text-primary cursor-pointer'}`}
                                    title={daYunPage < totalDaYunPages - 1 ? `下一页 (${daYunPage + 2}/${totalDaYunPages})` : '已是最后一页'}
                                >
                                    ▼
                                </button>
                            )}
                        </div>

                        {/* 大运格子 - 10列 */}
                        <div className="flex-1 min-w-0 overflow-x-auto flex flex-col">
                            {/* 出生前大运整页降透明度（与四柱八字把出生前大运压暗同一视觉语言）；
                                格内不再逐格降，避免两层透明度叠加成看不清 */}
                            <div className={`grid grid-cols-10 min-w-0 w-full flex-1 ${isPreBirthPage ? 'opacity-40' : ''}`}>
                                {displayDaYun.map((item) => {
                                    // 空占位格（不足一页时补的）：只保留网格边框
                                    if (!item.ganZhi) {
                                        return <div key={`dayun-${item.index}`} className="min-w-0 border-r border-border last:border-r-0" />;
                                    }
                                    const isActive = item.index === activeDaYunIndex;
                                    // 出生前大运的年龄无实际意义，统一显示 0 岁
                                    const isPreBirth = item.index < 0;
                                    return (
                                        <div
                                            key={`dayun-${item.index}`}
                                            className={`min-w-0 ${isMobile ? 'px-0.5 py-1.5' : 'p-3'} border-r border-border last:border-r-0 cursor-pointer transition-colors hover:bg-primary/10 h-full flex flex-col justify-center ${isActive ? 'bg-primary/5' : ''}`}
                                            onClick={() => handleDaYunClick(item.index)}
                                        >
                                            <div className="flex flex-col items-center text-center">
                                                {/* 字号对齐四柱八字菜单（DaYunRow）：10 列同宽，年份/干支/十神
                                                    分别为 12px / 16px / 12px，靠 whitespace-nowrap 保持单行 */}
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground leading-snug whitespace-nowrap`}>
                                                        {isPreBirth ? 0 : item.startAge}岁
                                                    </div>
                                                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground leading-snug whitespace-nowrap`}>
                                                        {item.startYear}
                                                    </div>
                                                </div>
                                                <div className={`${isMobile ? 'mt-1.5 space-y-0.5' : 'mt-3 space-y-1'}`}>
                                                    <div className="flex items-baseline justify-center gap-x-0 whitespace-nowrap">
                                                        <span
                                                            className={`font-display ${isMobile ? 'text-base' : 'text-lg'} text-foreground leading-none`}
                                                            style={{ color: getElementColor(item.tiangan) }}
                                                        >
                                                            {item.tiangan}
                                                        </span>
                                                        <span className={`${isMobile ? 'text-xs' : 'text-base'} text-muted-foreground leading-none`}>
                                                            {getShiShenAbbr(dayMaster, item.tiangan)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-baseline justify-center gap-x-0 whitespace-nowrap">
                                                        <span
                                                            className={`font-display ${isMobile ? 'text-base' : 'text-lg'} text-foreground leading-none`}
                                                            style={{ color: getElementColor(item.dizhi) }}
                                                        >
                                                            {item.dizhi}
                                                        </span>
                                                        <span className={`${isMobile ? 'text-xs' : 'text-base'} text-muted-foreground leading-none`}>
                                                            {getShiShenAbbr(dayMaster, item.dizhi)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 流年行 - 不显示小运 */}
                <div className="border-b border-border">
                    <div className="flex">
                        {/* 左侧标题区 */}
                        <div className="w-10 bg-secondary/30 border-r border-border flex items-center justify-center">
                            <div className="text-base text-foreground/70 font-medium leading-none flex flex-col items-center gap-1">
                                <span>流</span>
                                <span>年</span>
                            </div>
                        </div>

                        {/* 流年格子 */}
                        <div className="flex-1 min-w-0 overflow-x-auto">
                            <div className="grid grid-cols-10 min-w-0 w-full relative">
                                {displayLiuNian.map((item, idx) => {
                                    const isCurrentYear = item.year === currentYear;
                                    const isSelected = item.year === selectedLiuNianYear;
                                    const isLastInRow = idx === 9;

                                    // 计算特殊状态
                                    const status = checkLiunianStatus(item, activeDaYunObject, pillars);
                                    const isHintActive = activeHint?.year === item.year;

                                    // 动态颜色类
                                    let dotColorClass = '';
                                    if (status) {
                                        switch (status.type) {
                                            case 'danger':
                                                dotColorClass = isHintActive ? 'bg-red-500 border-red-500' : 'border-red-500 hover:bg-red-500';
                                                break;
                                            case 'warning':
                                                dotColorClass = isHintActive ? 'bg-yellow-500 border-yellow-500' : 'border-yellow-500 hover:bg-yellow-500';
                                                break;
                                            case 'success':
                                                dotColorClass = isHintActive ? 'bg-green-500 border-green-500' : 'border-green-500 hover:bg-green-500';
                                                break;
                                        }
                                    }

                                    return (
                                        <div
                                            key={item.year}
                                            className={`relative min-w-0 ${isMobile ? 'px-0.5 pt-1.5 pb-3.5' : 'p-3 pb-6'} border-r border-border cursor-pointer transition-colors hover:bg-primary/10 ${isLastInRow ? '!border-r-0' : ''} ${isSelected ? 'bg-primary/10' : isCurrentYear ? 'bg-primary/5' : ''}`}
                                            onClick={() => handleLiuNianClick(item.year)}
                                        >
                                            <div className="flex flex-col items-center text-center">
                                                {/* 同大运：对齐四柱八字流年行的 12px / 16px / 12px */}
                                                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground leading-snug whitespace-nowrap`}>{item.year}</div>
                                                <div className={`${isMobile ? 'mt-1 space-y-0.5' : 'mt-2 space-y-1'}`}>
                                                    <div className="flex items-baseline justify-center gap-x-0 whitespace-nowrap">
                                                        <span
                                                            className={`font-display ${isMobile ? 'text-base' : 'text-lg'} text-foreground leading-none`}
                                                            style={{ color: getElementColor(item.tiangan) }}
                                                        >
                                                            {item.tiangan}
                                                        </span>
                                                        <span className={`${isMobile ? 'text-xs' : 'text-base'} text-muted-foreground leading-none`}>
                                                            {getShiShenAbbr(dayMaster, item.tiangan)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-baseline justify-center gap-x-0 whitespace-nowrap">
                                                        <span
                                                            className={`font-display ${isMobile ? 'text-base' : 'text-lg'} text-foreground leading-none`}
                                                            style={{ color: getElementColor(item.dizhi) }}
                                                        >
                                                            {item.dizhi}
                                                        </span>
                                                        <span className={`${isMobile ? 'text-xs' : 'text-base'} text-muted-foreground leading-none`}>
                                                            {getShiShenAbbr(dayMaster, item.dizhi)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 提示小圆点 - 底部居中 */}
                                            {status && (
                                                <div
                                                    role="button"
                                                    className={`absolute ${isMobile ? 'bottom-0' : 'bottom-1.5'} left-1/2 -translate-x-1/2 cursor-pointer z-10 p-1 group`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (activeHint?.year === item.year) {
                                                            setActiveHint(null);
                                                        } else {
                                                            setActiveHint({ year: item.year, message: status.message, type: status.type });
                                                        }
                                                    }}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full border transition-colors ${dotColorClass}`} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 提示栏 */}
                    {activeHint && (
                        <div
                            className={`w-full px-4 py-2 border-t flex items-center gap-2 animate-in slide-in-from-top-2 duration-200
                                ${activeHint.type === 'danger' ? 'bg-red-500/10 border-red-500/20' :
                                    activeHint.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                                        'bg-green-500/10 border-green-500/20'}`}
                        >
                            <span className="text-xs text-muted-foreground">流年提示：</span>
                            <span
                                className={`text-xs font-medium 
                                    ${activeHint.type === 'danger' ? 'text-red-500' :
                                        activeHint.type === 'warning' ? 'text-yellow-500' :
                                            'text-green-500'}`}
                            >
                                {activeHint.message}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
