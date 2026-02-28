import { useMemo, useState } from 'react';
import { getShiShen } from '../../../../lib/xuan-bazi/utils';
import { DI_ZHI_CANG_GAN } from '../../../../lib/xuan-bazi/maps/baziJichuMap';
import {
    SHISHEN_GROUP_MAP,
    SHISHEN_SHENG,
    SHISHEN_KE,
    TIANGAN_HE,
    type ShiShenGroup,
} from '../../../../lib/xuan-bazi/maps/shishenGroupMap';

export type Selection = { idx: number; type: 'gan' | 'zhi' } | null;

export interface ChartData {
    items: any[];
    tianGanAdjacentMap: Record<string, any>;
    diZhiAdjacentMap: Record<string, any>;
    verticalMap: Record<number, { type: 'he' | 'sheng' | 'zhu', label: string }>;
    dayMaster: string;
}

const hasGanZhiHe = (gan: string, zhi: string): boolean => {
    const cangGans = DI_ZHI_CANG_GAN[zhi] || [];
    for (const cg of cangGans) {
        if (TIANGAN_HE[gan + cg]) return true;
    }
    return false;
};

export function useGanZhiLiuTong(
    baziData: any,
    selectedDaYunIndex: number | null,
    selectedLiuNianYear: number | null,
    currentYear: number,
    showDaYun: boolean,
    showLiuNian: boolean
) {
    const [selectedNode, setSelectedNode] = useState<Selection>(null);

    const chartData = useMemo<ChartData | null>(() => {
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
        const dayMaster = pillars[2].tiangan;

        const getShiShenGroup = (char: string): ShiShenGroup | null => {
            const shiShen = getShiShen(dayMaster, char);
            return shiShen ? SHISHEN_GROUP_MAP[shiShen] : null;
        };

        const buildHorizontalRelations = (items: any[], isGan: boolean) => {
            const adjacentMap: Record<string, any> = {};
            for (let i = 0; i < items.length - 1; i++) {
                const key = `${i}-${i + 1}`;
                const char1 = isGan ? items[i].gan : items[i].zhi;
                const char2 = isGan ? items[i + 1].gan : items[i + 1].zhi;

                const group1 = getShiShenGroup(char1);
                const group2 = getShiShenGroup(char2);

                if (!group1 || !group2) continue;

                if (SHISHEN_KE[group1] === group2) {
                    adjacentMap[key] = { type: 'ke', label: '克', direction: 'left' };
                    continue;
                }
                if (SHISHEN_KE[group2] === group1) {
                    adjacentMap[key] = { type: 'ke', label: '克', direction: 'right' };
                    continue;
                }
                if (SHISHEN_SHENG[group1] === group2) {
                    adjacentMap[key] = { type: 'sheng', label: '生', direction: 'left' };
                    continue;
                }
                if (SHISHEN_SHENG[group2] === group1) {
                    adjacentMap[key] = { type: 'sheng', label: '生', direction: 'right' };
                    continue;
                }
                if (group1 === group2) {
                    adjacentMap[key] = { type: 'zhu', label: '助' };
                }
            }
            return adjacentMap;
        };

        const buildVerticalRelations = (items: any[]) => {
            const relMap: Record<number, { type: 'he' | 'sheng' | 'zhu', label: string }> = {};
            items.forEach((item, idx) => {
                const ganGroup = getShiShenGroup(item.gan);
                const zhiGroup = getShiShenGroup(item.zhi);

                if (!ganGroup || !zhiGroup) return;

                if (SHISHEN_SHENG[ganGroup] === zhiGroup || SHISHEN_SHENG[zhiGroup] === ganGroup) {
                    relMap[idx] = { type: 'sheng', label: '生' };
                    return;
                }
                if (hasGanZhiHe(item.gan, item.zhi)) {
                    relMap[idx] = { type: 'he', label: '合' };
                    return;
                }
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

    const getNodeShiShenGroup = (idx: number, nodeType: 'gan' | 'zhi'): ShiShenGroup | null => {
        if (!chartData) return null;
        const item = chartData.items[idx];
        const char = nodeType === 'gan' ? item.gan : item.zhi;
        const shiShen = getShiShen(chartData.dayMaster, char);
        return shiShen ? SHISHEN_GROUP_MAP[shiShen] : null;
    };

    const getHighlightedNodesAndEdges = () => {
        if (!selectedNode || !chartData) return { nodes: new Set<string>(), edges: new Set<string>() };

        const highlightedNodes = new Set<string>();
        const highlightedEdges = new Set<string>();
        const queue: Array<{ idx: number; type: 'gan' | 'zhi' }> = [selectedNode];

        while (queue.length > 0) {
            const current = queue.shift()!;
            const key = `${current.idx}-${current.type}`;

            if (highlightedNodes.has(key)) continue;
            highlightedNodes.add(key);

            const currentGroup = getNodeShiShenGroup(current.idx, current.type);

            const tryAddNode = (targetIdx: number, targetType: 'gan' | 'zhi', relType: string, edgeKey: string) => {
                if (relType !== 'sheng' && relType !== 'zhu') return;
                const targetKey = `${targetIdx}-${targetType}`;
                if (highlightedNodes.has(targetKey)) return;

                const targetGroup = getNodeShiShenGroup(targetIdx, targetType);
                if (!targetGroup || !currentGroup) return;

                if (targetGroup === currentGroup || SHISHEN_SHENG[currentGroup] === targetGroup) {
                    queue.push({ idx: targetIdx, type: targetType });
                    highlightedEdges.add(edgeKey);
                }
            };

            const vRel = chartData.verticalMap[current.idx];
            if (vRel) {
                const otherType = current.type === 'gan' ? 'zhi' : 'gan';
                const edgeKey = `v-${current.idx}`;
                tryAddNode(current.idx, otherType, vRel.type, edgeKey);
            }

            const adjMap = current.type === 'gan' ? chartData.tianGanAdjacentMap : chartData.diZhiAdjacentMap;
            if (current.idx > 0) {
                const leftKey = `${current.idx - 1}-${current.idx}`;
                const leftRel = adjMap[leftKey];
                if (leftRel) {
                    const edgeKey = `h-${leftKey}-${current.type}`;
                    tryAddNode(current.idx - 1, current.type, leftRel.type, edgeKey);
                }
            }
            if (current.idx < chartData.items.length - 1) {
                const rightKey = `${current.idx}-${current.idx + 1}`;
                const rightRel = adjMap[rightKey];
                if (rightRel) {
                    const edgeKey = `h-${rightKey}-${current.type}`;
                    tryAddNode(current.idx + 1, current.type, rightRel.type, edgeKey);
                }
            }
        }

        return { nodes: highlightedNodes, edges: highlightedEdges };
    };

    const highlightData = selectedNode ? getHighlightedNodesAndEdges() : null;
    const highlightedNodes = highlightData?.nodes ?? null;
    const highlightedEdges = highlightData?.edges ?? null;

    const isHighlighted = (idx: number, type: 'gan' | 'zhi' | 'both' = 'both') => {
        if (selectedNode === null || !highlightedNodes) return true;
        if (type === 'gan') return highlightedNodes.has(`${idx}-gan`);
        if (type === 'zhi') return highlightedNodes.has(`${idx}-zhi`);
        if (type === 'both') return highlightedNodes.has(`${idx}-gan`) || highlightedNodes.has(`${idx}-zhi`);
        return false;
    };

    const isEdgeHighlighted = (edgeKey: string) => {
        if (selectedNode === null || !highlightedEdges) return true;
        return highlightedEdges.has(edgeKey);
    };

    return {
        chartData,
        selectedNode,
        setSelectedNode,
        getNodeShiShenGroup,
        isHighlighted,
        isEdgeHighlighted
    };
}
