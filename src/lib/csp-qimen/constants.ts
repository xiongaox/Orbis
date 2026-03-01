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
