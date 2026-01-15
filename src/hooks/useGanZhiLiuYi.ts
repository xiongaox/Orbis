/**
 * useGanZhiLiuYi Hook
 * 计算干支留意数据（天干合化、地支刑冲等）
 * 从 App.tsx 提取的业务逻辑
 */
import { useMemo } from 'react';
import type { GanZhiLiuYiData } from '../components/Common/GanZhiLiuYiPanel';
import type { BaziApiResponse } from '../types/bazi';
import {
    calculateTianGanLiuYi,
    calculateDiZhiLiuYi,
} from '../lib/xuan-bazi/utils/baziGanZhiLiuYiUtil';
import { createDefaultGanZhiLiuYiSetting } from '../lib/xuan-bazi/settings/baziGanZhiLiuYiSetting';

interface UseGanZhiLiuYiParams {
    baziData: BaziApiResponse | null;
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
}

/**
 * 干支留意数据 Hook
 * 根据八字四柱和选中的大运/流年计算天干地支关系
 */
export function useGanZhiLiuYi({
    baziData,
    selectedDaYunIndex,
    selectedLiuNianYear,
}: UseGanZhiLiuYiParams): GanZhiLiuYiData | undefined {
    return useMemo<GanZhiLiuYiData | undefined>(() => {
        if (!baziData?.pillars || baziData.pillars.length < 4) {
            return undefined;
        }

        const pillars = baziData.pillars;
        const setting = createDefaultGanZhiLiuYiSetting();

        // 1. 提取四柱（静态）天干和地支
        const staticGans = pillars.map((p) => p.tiangan);
        const staticZhis = pillars.map((p) => p.dizhi);

        // 2. 提取大运/流年（动态）天干和地支
        const dynamicGans: string[] = [];
        const dynamicZhis: string[] = [];

        // 获取选中大运的干支
        if (selectedDaYunIndex !== null && baziData.daYun) {
            const selectedDaYun = baziData.daYun.find(d => d.index === selectedDaYunIndex);
            if (selectedDaYun && selectedDaYun.tiangan && selectedDaYun.dizhi) {
                dynamicGans.push(selectedDaYun.tiangan);
                dynamicZhis.push(selectedDaYun.dizhi);
            }
        }

        // 获取选中流年的干支
        if (selectedLiuNianYear !== null && baziData.liuNian) {
            const selectedLiuNian = baziData.liuNian.find(l => l.year === selectedLiuNianYear);
            if (selectedLiuNian && selectedLiuNian.tiangan && selectedLiuNian.dizhi) {
                dynamicGans.push(selectedLiuNian.tiangan);
                dynamicZhis.push(selectedLiuNian.dizhi);
            }
        }

        // 计算天干留意
        const tianGanResults = calculateTianGanLiuYi(setting, staticGans, dynamicGans);

        // 计算地支留意
        const diZhiResults = calculateDiZhiLiuYi(setting, staticZhis, dynamicZhis);

        return {
            tianGan: tianGanResults.length > 0 ? tianGanResults : undefined,
            diZhi: diZhiResults.length > 0 ? diZhiResults : undefined,
        };
    }, [baziData, selectedDaYunIndex, selectedLiuNianYear]);
}
