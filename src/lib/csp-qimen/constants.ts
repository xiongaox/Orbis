/**
 * constants - 应用底层设施
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
 * - `GONG_NAMES`, `DI_PAN_GAN_SHUN`, `AN_GAN_ORDER`, `INNER_YANG`, `OUTER_YANG`, `CHINESE_NUMS`, `SAN_QI`, `SAN_JI_MEN`, `GONG_WUXING`, `XING_WUXING`, `MEN_WUXING`, `WUXING_KE`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

export const GONG_NAMES: string[] = ['', '坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'];

export const DI_PAN_GAN_SHUN: string[] = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

export const AN_GAN_ORDER: string[] = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

export const INNER_YANG: number[] = [1, 8, 3, 4];

export const OUTER_YANG: number[] = [9, 2, 7, 6];

export const CHINESE_NUMS: string[] = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export const SAN_QI: string[] = ['乙', '丙', '丁'];

export const SAN_JI_MEN: string[] = ['开门', '休门', '生门'];

export const GONG_WUXING: Record<number, string> = {
    1: '水',
    2: '土',
    3: '木',
    4: '木',
    5: '土',
    6: '金',
    7: '金',
    8: '土',
    9: '火',
};

export const XING_WUXING: Record<string, string> = {
    '天蓬': '水',
    '天芮': '土',
    '天冲': '木',
    '天辅': '木',
    '天禽': '土',
    '天心': '金',
    '天柱': '金',
    '天任': '土',
    '天英': '火',
};

export const MEN_WUXING: Record<string, string> = {
    '休': '水', '休门': '水',
    '生': '土', '生门': '土',
    '伤': '木', '伤门': '木',
    '杜': '木', '杜门': '木',
    '景': '火', '景门': '火',
    '死': '土', '死门': '土',
    '惊': '金', '惊门': '金',
    '开': '金', '开门': '金',
};

export const WUXING_KE: Record<string, string> = {
    '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
};
