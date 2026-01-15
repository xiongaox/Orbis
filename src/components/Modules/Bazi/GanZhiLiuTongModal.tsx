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
import { useMemo, useState, useEffect } from 'react';
import { X, ChevronsLeft, ChevronsRight, ChevronsUp, ChevronsDown } from 'lucide-react';
import { getElementColor } from '../../../lib/xuan-bazi/maps/baziStyleMap';
import { getShiShen } from '../../../lib/xuan-bazi/utils';
import { DI_ZHI_CANG_GAN } from '../../../lib/xuan-bazi/maps/baziJichuMap';
import {
    SHISHEN_GROUP_MAP,
    SHISHEN_SHENG,
    SHISHEN_KE,
    TIANGAN_HE,
    LIUTONG_COLORS,
    type ShiShenGroup,
} from '../../../lib/xuan-bazi/maps/shishenGroupMap';
// Hook 未使用，逻辑已内联在组件中

interface GanZhiLiuTongModalProps {
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    baziData: any;
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    currentYear?: number;
}

type Selection = { idx: number; type: 'gan' | 'zhi' } | null;

// 颜色配置（使用集中定义的常量）
const FLOW_COLOR = LIUTONG_COLORS.FLOW;
const BLOCK_COLOR = LIUTONG_COLORS.BLOCK;

// 天干与地支藏干是否有五合关系
const hasGanZhiHe = (gan: string, zhi: string): boolean => {
    const cangGans = DI_ZHI_CANG_GAN[zhi] || [];
    for (const cg of cangGans) {
        if (TIANGAN_HE[gan + cg]) return true;
    }
    return false;
};

