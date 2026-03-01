/**
 * ditiansuiUtil - 应用底层设施
 *
 * 模块定位：
 * - 所在层级：应用底层设施
 * - 主要目标：封装第三方库或核心底层能力
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `DiTianSuiEntry`, `DiTianSuiAnalysisSegment`, `DiTianSuiMonthlyEntry`, `getDiTianSuiEntry`, `getDiTianSuiMonthlyEntry`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `ditiansui.json`、内部模块 `ditiansui-monthly.json`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import ditiansuiData from '../../../data/book/ditiansui.json';
import ditiansuiMonthlyData from '../../../data/book/ditiansui-monthly.json';

export interface DiTianSuiEntry {
    poem: string;
    explanation: string[];
}

export interface DiTianSuiAnalysisSegment {
    segment: string;
    tags: string[];
    logic: {
        context: string;
        reasoning: string;
    };
    modern_meaning: string;
}

export interface DiTianSuiMonthlyEntry {
    meta: {
        stem: string;
        month: string;
        core_concept: string;
    };
    poem: string;
    key_sentence: string;
    analysis: DiTianSuiAnalysisSegment[];
    summary: {
        month_context: string;
        key_need: string;
        secondary_need: string;
        avoid: string;
    };
}

const stemMap: Record<string, string> = {
    '甲': 'jia',
    '乙': 'yi',
    '丙': 'bing',
    '丁': 'ding',
    '戊': 'wu',
    '己': 'ji',
    '庚': 'geng',
    '辛': 'xin',
    '壬': 'ren',
    '癸': 'gui',
};

const branchMap: Record<string, string> = {
    '子': 'zi',
    '丑': 'chou',
    '寅': 'yin',
    '卯': 'mao',
    '辰': 'chen',
    '巳': 'si',
    '午': 'wu',
    '未': 'wei',
    '申': 'shen',
    '酉': 'you',
    '戌': 'xu',
    '亥': 'hai',
};

/**
 * 获取基础的滴天髓天干论数据（诗诀 + 原注）
 */
export function getDiTianSuiEntry(dayMaster: string): DiTianSuiEntry | undefined {
    const key = stemMap[dayMaster];
    if (!key) return undefined;
    return (ditiansuiData as Record<string, DiTianSuiEntry>)[key];
}

/**
 * 获取带月令的滴天髓逻辑解析数据
 */
export function getDiTianSuiMonthlyEntry(dayMaster: string, monthBranch: string): DiTianSuiMonthlyEntry | undefined {
    const stemKey = stemMap[dayMaster];
    const branchKey = branchMap[monthBranch];
    if (!stemKey || !branchKey) return undefined;

    const stemData = (ditiansuiMonthlyData as Record<string, Record<string, DiTianSuiMonthlyEntry>>)[stemKey];
    if (!stemData) return undefined;

    return stemData[branchKey];
}
