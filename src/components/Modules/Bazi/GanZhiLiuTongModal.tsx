/**
 * 干支流通图解弹窗
 * 展示八字四柱之间的生克流通关系
 * 
 * 符号规则：
 * - 生：》生》 箭头指向被生的一方
 * - 克：《克》 方框形式，不带箭头
 * - 助：=助= 同五行
 * - 合：只在同柱天干地支之间显示（如己亥合）
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronsLeft, ChevronsRight, ChevronsUp, ChevronsDown, ArrowRightLeft } from 'lucide-react';
import BaseModal from '../../UI/BaseModal';
import { getElementColor } from '../../../lib/xuan-bazi/maps/baziStyleMap';
import { getShiShen } from '../../../lib/xuan-bazi/utils';
import {
    LIUTONG_COLORS,
    SHISHEN_SHENG
} from '../../../lib/xuan-bazi/maps/shishenGroupMap';
import { useGanZhiLiuTong } from './hooks/useGanZhiLiuTong';

interface GanZhiLiuTongModalProps {
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    baziData: any;
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    currentYear?: number;
}

// 颜色配置
const FLOW_COLOR = LIUTONG_COLORS.FLOW;
const BLOCK_COLOR = LIUTONG_COLORS.BLOCK;

export default function GanZhiLiuTongModal({
    isOpen,
    onClose,
    baziData,
    selectedDaYunIndex,
    selectedLiuNianYear,
    currentYear = new Date().getFullYear(),
}: GanZhiLiuTongModalProps) {
    const [mounted, setMounted] = useState(false);
    const [showDaYun, setShowDaYun] = useState(selectedDaYunIndex !== null);
    const [showLiuNian, setShowLiuNian] = useState(selectedLiuNianYear !== null);

    // 核心流转与高亮运算钩子
    const {
        chartData,
        selectedNode,
        setSelectedNode,
        getNodeShiShenGroup,
        isHighlighted,
        isEdgeHighlighted
    } = useGanZhiLiuTong(
        baziData,
        selectedDaYunIndex,
        selectedLiuNianYear,
        currentYear,
        showDaYun,
        showLiuNian
    );

    // 当弹窗关闭或数据变化时重置选中
    useEffect(() => {
        if (isOpen) {
            setMounted(true);
        } else {
            setSelectedNode(null);
        }
    }, [isOpen, baziData, setSelectedNode]);

    // 移动端检测
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // 移动端捏合缩放 - callback ref 确保 DOM 变化时重新绑定
    const [scale, setScale] = useState(1);
    const lastDistRef = useRef<number | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    // 根据柱数自动计算适配缩放
    const itemCount = (showDaYun ? 1 : 0) + (showLiuNian ? 1 : 0) + 4;
    useEffect(() => {
        const screenW = window.innerWidth;
        if (screenW >= 768) { setScale(1); return; }
        // 每柱 w-14(56px) + 间距 w-12(48px)，加上容器 padding
        const contentW = itemCount * 56 + (itemCount - 1) * 48;
        const availableW = screenW - 48; // p-6 两边共 48px
        if (contentW > availableW) {
            setScale(Math.max(0.5, availableW / contentW));
        } else {
            setScale(1);
        }
    }, [itemCount]);

    const containerRef = useCallback((el: HTMLDivElement | null) => {
        cleanupRef.current?.();
        cleanupRef.current = null;
        if (!el) return;

        const getDist = (e: TouchEvent) => {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            return Math.hypot(dx, dy);
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) lastDistRef.current = getDist(e);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && lastDistRef.current !== null) {
                e.preventDefault();
                const dist = getDist(e);
                const ratio = dist / lastDistRef.current;
                setScale(prev => Math.min(3, Math.max(0.5, prev * ratio)));
                lastDistRef.current = dist;
            }
        };

        const handleTouchEnd = () => { lastDistRef.current = null; };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);

        cleanupRef.current = () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    const onDoubleClick = useCallback(() => {
        // 双击重置为自动适配缩放
        const screenW = window.innerWidth;
        if (screenW >= 768) { setScale(1); return; }
        const contentW = itemCount * 56 + (itemCount - 1) * 48;
        const availableW = screenW - 48;
        setScale(contentW > availableW ? Math.max(0.5, availableW / contentW) : 1);
    }, [itemCount]);

    if (!isOpen || !mounted) return null;

    const getShiShenLabel = (target: string, dayMaster: string) => {
        if (!chartData) return '';
        return getShiShen(dayMaster, target) || '';
    };

    // 渲染水平关系符号（生、克、助）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderHorizontalSymbol = (adjacentMap: Record<string, any>, leftIdx: number, type: 'gan' | 'zhi') => {
        const key = `${leftIdx}-${leftIdx + 1}`;
        const rel = adjacentMap[key];

        if (!rel) return null;

        // 符号高亮逻辑：只有在传递路径上的边才高亮
        const edgeKey = `h-${key}-${type}`;
        let isActive = false;
        if (selectedNode === null) {
            isActive = true;
        } else if (rel.type === 'ke') {
            isActive = false; // 克永不高亮
        } else {
            // 生/助：检查这条边是否在传递路径上
            isActive = isEdgeHighlighted(edgeKey);
        }

        const opacity = isActive ? 1 : 0.3;

        if (rel.type === 'sheng') {
            // 生：使用双箭头图标
            const color = FLOW_COLOR;
            if (rel.direction === 'left') {
                return (
                    <div className="flex items-center justify-center whitespace-nowrap" style={{ opacity }}>
                        <div className="flex items-center gap-0.5 px-1 py-0.5 border-t border-b" style={{ borderColor: color }}>
                            <ChevronsRight className="w-3 h-3" style={{ color }} />
                            <span className="text-xs font-medium" style={{ color }}>{rel.label}</span>
                            <ChevronsRight className="w-3 h-3" style={{ color }} />
                        </div>
                    </div>
                );
            } else {
                return (
                    <div className="flex items-center justify-center whitespace-nowrap" style={{ opacity }}>
                        <div className="flex items-center gap-0.5 px-1 py-0.5 border-t border-b" style={{ borderColor: color }}>
                            <ChevronsLeft className="w-3 h-3" style={{ color }} />
                            <span className="text-xs font-medium" style={{ color }}>{rel.label}</span>
                            <ChevronsLeft className="w-3 h-3" style={{ color }} />
                        </div>
                    </div>
                );
            }
        } else if (rel.type === 'ke') {
            // 克：无箭头方框
            return (
                <div className="flex items-center justify-center" style={{ opacity }}>
                    <span className="px-1.5 py-0.5 text-xs font-medium rounded border" style={{ color: BLOCK_COLOR, borderColor: BLOCK_COLOR }}>
                        {rel.label}
                    </span>
                </div>
            );
        } else if (rel.type === 'zhu') {
            // 助：=助= 带上下直线包裹
            return (
                <div className="flex items-center justify-center whitespace-nowrap" style={{ opacity }}>
                    <div className="flex items-center px-1 border-t border-b" style={{ borderColor: FLOW_COLOR }}>
                        <span style={{ color: FLOW_COLOR, fontSize: 12 }}>=</span>
                        <span className="text-xs font-medium mx-1" style={{ color: FLOW_COLOR }}>{rel.label}</span>
                        <span style={{ color: FLOW_COLOR, fontSize: 12 }}>=</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // 渲染同柱天干地支之间的关系
    const renderVerticalSymbol = (idx: number) => {
        if (!chartData?.verticalMap[idx]) return null;

        const rel = chartData.verticalMap[idx];
        const ganGroup = getNodeShiShenGroup(idx, 'gan');
        const zhiGroup = getNodeShiShenGroup(idx, 'zhi');

        let isUpward = false;
        if (rel.type === 'sheng' && ganGroup && zhiGroup) {
            // 地支生天干（向上）
            if (SHISHEN_SHENG[zhiGroup] === ganGroup) isUpward = true;
        }

        // 符号高亮逻辑：只有在传递路径上的边才高亮
        const edgeKey = `v-${idx}`;
        const isActive = selectedNode === null ? true : isEdgeHighlighted(edgeKey);
        const opacity = isActive ? 1 : 0.3;

        if (rel.type === 'he') {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center py-1" style={{ opacity }}>
                    <div className="flex flex-col items-center border-l border-r px-1.5" style={{ borderColor: FLOW_COLOR }}>
                        <ChevronsDown className="w-3 h-3" style={{ color: FLOW_COLOR }} />
                        <span className="text-xs font-medium my-0.5" style={{ color: FLOW_COLOR }}>合</span>
                        <ChevronsUp className="w-3 h-3" style={{ color: FLOW_COLOR }} />
                    </div>
                </div>
            );
        }

        if (rel.type === 'sheng') {
            const IconTop = isUpward ? ChevronsUp : ChevronsDown;
            const IconBottom = isUpward ? ChevronsUp : ChevronsDown;
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center py-1" style={{ opacity }}>
                    <div className="flex flex-col items-center border-l border-r px-1.5" style={{ borderColor: FLOW_COLOR }}>
                        <IconTop className="w-3 h-3" style={{ color: FLOW_COLOR }} />
                        <span className="text-xs font-medium my-0.5" style={{ color: FLOW_COLOR }}>生</span>
                        <IconBottom className="w-3 h-3" style={{ color: FLOW_COLOR }} />
                    </div>
                </div>
            );
        }

        if (rel.type === 'zhu') {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center py-1" style={{ opacity }}>
                    <div className="flex flex-col items-center border-l border-r px-1.5" style={{ borderColor: FLOW_COLOR }}>
                        <span style={{ color: FLOW_COLOR, fontSize: 10 }}>||</span>
                        <span className="text-xs font-medium my-0.5" style={{ color: FLOW_COLOR }}>助</span>
                        <span style={{ color: FLOW_COLOR, fontSize: 10 }}>||</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Header Content
    const header = (
        <div className="flex items-center justify-between w-full">
            <span className="text-lg font-medium text-foreground">干支流通</span>
            <div className="flex items-center gap-2 mr-6">
                <button
                    onClick={() => setShowLiuNian(!showLiuNian)}
                    className={`px-3 py-1 text-sm rounded-md border transition-colors ${showLiuNian
                        ? 'bg-primary/20 text-primary border-primary/50'
                        : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                        }`}
                >
                    流年
                </button>
                <button
                    onClick={() => setShowDaYun(!showDaYun)}
                    className={`px-3 py-1 text-sm rounded-md border transition-colors ${showDaYun
                        ? 'bg-primary/20 text-primary border-primary/50'
                        : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                        }`}
                >
                    大运
                </button>
            </div>
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={header}
            titleIcon={<ArrowRightLeft className="w-5 h-5" />}
            maxWidth={isMobile ? 'max-w-none' : 'max-w-[720px]'}
            className={isMobile ? '!w-screen !h-screen !max-h-screen !rounded-none !m-[-1rem]' : ''}
            bodyClassName={`p-0 overflow-hidden flex flex-col bg-dot-pattern ${isMobile ? '' : 'min-h-[500px]'}`}
        >
            <div
                ref={containerRef}
                className="flex-1 overflow-auto p-8 flex flex-col items-center justify-center"
                onDoubleClick={onDoubleClick}
                style={{ touchAction: 'pan-x pan-y' }}
            >
                {chartData && (
                    <div
                        className="flex flex-col gap-2"
                        style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
                    >
                        {/* 天干十神行 */}
                        <div className="flex items-center">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {chartData.items.map((item: any, idx: number) => (
                                <div key={`shishen-gan-${idx}`} className="flex items-center">
                                    <div className="w-14 text-center" style={{ opacity: isHighlighted(idx, 'gan') ? 1 : 0.3 }}>
                                        <span className="text-xs text-muted-foreground">
                                            {getShiShenLabel(item.gan, chartData.dayMaster)}
                                        </span>
                                    </div>
                                    {idx < chartData.items.length - 1 && <div className="w-12" />}
                                </div>
                            ))}
                        </div>

                        {/* 天干行 */}
                        <div className="flex items-center">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {chartData.items.map((item: any, idx: number) => {
                                const isDynamic = item.label === '流年' || item.label === '大运';
                                return (
                                    <div key={`gan-${idx}`} className="flex items-center">
                                        <div
                                            className={`w-14 h-14 flex items-center justify-center cursor-pointer transition-all rounded-lg ${isDynamic ? 'border border-dashed border-primary/40' : ''}`}
                                            style={{
                                                opacity: isHighlighted(idx, 'gan') ? 1 : 0.3,
                                                backgroundColor: (selectedNode?.idx === idx && selectedNode?.type === 'gan') ? 'hsl(var(--primary) / 0.1)' : 'transparent'
                                            }}
                                            onClick={() => setSelectedNode(
                                                (selectedNode?.idx === idx && selectedNode?.type === 'gan') ? null : { idx, type: 'gan' }
                                            )}
                                        >
                                            <span className="font-display text-2xl font-bold" style={{ color: getElementColor(item.gan) }}>
                                                {item.gan}
                                            </span>
                                        </div>
                                        {idx < chartData.items.length - 1 && (
                                            <div className="w-12 flex items-center justify-center">
                                                {renderHorizontalSymbol(chartData.tianGanAdjacentMap, idx, 'gan')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 柱标签行 + 同柱合 */}
                        <div className="flex items-center relative h-16">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {chartData.items.map((_item: any, idx: number) => (
                                <div key={`label-${idx}`} className="flex items-center h-full">
                                    <div className="w-14 text-center relative h-full flex items-center justify-center" style={{ opacity: isHighlighted(idx, 'both') ? 1 : 0.3 }}>
                                        {renderVerticalSymbol(idx)}
                                    </div>
                                    {idx < chartData.items.length - 1 && <div className="w-12" />}
                                </div>
                            ))}
                        </div>

                        {/* 地支行 */}
                        <div className="flex items-center">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {chartData.items.map((item: any, idx: number) => {
                                const isDynamic = item.label === '流年' || item.label === '大运';
                                return (
                                    <div key={`zhi-${idx}`} className="flex items-center">
                                        <div
                                            className={`w-14 h-14 flex items-center justify-center cursor-pointer transition-all rounded-lg ${isDynamic ? 'border border-dashed border-primary/40' : ''}`}
                                            style={{
                                                opacity: isHighlighted(idx, 'zhi') ? 1 : 0.3,
                                                backgroundColor: (selectedNode?.idx === idx && selectedNode?.type === 'zhi') ? 'hsl(var(--primary) / 0.1)' : 'transparent'
                                            }}
                                            onClick={() => setSelectedNode(
                                                (selectedNode?.idx === idx && selectedNode?.type === 'zhi') ? null : { idx, type: 'zhi' }
                                            )}
                                        >
                                            <span className="font-display text-2xl font-bold" style={{ color: getElementColor(item.zhi) }}>
                                                {item.zhi}
                                            </span>
                                        </div>
                                        {idx < chartData.items.length - 1 && (
                                            <div className="w-12 flex items-center justify-center">
                                                {renderHorizontalSymbol(chartData.diZhiAdjacentMap, idx, 'zhi')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 地支十神行 */}
                        <div className="flex items-center">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {chartData.items.map((item: any, idx: number) => (
                                <div key={`shishen-zhi-${idx}`} className="flex items-center">
                                    <div className="w-14 text-center" style={{ opacity: isHighlighted(idx, 'zhi') ? 1 : 0.3 }}>
                                        <span className="text-xs text-muted-foreground">
                                            {getShiShenLabel(item.zhi, chartData.dayMaster)}
                                        </span>
                                    </div>
                                    {idx < chartData.items.length - 1 && <div className="w-12" />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 图例 */}
                <div className="flex items-center justify-center gap-3 mt-8">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#63A103]/10 border border-[#63A103]/20 whitespace-nowrap">
                        <span className="w-4 h-4 flex items-center justify-center rounded-full bg-[#63A103]/20 text-[10px]" style={{ color: FLOW_COLOR }}>✓</span>
                        <span className="text-xs font-medium" style={{ color: FLOW_COLOR }}>流通</span>
                        <span className="text-xs text-muted-foreground">合・生・助</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 whitespace-nowrap">
                        <span className="w-4 h-4 flex items-center justify-center rounded-full bg-red-500/20 text-[10px]" style={{ color: BLOCK_COLOR }}>✗</span>
                        <span className="text-xs font-medium" style={{ color: BLOCK_COLOR }}>阻塞</span>
                        <span className="text-xs text-muted-foreground">冲・刑・克・害・破</span>
                    </div>
                </div>

                <div className="text-xs text-muted-foreground/60 mt-4 text-center">
                    💡 点击任意柱位可高亮其相关关系，再次点击取消
                </div>
            </div>
        </BaseModal>
    );
}