export default function GanZhiLiuTongModal({
    isOpen,
    onClose,
    baziData,
    selectedDaYunIndex,
    selectedLiuNianYear,
    currentYear = new Date().getFullYear(),
}: GanZhiLiuTongModalProps) {
    const [mounted, setMounted] = useState(false);
    const [selectedNode, setSelectedNode] = useState<Selection>(null);

    // 当弹窗关闭或数据变化时重置选中
    useEffect(() => {
        if (isOpen) {
            setMounted(true);
        } else {
            setSelectedNode(null);
        }
    }, [isOpen, baziData]);

    const [showDaYun, setShowDaYun] = useState(selectedDaYunIndex !== null);
    const [showLiuNian, setShowLiuNian] = useState(selectedLiuNianYear !== null);

    const chartData = useMemo(() => {
        if (!baziData) return null;

        const { pillars, daYun, liuNian } = baziData;


        // 确定大运
        let activeDaYun = null;
        if (selectedDaYunIndex !== null && daYun && daYun[selectedDaYunIndex]) {
            activeDaYun = daYun[selectedDaYunIndex];
        } else if (daYun) {
            activeDaYun = daYun.find((dy: any) => currentYear >= dy.startYear && currentYear <= dy.endYear);
            if (!activeDaYun && daYun.length > 1) activeDaYun = daYun[1];
            else if (!activeDaYun && daYun.length > 0) activeDaYun = daYun[0];
        }

        // 确定流年
        let activeLiuNian = null;
        if (selectedLiuNianYear !== null && liuNian) {
            activeLiuNian = liuNian.find((ln: any) => ln.year === selectedLiuNianYear);
        } else if (liuNian) {
            activeLiuNian = liuNian.find((ln: any) => ln.year === currentYear);
        }

        // 注：关系判断由 buildHorizontalRelations 和 buildVerticalRelations 实现
        // 基于十神进行关系判断，而非原始的五行生克关系


        // 布局项
        const baseItems = [
            { label: '年柱', gan: pillars[0].tiangan, zhi: pillars[0].dizhi, originalIndex: 0 },
            { label: '月柱', gan: pillars[1].tiangan, zhi: pillars[1].dizhi, originalIndex: 1 },
            { label: '日柱', gan: pillars[2].tiangan, zhi: pillars[2].dizhi, originalIndex: 2 },
            { label: '时柱', gan: pillars[3].tiangan, zhi: pillars[3].dizhi, originalIndex: 3 },
        ];

        const dynamicItems = [];
        let dynamicOffset = 4;

        if (showDaYun && activeDaYun?.ganZhi) {
            dynamicItems.push({ label: '大运', gan: activeDaYun.ganZhi[0], zhi: activeDaYun.ganZhi[1], originalIndex: dynamicOffset++ });
        }

        if (showLiuNian && activeLiuNian?.ganZhi) {
            dynamicItems.push({ label: '流年', gan: activeLiuNian.ganZhi[0], zhi: activeLiuNian.ganZhi[1], originalIndex: dynamicOffset++ });
        }

        const orderedItems = [...dynamicItems.reverse(), ...baseItems];

        const indexMap: Record<number, number> = {};
        orderedItems.forEach((item, idx) => {
            indexMap[item.originalIndex] = idx;
        });


        const dayMaster = pillars[2].tiangan;

        // 获取十神分组
        const getShiShenGroup = (char: string): ShiShenGroup | null => {
            const shiShen = getShiShen(dayMaster, char);
            return shiShen ? SHISHEN_GROUP_MAP[shiShen] : null;
        };

        // 构建相邻关系（生、克、助）- 基于十神
        const buildHorizontalRelations = (items: any[], isGan: boolean) => {
            const adjacentMap: Record<string, any> = {};

            for (let i = 0; i < items.length - 1; i++) {
                const key = `${i}-${i + 1}`;
                const char1 = isGan ? items[i].gan : items[i].zhi;
                const char2 = isGan ? items[i + 1].gan : items[i + 1].zhi;

                const group1 = getShiShenGroup(char1);
                const group2 = getShiShenGroup(char2);

                if (!group1 || !group2) continue;

                // 检查十神克关系
                if (SHISHEN_KE[group1] === group2) {
                    // group1 克 group2 (左克右)
                    adjacentMap[key] = { type: 'ke', label: '克', direction: 'left' };
                    continue;
                }
                if (SHISHEN_KE[group2] === group1) {
                    // group2 克 group1 (右克左)
                    adjacentMap[key] = { type: 'ke', label: '克', direction: 'right' };
                    continue;
                }

                // 检查十神生关系
                if (SHISHEN_SHENG[group1] === group2) {
                    // group1 生 group2 (左生右)
                    adjacentMap[key] = { type: 'sheng', label: '生', direction: 'left' };
                    continue;
                }
                if (SHISHEN_SHENG[group2] === group1) {
                    // group2 生 group1 (右生左)
                    adjacentMap[key] = { type: 'sheng', label: '生', direction: 'right' };
                    continue;
                }

                // 检查是否同十神分组（助）
                if (group1 === group2) {
                    adjacentMap[key] = { type: 'zhu', label: '助' };
                }
            }

            return adjacentMap;
        };

        // 构建同柱天干地支之间的关系（生 > 合 > 助）
        const buildVerticalRelations = (items: any[]) => {
            const relMap: Record<number, { type: 'he' | 'sheng' | 'zhu', label: string }> = {};
            items.forEach((item, idx) => {
                const ganGroup = getShiShenGroup(item.gan);
                const zhiGroup = getShiShenGroup(item.zhi);

                if (!ganGroup || !zhiGroup) return;

                // 1. 优先判断生
                if (SHISHEN_SHENG[ganGroup] === zhiGroup || SHISHEN_SHENG[zhiGroup] === ganGroup) {
                    relMap[idx] = { type: 'sheng', label: '生' };
                    return;
                }

                // 2. 判断合（天干与地支藏干五合）
                if (hasGanZhiHe(item.gan, item.zhi)) {
                    relMap[idx] = { type: 'he', label: '合' };
                    return;
                }

                // 3. 判断助（同十神分组）
                if (ganGroup === zhiGroup) {
                    relMap[idx] = { type: 'zhu', label: '助' };
                }
            });
            return relMap;
        };

        return {
            items: orderedItems,
            tianGanAdjacentMap: buildHorizontalRelations(orderedItems, true),
            diZhiAdjacentMap: buildHorizontalRelations(orderedItems, false),
            verticalMap: buildVerticalRelations(orderedItems),
            dayMaster
        };

    }, [baziData, selectedDaYunIndex, selectedLiuNianYear, showDaYun, showLiuNian, currentYear]);

    if (!isOpen || !mounted) return null;

    // 获取节点的十神分组
    const getNodeShiShenGroup = (idx: number, nodeType: 'gan' | 'zhi'): ShiShenGroup | null => {
        if (!chartData) return null;
        const item = chartData.items[idx];
        const char = nodeType === 'gan' ? item.gan : item.zhi;
        const shiShen = getShiShen(chartData.dayMaster, char);
        return shiShen ? SHISHEN_GROUP_MAP[shiShen] : null;
    };

    // 计算所有应该高亮的节点和边（使用 BFS 链式传递）
    const getHighlightedNodesAndEdges = (): { nodes: Set<string>; edges: Set<string> } => {
        if (!selectedNode || !chartData) return { nodes: new Set(), edges: new Set() };

        const highlightedNodes = new Set<string>();
        const highlightedEdges = new Set<string>(); // 格式: "idx-type1-type2" 或 "idx1-idx2-type"
        const queue: Array<{ idx: number; type: 'gan' | 'zhi' }> = [selectedNode];

        while (queue.length > 0) {
            const current = queue.shift()!;
            const key = `${current.idx}-${current.type}`;

            if (highlightedNodes.has(key)) continue;
            highlightedNodes.add(key);

            const currentGroup = getNodeShiShenGroup(current.idx, current.type);

            // 检查可以传递到的节点
            const tryAddNode = (targetIdx: number, targetType: 'gan' | 'zhi', relType: string, edgeKey: string) => {
                // 只有"生"和"助"关系才传递（不包括"克"和"合"）
                if (relType !== 'sheng' && relType !== 'zhu') return;

                const targetKey = `${targetIdx}-${targetType}`;
                if (highlightedNodes.has(targetKey)) return;

                const targetGroup = getNodeShiShenGroup(targetIdx, targetType);
                if (!targetGroup) return;

                if (!currentGroup) return;

                const isValidRelation =
                    targetGroup === currentGroup ||
                    SHISHEN_SHENG[currentGroup] === targetGroup;

                if (isValidRelation) {
                    queue.push({ idx: targetIdx, type: targetType });
                    highlightedEdges.add(edgeKey); // 记录这条边
                }
            };

            // 1. 检查同柱垂直关系
            const vRel = chartData.verticalMap[current.idx];
            if (vRel) {
                const otherType = current.type === 'gan' ? 'zhi' : 'gan';
                const edgeKey = `v-${current.idx}`; // 垂直边标识
                tryAddNode(current.idx, otherType, vRel.type, edgeKey);
            }

            // 2. 检查水平相邻关系
            const adjMap = current.type === 'gan' ? chartData.tianGanAdjacentMap : chartData.diZhiAdjacentMap;

            // 左边相邻
            if (current.idx > 0) {
                const leftKey = `${current.idx - 1}-${current.idx}`;
                const leftRel = adjMap[leftKey];
                if (leftRel) {
                    const edgeKey = `h-${leftKey}-${current.type}`; // 水平边标识
                    tryAddNode(current.idx - 1, current.type, leftRel.type, edgeKey);
                }
            }

            // 右边相邻
            if (current.idx < chartData.items.length - 1) {
                const rightKey = `${current.idx}-${current.idx + 1}`;
                const rightRel = adjMap[rightKey];
                if (rightRel) {
                    const edgeKey = `h-${rightKey}-${current.type}`; // 水平边标识
                    tryAddNode(current.idx + 1, current.type, rightRel.type, edgeKey);
                }
            }
        }

        return { nodes: highlightedNodes, edges: highlightedEdges };
    };

    // 高亮逻辑：链式传递
    const highlightData = selectedNode ? getHighlightedNodesAndEdges() : null;
    const highlightedNodes = highlightData?.nodes ?? null;
    const highlightedEdges = highlightData?.edges ?? null;

    const isHighlighted = (idx: number, type: 'gan' | 'zhi' | 'both' = 'both') => {
        if (selectedNode === null) return true;
        if (!highlightedNodes) return true;

        if (type === 'gan') return highlightedNodes.has(`${idx}-gan`);
        if (type === 'zhi') return highlightedNodes.has(`${idx}-zhi`);
        if (type === 'both') return highlightedNodes.has(`${idx}-gan`) || highlightedNodes.has(`${idx}-zhi`);

        return false;
    };

    // 检查边是否在传递路径上
    const isEdgeHighlighted = (edgeKey: string) => {
        if (selectedNode === null) return true;
        if (!highlightedEdges) return true;
        return highlightedEdges.has(edgeKey);
    };

    const getShiShenLabel = (target: string, dayMaster: string) => {
        if (!chartData) return '';
        return getShiShen(dayMaster, target) || '';
    };

    // 渲染水平关系符号（生、克、助）
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
                // 左生右：箭头指向右
                return (
                    <div className="flex items-center justify-center whitespace-nowrap" style={{ opacity }}>
                        <div
                            className="flex items-center gap-0.5 px-1 py-0.5 border-t border-b"
                            style={{ borderColor: color }}
                        >
                            <ChevronsRight className="w-3 h-3" style={{ color }} />
                            <span className="text-xs font-medium" style={{ color }}>{rel.label}</span>
                            <ChevronsRight className="w-3 h-3" style={{ color }} />
                        </div>
                    </div>
                );
            } else {
                // 右生左：箭头指向左
                return (
                    <div className="flex items-center justify-center whitespace-nowrap" style={{ opacity }}>
                        <div
                            className="flex items-center gap-0.5 px-1 py-0.5 border-t border-b"
                            style={{ borderColor: color }}
                        >
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
                    <span
                        className="px-1.5 py-0.5 text-xs font-medium rounded border"
                        style={{ color: BLOCK_COLOR, borderColor: BLOCK_COLOR }}
                    >
                        {rel.label}
                    </span>
                </div>
            );
        } else if (rel.type === 'zhu') {
            // 助：=助= 带上下直线包裹
            return (
                <div className="flex items-center justify-center whitespace-nowrap" style={{ opacity }}>
                    <div
                        className="flex items-center px-1 border-t border-b"
                        style={{ borderColor: FLOW_COLOR }}
                    >
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

        // 根据十神判断生的方向
        const ganGroup = getNodeShiShenGroup(idx, 'gan');
        const zhiGroup = getNodeShiShenGroup(idx, 'zhi');

        let isUpward = false;
        if (rel.type === 'sheng' && ganGroup && zhiGroup) {
            // 地支生天干（向上）: SHISHEN_SHENG[zhiGroup] === ganGroup
            if (SHISHEN_SHENG[zhiGroup] === ganGroup) {
                isUpward = true;
            }
        }

        // 符号高亮逻辑：只有在传递路径上的边才高亮
        const edgeKey = `v-${idx}`;
        let isActive = false;
        if (selectedNode === null) {
            isActive = true;
        } else {
            isActive = isEdgeHighlighted(edgeKey);
        }

        const opacity = isActive ? 1 : 0.3;

        if (rel.type === 'he') {
            return (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center py-1"
                    style={{ opacity }}
                >
                    <div
                        className="flex flex-col items-center border-l border-r px-1.5"
                        style={{ borderColor: FLOW_COLOR }}
                    >
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
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center py-1"
                    style={{ opacity }}
                >
                    <div
                        className="flex flex-col items-center border-l border-r px-1.5"
                        style={{ borderColor: FLOW_COLOR }}
                    >
                        <IconTop className="w-3 h-3" style={{ color: FLOW_COLOR }} />
                        <span className="text-xs font-medium my-0.5" style={{ color: FLOW_COLOR }}>生</span>
                        <IconBottom className="w-3 h-3" style={{ color: FLOW_COLOR }} />
                    </div>
                </div>
            );
        }

        if (rel.type === 'zhu') {
            return (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center py-1"
                    style={{ opacity }}
                >
                    <div
                        className="flex flex-col items-center border-l border-r px-1.5"
                        style={{ borderColor: FLOW_COLOR }}
                    >
                        <span style={{ color: FLOW_COLOR, fontSize: 10 }}>||</span>
                        <span className="text-xs font-medium my-0.5" style={{ color: FLOW_COLOR }}>助</span>
                        <span style={{ color: FLOW_COLOR, fontSize: 10 }}>||</span>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-[720px] max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
                    <h2 className="text-lg font-medium text-foreground">干支流通</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
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
                        <div className="w-px h-4 bg-border" />
                        <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-8 flex flex-col items-center justify-center bg-dot-pattern">
                    {chartData && (
                        <div className="flex flex-col gap-2">
                            {/* 天干十神行 */}
                            <div className="flex items-center">
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

                            {/* 柱标签行 + 同柱合（移除文字标签，仅保留合的位置） */}
                            <div className="flex items-center relative h-16">
                                {chartData.items.map((_item: any, idx: number) => (
                                    <div key={`label-${idx}`} className="flex items-center h-full">
                                        <div className="w-14 text-center relative h-full flex items-center justify-center" style={{ opacity: isHighlighted(idx, 'both') ? 1 : 0.3 }}>
                                            {/* 渲染同柱关系（合、生、助） */}
                                            {renderVerticalSymbol(idx)}
                                        </div>
                                        {idx < chartData.items.length - 1 && <div className="w-12" />}
                                    </div>
                                ))}
                            </div>

                            {/* 地支行 */}
                            <div className="flex items-center">
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
                    <div className="flex items-center justify-center gap-6 mt-8">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#63A103]/10 border border-[#63A103]/20">
                            <span className="w-4 h-4 flex items-center justify-center rounded-full bg-[#63A103]/20 text-[10px]" style={{ color: FLOW_COLOR }}>✓</span>
                            <span className="text-xs font-medium" style={{ color: FLOW_COLOR }}>流通</span>
                            <span className="text-xs text-muted-foreground">合・生・助</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                            <span className="w-4 h-4 flex items-center justify-center rounded-full bg-red-500/20 text-[10px]" style={{ color: BLOCK_COLOR }}>✗</span>
                            <span className="text-xs font-medium" style={{ color: BLOCK_COLOR }}>阻塞</span>
                            <span className="text-xs text-muted-foreground">冲・刑・克・害・破</span>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground/60 mt-4 text-center">
                        💡 点击任意柱位可高亮其相关关系，再次点击取消
                    </div>
                </div>
            </div>
        </div>
    );
}
