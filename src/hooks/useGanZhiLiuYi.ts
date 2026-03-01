/**
 * useGanZhiLiuYi - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：提供复用状态和副作用逻辑的自定义 Hook
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `useGanZhiLiuYi`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `GanZhiLiuYiPanel`、内部模块 `bazi` 等 4 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useMemo } from 'react';
import type { GanZhiLiuYiData } from '../components/Modules/Bazi/GanZhiLiuYiPanel';
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
