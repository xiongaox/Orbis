/**
 * 案例学习专用大运流年面板 - 精简版
 * 特性：
 * 1. 大运每页8个，共2页（16个大运）
 * 2. 流年只显示10年，不显示小运
 */
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
}

export default function CaseStudyDayunPanel({
    data,
    loading = false,
    currentYear = new Date().getFullYear(),
    selectedDaYunIndex: propDaYunIndex,
    selectedLiuNianYear: propLiuNianYear,
    onSelectDaYun,
    onSelectLiuNian,
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
    const rawDaYun = data?.daYun ?? [];
    const daYun = rawDaYun.slice(0, 14);

    const liuNian = data?.liuNian ?? [];
    const pillars = data?.pillars ?? [];
    const dayMaster = pillars[2]?.tiangan || '丙';

    // 每页显示7个大运
    const ITEMS_PER_PAGE = 7;
    const displayDaYun = useMemo(() => {
        const startIdx = daYunPage * ITEMS_PER_PAGE;
        return daYun.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    }, [daYun, daYunPage]);

    const totalDaYunPages = useMemo(() => Math.ceil(daYun.length / ITEMS_PER_PAGE), [daYun]);

    // 自动确定当前大运
    const autoDaYunIndex = useMemo(() => {
        const found = daYun.find(dy => currentYear >= dy.startYear && currentYear <= dy.endYear);
        return found?.index ?? 1;
    }, [daYun, currentYear]);

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
        return daYun.find(d => d.index === activeDaYunIndex);
    }, [daYun, activeDaYunIndex]);

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
                        {/* 左侧标题区 */}
                        <div className="w-10 bg-secondary/30 border-r border-border flex flex-col items-center justify-center gap-0.5">
                            {/* 上一页按钮 */}
                            {totalDaYunPages > 1 && (
                                <button
                                    onClick={() => setDaYunPage(Math.max(0, daYunPage - 1))}
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
                                    onClick={() => setDaYunPage(Math.min(totalDaYunPages - 1, daYunPage + 1))}
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

                        {/* 大运格子 - 7列 */}
                        <div className="flex-1 min-w-0 overflow-x-auto flex flex-col">
                            <div className="grid grid-cols-7 min-w-0 w-full flex-1">
                                {displayDaYun.map((item) => {
                                    const isActive = item.index === activeDaYunIndex;
                                    return (
                                        <div
                                            key={`dayun-${item.index}`}
                                            className={`min-w-0 p-3 border-r border-border last:border-r-0 cursor-pointer transition-colors hover:bg-primary/10 h-full flex flex-col justify-center ${isActive ? 'bg-primary/5' : ''}`}
                                            onClick={() => handleDaYunClick(item.index)}
                                        >
                                            <div className="flex flex-col items-center text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="text-sm text-muted-foreground leading-snug">
                                                        {item.startAge}岁
                                                    </div>
                                                    <div className="text-sm text-muted-foreground leading-snug">
                                                        {item.startYear}
                                                    </div>
                                                </div>
                                                <div className="mt-3 space-y-1">
                                                    <div className="flex items-baseline justify-center gap-x-1">
                                                        <span
                                                            className="font-display text-base text-foreground leading-none"
                                                            style={{ color: getElementColor(item.tiangan) }}
                                                        >
                                                            {item.tiangan}
                                                        </span>
                                                        <span className="text-base text-muted-foreground leading-none">
                                                            {getShiShenAbbr(dayMaster, item.tiangan)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-baseline justify-center gap-x-1">
                                                        <span
                                                            className="font-display text-base text-foreground leading-none"
                                                            style={{ color: getElementColor(item.dizhi) }}
                                                        >
                                                            {item.dizhi}
                                                        </span>
                                                        <span className="text-base text-muted-foreground leading-none">
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
                                    const isLastColumn = idx === 9;

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
                                            className={`relative min-w-0 p-3 pb-6 border-r border-border cursor-pointer transition-colors hover:bg-primary/10 ${isLastColumn ? '!border-r-0' : ''} ${isSelected ? 'bg-primary/10' : isCurrentYear ? 'bg-primary/5' : ''}`}
                                            onClick={() => handleLiuNianClick(item.year)}
                                        >
                                            <div className="flex flex-col items-center text-center">
                                                <div className="text-sm text-foreground leading-snug">{item.year}</div>
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-baseline justify-center gap-x-1">
                                                        <span
                                                            className="font-display text-base text-foreground leading-none"
                                                            style={{ color: getElementColor(item.tiangan) }}
                                                        >
                                                            {item.tiangan}
                                                        </span>
                                                        <span className="text-base text-muted-foreground leading-none">
                                                            {getShiShenAbbr(dayMaster, item.tiangan)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-baseline justify-center gap-x-1">
                                                        <span
                                                            className="font-display text-base text-foreground leading-none"
                                                            style={{ color: getElementColor(item.dizhi) }}
                                                        >
                                                            {item.dizhi}
                                                        </span>
                                                        <span className="text-base text-muted-foreground leading-none">
                                                            {getShiShenAbbr(dayMaster, item.dizhi)}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* 小运已移除 */}
                                            </div>

                                            {/* 提示小圆点 - 底部居中 */}
                                            {status && (
                                                <div
                                                    role="button"
                                                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 cursor-pointer z-10 p-1 group"
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

                {/* 流月行已移除 */}
            </div>
        </div>
    );
}
