/**
 * 十神分组映射配置
 * 用于干支流通图解中的生克关系判断
 */

// 十神分组类型
export type ShiShenGroup = '比劫' | '食伤' | '财星' | '官杀' | '印枭';

// 十神 -> 分组映射
export const SHISHEN_GROUP_MAP: Record<string, ShiShenGroup> = {
    '比肩': '比劫', '劫财': '比劫',
    '食神': '食伤', '伤官': '食伤',
    '正财': '财星', '偏财': '财星',
    '正官': '官杀', '七杀': '官杀',
    '正印': '印枭', '偏印': '印枭',
};

// 十神生链：A 生 B (印枭→比劫→食伤→财星→官杀→印枭)
export const SHISHEN_SHENG: Record<ShiShenGroup, ShiShenGroup> = {
    '印枭': '比劫',
    '比劫': '食伤',
    '食伤': '财星',
    '财星': '官杀',
    '官杀': '印枭',
};

// 十神克链：A 克 B (印枭⊗食伤⊗官杀⊗比劫⊗财星⊗印枭)
export const SHISHEN_KE: Record<ShiShenGroup, ShiShenGroup> = {
    '印枭': '食伤',
    '食伤': '官杀',
    '官杀': '比劫',
    '比劫': '财星',
    '财星': '印枭',
};

// 天干合的组合
export const TIANGAN_HE: Record<string, string> = {
    '甲己': '土', '己甲': '土',
    '乙庚': '金', '庚乙': '金',
    '丙辛': '水', '辛丙': '水',
    '丁壬': '木', '壬丁': '木',
    '戊癸': '火', '癸戊': '火',
};

// 颜色配置
export const LIUTONG_COLORS = {
    FLOW: '#63A103',   // 绿色 (流通: 合、生、助)
    BLOCK: '#ef4444',  // 红色 (阻塞: 克)
};
