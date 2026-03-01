/**
 * 奇门盘面凶象状态检测工具
 * 用于检测天盘干的入墓、击刑、刑+墓状态，以及八门的门迫状态
 */

import { MEN_WUXING, GONG_WUXING, WUXING_KE } from './constants';

// ==================== 天盘干入墓检测 ====================

/** 天干墓库宫位映射
 * 口诀：甲癸入坤，乙丙戊乾，丁己庚艮，辛壬在巽
 */
const GAN_MU_GONG: Record<string, number[]> = {
    '乙': [6],     // 乙木墓于乾6宫（戌）
    '丙': [6],     // 丙火墓于乾6宫（戌）
    '丁': [8],     // 丁火墓于艮8宫（丑）- 阴火墓丑
    '戊': [6],     // 戊土墓于乾6宫（戌）- 阳土墓戌
    '己': [8],     // 己土墓于艮8宫（丑）- 阴土墓丑
    '庚': [8],     // 庚金墓于艮8宫（丑）
    '辛': [4],     // 辛金墓于巽4宫（辰）- 阴金墓辰
    '壬': [4],     // 壬水墓于巽4宫（辰）
    '癸': [2],     // 癸水墓于坤2宫（未）- 阴水墓未
};

/** 六仪击刑映射：六仪 → 击刑宫位 */
const LIU_YI_JI_XING: Record<string, number> = {
    '戊': 3,  // 甲子戊落震3宫（子刑卯）
    '己': 2,  // 甲戌己落坤2宫（戌刑未）
    '庚': 8,  // 甲申庚落艮8宫（申刑寅）
    '辛': 9,  // 甲午辛落离9宫（午午自刑）
    '壬': 4,  // 甲辰壬落巽4宫（辰辰自刑）
    '癸': 4,  // 甲寅癸落巽4宫（寅刑巳）
};

/** 天盘干凶象状态类型 */
export type TianPanStatus = 'normal' | 'ruMu' | 'jiXing' | 'jiXingRuMu';

/**
 * 检测天盘干的凶象状态
 * 优先级：normal < ruMu < jiXing < jiXingRuMu
 * @param tianPan 天盘干
 * @param position 宫位编号(1-9)
 * @returns 状态和对应的颜色CSS变量
 */
export function getTianPanStatus(tianPan: string, position: number): {
    status: TianPanStatus;
    colorVar: string | null;
} {
    if (!tianPan || position === 5) {
        return { status: 'normal', colorVar: null };
    }

    const isRuMu = GAN_MU_GONG[tianPan]?.includes(position) ?? false;
    const isJiXing = LIU_YI_JI_XING[tianPan] === position;

    // 优先级：刑+墓 > 击刑 > 入墓 > 正常
    if (isJiXing && isRuMu) {
        return { status: 'jiXingRuMu', colorVar: 'var(--element-water)' };  // 水色
    }
    if (isJiXing) {
        return { status: 'jiXing', colorVar: 'var(--element-metal)' };      // 金色
    }
    if (isRuMu) {
        return { status: 'ruMu', colorVar: 'var(--element-earth)' };        // 土色
    }

    return { status: 'normal', colorVar: null };
}

// ==================== 八门门迫检测 ====================

/**
 * 检测八门的门迫状态
 * 门克宫 = 门迫
 * @param men 八门名称
 * @param position 宫位编号(1-9)
 * @returns 是否门迫及对应的颜色CSS变量
 */
export function getMenPoStatus(men: string, position: number): {
    isPo: boolean;
    colorVar: string | null;
} {
    if (!men || position === 5) {
        return { isPo: false, colorVar: null };
    }

    const menWuXing = MEN_WUXING[men];
    const gongWuXing = GONG_WUXING[position];

    if (!menWuXing || !gongWuXing) {
        return { isPo: false, colorVar: null };
    }

    // 门克宫 = 门迫
    const isPo = WUXING_KE[menWuXing] === gongWuXing;

    return {
        isPo,
        colorVar: isPo ? 'var(--element-fire)' : null,  // 火色
    };
}
