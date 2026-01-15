/**
 * useGanZhiLiuTong Hook
 * 计算干支流通关系（生、克、助、合）
 * 从 GanZhiLiuTongModal.tsx 提取的核心业务逻辑
 */
import { useMemo } from 'react';
import { getShiShen } from '../lib/xuan-bazi/utils';
import { DI_ZHI_CANG_GAN } from '../lib/xuan-bazi/maps/baziJichuMap';
import {
    SHISHEN_GROUP_MAP,
    SHISHEN_SHENG,
    SHISHEN_KE,
    TIANGAN_HE,
    type ShiShenGroup,
} from '../lib/xuan-bazi/maps/shishenGroupMap';

// 布局项类型
export interface LiuTongItem {
    label: string;
    gan: string;
    zhi: string;
    originalIndex: number;
}

// 关系类型
export interface RelationType {
    type: 'he' | 'sheng' | 'ke' | 'zhu';
    label: string;
    direction?: 'left' | 'right';
}

// Hook 返回类型
export interface GanZhiLiuTongData {
    items: LiuTongItem[];
    tianGanAdjacentMap: Record<string, RelationType>;
    diZhiAdjacentMap: Record<string, RelationType>;
    verticalMap: Record<number, RelationType>;
    dayMaster: string;
}

interface UseGanZhiLiuTongParams {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    baziData: any;
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    currentYear: number;
    showDaYun: boolean;
    showLiuNian: boolean;
}

/**
 * 检查天干与地支藏干是否有五合关系
 */
function hasGanZhiHe(gan: string, zhi: string): boolean {
    const cangGans = DI_ZHI_CANG_GAN[zhi] || [];
    for (const cg of cangGans) {
        if (TIANGAN_HE[gan + cg]) return true;
    }
    return false;
}

/**
 * 干支流通数据 Hook
 */
export function useGanZhiLiuTong({
    baziData,
    selectedDaYunIndex,
    selectedLiuNianYear,
    currentYear,
    showDaYun,
    showLiuNian,
}: UseGanZhiLiuTongParams): GanZhiLiuTongData | null {
    return useMemo(() => {
        if (!baziData) return null;

        const { pillars, daYun, liuNian } = baziData;
        const dayMaster = pillars[2].tiangan;

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

        // 布局项
        const baseItems: LiuTongItem[] = [
            { label: '年柱', gan: pillars[0].tiangan, zhi: pillars[0].dizhi, originalIndex: 0 },
            { label: '月柱', gan: pillars[1].tiangan, zhi: pillars[1].dizhi, originalIndex: 1 },
            { label: '日柱', gan: pillars[2].tiangan, zhi: pillars[2].dizhi, originalIndex: 2 },
            { label: '时柱', gan: pillars[3].tiangan, zhi: pillars[3].dizhi, originalIndex: 3 },
        ];

        const dynamicItems: LiuTongItem[] = [];
        let dynamicOffset = 4;

        if (showDaYun && activeDaYun?.ganZhi) {
            dynamicItems.push({ label: '大运', gan: activeDaYun.ganZhi[0], zhi: activeDaYun.ganZhi[1], originalIndex: dynamicOffset++ });
        }

        if (showLiuNian && activeLiuNian?.ganZhi) {
            dynamicItems.push({ label: '流年', gan: activeLiuNian.ganZhi[0], zhi: activeLiuNian.ganZhi[1], originalIndex: dynamicOffset++ });
        }

        const orderedItems = [...dynamicItems.reverse(), ...baseItems];

        // 获取十神分组
        const getShiShenGroup = (char: string): ShiShenGroup | null => {
            const shiShen = getShiShen(dayMaster, char);
            return shiShen ? SHISHEN_GROUP_MAP[shiShen] : null;
        };

        // 构建相邻关系（生、克、助）- 基于十神
        const buildHorizontalRelations = (items: LiuTongItem[], isGan: boolean): Record<string, RelationType> => {
            const adjacentMap: Record<string, RelationType> = {};

            for (let i = 0; i < items.length - 1; i++) {
                const key = `${i}-${i + 1}`;
                const char1 = isGan ? items[i].gan : items[i].zhi;
                const char2 = isGan ? items[i + 1].gan : items[i + 1].zhi;

                const group1 = getShiShenGroup(char1);
                const group2 = getShiShenGroup(char2);

                if (!group1 || !group2) continue;

                // 检查十神克关系
                if (SHISHEN_KE[group1] === group2) {
                    adjacentMap[key] = { type: 'ke', label: '克', direction: 'left' };
                    continue;
                }
                if (SHISHEN_KE[group2] === group1) {
                    adjacentMap[key] = { type: 'ke', label: '克', direction: 'right' };
                    continue;
                }

                // 检查十神生关系
                if (SHISHEN_SHENG[group1] === group2) {
                    adjacentMap[key] = { type: 'sheng', label: '生', direction: 'left' };
                    continue;
                }
                if (SHISHEN_SHENG[group2] === group1) {
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
        const buildVerticalRelations = (items: LiuTongItem[]): Record<number, RelationType> => {
            const relMap: Record<number, RelationType> = {};
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
            dayMaster,
        };
    }, [baziData, selectedDaYunIndex, selectedLiuNianYear, showDaYun, showLiuNian, currentYear]);
}

/**
 * 获取节点的十神分组
 */
export function getNodeShiShenGroup(
    items: LiuTongItem[],
    dayMaster: string,
    idx: number,
    nodeType: 'gan' | 'zhi'
): ShiShenGroup | null {
    const item = items[idx];
    const char = nodeType === 'gan' ? item.gan : item.zhi;
    const shiShen = getShiShen(dayMaster, char);
    return shiShen ? SHISHEN_GROUP_MAP[shiShen] : null;
}
