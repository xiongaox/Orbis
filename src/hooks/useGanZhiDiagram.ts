/**
 * useGanZhiDiagram - 应用源码层
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
 * - `DiagramItem`, `GanZhiDiagramData`, `useGanZhiDiagram`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `baziGanZhiLiuYiSetting`、内部模块 `diagramLayout`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useMemo } from 'react';
import { createDefaultGanZhiLiuYiSetting } from '../lib/xuan-bazi/settings/baziGanZhiLiuYiSetting';
import {
    calculateTianGanLiuYi,
    calculateDiZhiLiuYi
} from '../lib/xuan-bazi/utils/baziGanZhiLiuYiUtil';
import { assignTracks, type TrackAssignmentResult } from '../lib/xuan-bazi/utils/diagramLayout';

// 布局项类型
export interface DiagramItem {
    label: string;
    gan: string;
    zhi: string;
    originalIndex: number;
}

// Hook 返回类型
export interface GanZhiDiagramData {
    items: DiagramItem[];
    tianGanData: TrackAssignmentResult;
    diZhiData: TrackAssignmentResult;
}

interface UseGanZhiDiagramParams {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    baziData: any;
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    currentYear: number;
    showDaYun: boolean;
    showLiuNian: boolean;
}

/**
 * 干支图解数据 Hook
 */
export function useGanZhiDiagram({
    baziData,
    selectedDaYunIndex,
    selectedLiuNianYear,
    currentYear,
    showDaYun,
    showLiuNian,
}: UseGanZhiDiagramParams): GanZhiDiagramData | null {
    return useMemo(() => {
        if (!baziData) return null;

        const { pillars, daYun, liuNian } = baziData;

        // 1. 准备天干地支数据
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const staticGans = pillars.map((p: any) => p.tiangan);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const staticZhis = pillars.map((p: any) => p.dizhi);

        // 确定大运
        let activeDaYun = null;
        if (selectedDaYunIndex !== null && daYun && daYun[selectedDaYunIndex]) {
            activeDaYun = daYun[selectedDaYunIndex];
        } else if (daYun) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            activeDaYun = daYun.find((dy: any) => currentYear >= dy.startYear && currentYear <= dy.endYear);
            if (!activeDaYun && daYun.length > 1) {
                activeDaYun = daYun[1];
            } else if (!activeDaYun && daYun.length > 0) {
                activeDaYun = daYun[0];
            }
        }
        const currentDaYun = activeDaYun;

        // 确定流年
        let activeLiuNian = null;
        if (selectedLiuNianYear !== null && liuNian) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            activeLiuNian = liuNian.find((ln: any) => ln.year === selectedLiuNianYear);
        } else if (liuNian) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            activeLiuNian = liuNian.find((ln: any) => ln.year === currentYear);
        }
        const currentLiuNian = activeLiuNian;

        const dynamicGans: string[] = [];
        const dynamicZhis: string[] = [];

        if (showDaYun && currentDaYun?.ganZhi) {
            dynamicGans.push(currentDaYun.ganZhi[0]);
            dynamicZhis.push(currentDaYun.ganZhi[1]);
        }

        if (showLiuNian && currentLiuNian?.ganZhi) {
            dynamicGans.push(currentLiuNian.ganZhi[0]);
            dynamicZhis.push(currentLiuNian.ganZhi[1]);
        }

        // 2. 计算关系
        const setting = createDefaultGanZhiLiuYiSetting();
        // 开启天干关系 (0 = 开启, 1 = 关闭)
        setting.tianGanXiangHe = 0;      // 相合 - 开启
        setting.tianGanXiangChong = 0;   // 相冲 - 开启
        setting.tianGanXiangKe = 1;      // 相克 - 关闭
        setting.tianGanXiangSheng = 1;   // 相生 - 关闭

        // 开启地支关系 (0 = 开启)
        setting.diZhiLiuHe = 0;
        setting.diZhiBanHe = 0;
        setting.diZhiXiangChong = 0;
        setting.diZhiXiangXing = 0;
        setting.diZhiXiangPo = 0;
        setting.diZhiXiangHai = 0;
        setting.diZhiSanHe = 0;     // 三合 - 开启
        setting.diZhiSanHui = 0;    // 三会 - 开启
        setting.hideBanHeWhenFullSanHe = 0; // 完整三合时隐藏半合

        const tianGanRelations = calculateTianGanLiuYi(setting, staticGans, dynamicGans);
        const diZhiRelations = calculateDiZhiLiuYi(setting, staticZhis, dynamicZhis);

        // 3. 布局项
        const baseItems: DiagramItem[] = [
            { label: '年柱', gan: pillars[0].tiangan, zhi: pillars[0].dizhi, originalIndex: 0 },
            { label: '月柱', gan: pillars[1].tiangan, zhi: pillars[1].dizhi, originalIndex: 1 },
            { label: '日柱', gan: pillars[2].tiangan, zhi: pillars[2].dizhi, originalIndex: 2 },
            { label: '时柱', gan: pillars[3].tiangan, zhi: pillars[3].dizhi, originalIndex: 3 },
        ];

        const dynamicItems: DiagramItem[] = [];
        let dynamicOffset = 4;

        if (showDaYun && currentDaYun?.ganZhi) {
            dynamicItems.push({ label: '大运', gan: currentDaYun.ganZhi[0], zhi: currentDaYun.ganZhi[1], originalIndex: dynamicOffset++ });
        }

        if (showLiuNian && currentLiuNian?.ganZhi) {
            dynamicItems.push({ label: '流年', gan: currentLiuNian.ganZhi[0], zhi: currentLiuNian.ganZhi[1], originalIndex: dynamicOffset++ });
        }

        // 重新排序：流年、大运、年、月、日、时
        const orderedItems = [...dynamicItems.reverse(), ...baseItems];

        // 建立 originalIndex 到 newIndex 的映射
        const indexMap: Record<number, number> = {};
        orderedItems.forEach((item, idx) => {
            indexMap[item.originalIndex] = idx;
        });

        // 修正 relations 的 coordinates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapRelations = (relations: any[]) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return relations.map((r: any) => {
                const mappedPositions = r.positions.map((p: string) => indexMap[parseInt(p)]);
                return {
                    ...r,
                    positions: mappedPositions
                };
            }).filter((r: { positions: (number | undefined)[] }) => r.positions.every((p: number | undefined) => p !== undefined));
        };

        const mappedTianGan = mapRelations(tianGanRelations);
        const mappedDiZhi = mapRelations(diZhiRelations);

        // 分配轨道
        const tianGanTracks = assignTracks(mappedTianGan);
        const diZhiTracks = assignTracks(mappedDiZhi);

        return {
            items: orderedItems,
            tianGanData: tianGanTracks,
            diZhiData: diZhiTracks
        };
    }, [baziData, selectedDaYunIndex, selectedLiuNianYear, showDaYun, showLiuNian, currentYear]);
}
