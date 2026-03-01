/**
 * useDayunLiunian - 应用源码层
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
 * - `DaYunItem`, `LiuNianItem`, `LiuYueItem`, `XiaoYunItem`, `DayunLiunianData`, `useDayunLiunian`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `bazi`、内部模块 `calendar`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useMemo } from 'react';
import type { BaziApiResponse } from '../types/bazi';
import { JIEQI_LABELS } from '../constants/calendar';

export { JIEQI_LABELS };

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

const EMPTY_DAYUN: BaziApiResponse['daYun'] = [];
const EMPTY_LIUNIAN: BaziApiResponse['liuNian'] = [];
const EMPTY_XIAOYUN: BaziApiResponse['currentXiaoYun'] = [];
const EMPTY_PILLARS: BaziApiResponse['pillars'] = [];

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
    const daYun = (data?.daYun ?? EMPTY_DAYUN) as DaYunItem[];
    const liuNian = (data?.liuNian ?? EMPTY_LIUNIAN) as LiuNianItem[];
    const currentXiaoYun = (data?.currentXiaoYun ?? EMPTY_XIAOYUN) as XiaoYunItem[];
    const pillars = data?.pillars ?? EMPTY_PILLARS;
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
