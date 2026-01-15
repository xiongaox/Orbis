/**
 * useDayunLiunian Hook
 * 计算大运、流年、小运、流月的显示数据
 * 从 DayunLiunianPanel.tsx 提取的核心业务逻辑
 */
import { useMemo } from 'react';
import type { BaziApiResponse } from '../types/bazi';

// 大运项类型
export interface DaYunItem {
    index: number;
    startYear: number;
    endYear: number;
    startAge: number;
    tiangan: string;
    dizhi: string;
    ganZhi?: string;
}

// 流年项类型
export interface LiuNianItem {
    year: number;
    dayunIndex: number;
    tiangan: string;
    dizhi: string;
    ganZhi?: string;
    liuYue?: LiuYueItem[];
}

// 流月项类型
export interface LiuYueItem {
    index: number;
    month: number;
    tiangan: string;
    dizhi: string;
}

// 小运项类型
export interface XiaoYunItem {
    dayunIndex: number;
    ganZhi: string;
}

// Hook 参数类型
interface UseDayunLiunianParams {
    data: BaziApiResponse | null;
    currentYear: number;
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    daYunPage: number;
}

// Hook 返回类型
export interface DayunLiunianData {
    displayDaYun: DaYunItem[];
    displayLiuNian: LiuNianItem[];
    displayXiaoYun: XiaoYunItem[];
    displayLiuYue: LiuYueItem[];
    totalDaYunPages: number;
    autoDaYunIndex: number;
    activeDaYunIndex: number;
    activeDaYunObject: DaYunItem | undefined;
    dayMaster: string;
}

/**
 * 大运流年数据 Hook
 */
export function useDayunLiunian({
    data,
    currentYear,
    selectedDaYunIndex,
    selectedLiuNianYear,
    daYunPage,
}: UseDayunLiunianParams): DayunLiunianData {
    // 提取基础数据
    const daYun = (data?.daYun ?? []) as DaYunItem[];
    const liuNian = (data?.liuNian ?? []) as LiuNianItem[];
    const currentXiaoYun = (data?.currentXiaoYun ?? []) as XiaoYunItem[];
    const pillars = data?.pillars ?? [];
    const dayMaster = pillars[2]?.tiangan || '丙';

    // 分页显示大运
    const displayDaYun = useMemo(() => {
        const startIdx = daYunPage * 10;
        return daYun.slice(startIdx, startIdx + 10);
    }, [daYun, daYunPage]);

    // 计算总页数
    const totalDaYunPages = useMemo(() => {
        return Math.ceil(daYun.length / 10);
    }, [daYun]);

    // 根据当前时间自动确定当前大运
    const autoDaYunIndex = useMemo(() => {
        const found = daYun.find(dy => currentYear >= dy.startYear && currentYear <= dy.endYear);
        return found?.index ?? 1;
    }, [daYun, currentYear]);

    // 当前激活的大运索引
    const activeDaYunIndex = selectedDaYunIndex ?? autoDaYunIndex;

    // 获取激活大运对应的流年
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

    // 获取激活大运对应的小运
    const displayXiaoYun = useMemo(() => {
        const result = currentXiaoYun.filter(xy => xy.dayunIndex === activeDaYunIndex);
        if (result.length === 0) {
            return currentXiaoYun.filter(xy => xy.dayunIndex === 1).slice(0, 10);
        }
        return result.slice(0, 10);
    }, [currentXiaoYun, activeDaYunIndex]);

    // 流月数据
    const displayLiuYue = useMemo(() => {
        if (selectedLiuNianYear) {
            const selectedYear = displayLiuNian.find(ln => ln.year === selectedLiuNianYear);
            if (selectedYear?.liuYue && selectedYear.liuYue.length > 0) {
                return selectedYear.liuYue.slice(0, 12);
            }
        }
        const currentYearData = displayLiuNian.find(ln => ln.year === currentYear);
        if (currentYearData?.liuYue && currentYearData.liuYue.length > 0) {
            return currentYearData.liuYue.slice(0, 12);
        }
        if (displayLiuNian.length > 0 && displayLiuNian[0].liuYue) {
            return displayLiuNian[0].liuYue.slice(0, 12);
        }
        return [];
    }, [displayLiuNian, selectedLiuNianYear, currentYear]);

    return {
        displayDaYun,
        displayLiuNian,
        displayXiaoYun,
        displayLiuYue,
        totalDaYunPages,
        autoDaYunIndex,
        activeDaYunIndex,
        activeDaYunObject,
        dayMaster,
    };
}

// 节气月份标签（用于流月显示）
export const JIEQI_LABELS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
