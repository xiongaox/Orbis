/**
 * 奇门遁甲 - 旺衰与十二长生计算工具
 * 基于《奇门遁甲预测》PDF 提取的规则
 */

import { SHI_ER_ZHANG_SHENG } from '../xuan-bazi/maps/baziJichuMap';

// ============ 常量定义 ============

/** 
 * 宫位对应地支（洛书数 -> 地支）
 * 四维宫（乾坤艮巽）各占两个地支，需返回两个十二长生状态
 */
export const GONG_TO_ZHI: Record<number, string[]> = {
    1: ['子'],           // 坎宫
    2: ['未', '申'],     // 坤宫（本位未，申为第二地支）
    3: ['卯'],           // 震宫
    4: ['辰', '巳'],     // 巽宫（本位辰，巳为第二地支）
    5: ['未'],           // 中宫（寄坤）
    6: ['戌', '亥'],     // 乾宫（本位戌，亥为第二地支）
    7: ['酉'],           // 兑宫
    8: ['丑', '寅'],     // 艮宫（本位丑，寅为第二地支）
    9: ['午'],           // 离宫
};

/** 宫位对应五行（洛书数 -> 五行） */
export const GONG_WUXING: Record<number, string> = {
    1: '水',  // 坎宫
    2: '土',  // 坤宫
    3: '木',  // 震宫
    4: '木',  // 巽宫
    5: '土',  // 中宫
    6: '金',  // 乾宫
    7: '金',  // 兑宫
    8: '土',  // 艮宫
    9: '火',  // 离宫
};

/** 九星五行属性 */
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

/** 八门五行属性 */
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

/** 地支对应五行 */
const ZHI_WUXING: Record<string, string> = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木',
    '辰': '土', '巳': '火', '午': '火', '未': '土',
    '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

/** 地支对应季节类型（用于判断四季月） */
const ZHI_TO_SEASON: Record<string, string> = {
    '寅': '春', '卯': '春',
    '巳': '夏', '午': '夏',
    '申': '秋', '酉': '秋',
    '亥': '冬', '子': '冬',
    '辰': '四季', '戌': '四季', '丑': '四季', '未': '四季',
};

/** 五行相生关系：我生谁 */
const WUXING_SHENG: Record<string, string> = {
    '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

/** 五行相克关系：我克谁 */
const WUXING_KE: Record<string, string> = {
    '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
};

/** 五行被克关系：谁克我 */
const WUXING_BEIKE: Record<string, string> = {
    '木': '金', '火': '水', '土': '木', '金': '火', '水': '土',
};

/** 五行被生关系：谁生我 */
const WUXING_BEISHENG: Record<string, string> = {
    '木': '水', '火': '木', '土': '火', '金': '土', '水': '金',
};

/** 十二长生单字缩写 */
const SHIER_CS_ABBR: Record<string, string> = {
    '长生': '生',
    '沐浴': '沐',
    '冠带': '冠',
    '临官': '临',
    '帝旺': '旺',
    '衰': '衰',
    '病': '病',
    '死': '死',
    '墓': '墓',
    '绝': '绝',
    '胎': '胎',
    '养': '养',
};

// ============ 落宫旺衰（基于宫位五行） ============

/**
 * 计算五行与另一五行的关系状态
 * 旺相休囚废规则（自我视角）：
 * - 旺：对方生我
 * - 相：对方与我同行
 * - 休：我生对方
 * - 囚：对方克我
 * - 废：我克对方
 */
function getWuxingRelation(myWuxing: string, targetWuxing: string): string {
    if (!myWuxing || !targetWuxing) return '';

    // 同行 => 相
    if (myWuxing === targetWuxing) {
        return '相';
    }

    // 对方生我 => 旺
    if (WUXING_BEISHENG[myWuxing] === targetWuxing) {
        return '旺';
    }

    // 我生对方 => 休
    if (WUXING_SHENG[myWuxing] === targetWuxing) {
        return '休';
    }

    // 对方克我 => 囚
    if (WUXING_BEIKE[myWuxing] === targetWuxing) {
        return '囚';
    }

    // 我克对方 => 废
    if (WUXING_KE[myWuxing] === targetWuxing) {
        return '废';
    }

    return '';
}

// ============ 八门旺衰（旺相休囚死） ============

/**
 * 季节五行旺相休囚死规则
 */
const SEASON_WANGSHUAI: Record<string, Record<string, string>> = {
    '春': { '木': '旺', '火': '相', '水': '休', '金': '囚', '土': '死' },
    '夏': { '火': '旺', '土': '相', '木': '休', '水': '囚', '金': '死' },
    '秋': { '金': '旺', '水': '相', '土': '休', '火': '囚', '木': '死' },
    '冬': { '水': '旺', '木': '相', '金': '休', '土': '囚', '火': '死' },
    '四季': { '土': '旺', '金': '相', '火': '休', '木': '囚', '水': '死' },
};

/**
 * 获取八门月令旺衰（旺相休囚死）
 */
export function getMenWangYueLing(men: string, monthZhi: string): string {
    const menWuxing = MEN_WUXING[men];
    if (!menWuxing) return '';

    const season = ZHI_TO_SEASON[monthZhi];
    if (!season) return '';

    return SEASON_WANGSHUAI[season]?.[menWuxing] || '';
}

/**
 * 获取八门落宫旺衰（旺相休囚死）
 * PDF 规则：同我者为旺、我生者为相、生我者为休、克我者为囚、我克者为死
 */
function getMenLuoGong(menWuxing: string, gongWuxing: string): string {
    if (!menWuxing || !gongWuxing) return '';

    // 同我者 => 旺
    if (menWuxing === gongWuxing) {
        return '旺';
    }

    // 我生者（食伤）=> 相
    if (WUXING_SHENG[menWuxing] === gongWuxing) {
        return '相';
    }

    // 生我者（印）=> 休
    if (WUXING_BEISHENG[menWuxing] === gongWuxing) {
        return '休';
    }

    // 克我者（官鬼）=> 囚
    if (WUXING_BEIKE[menWuxing] === gongWuxing) {
        return '囚';
    }

    // 我克者（财）=> 死
    if (WUXING_KE[menWuxing] === gongWuxing) {
        return '死';
    }

    return '';
}

/**
 * 获取八门完整旺衰：落宫丨月令
 * @param men 八门名称
 * @param gongPosition 所落宫位
 * @param monthZhi 月支
 * @returns 格式如 "旺丨月囚"
 */
export function getMenWang(men: string, gongPosition: number, monthZhi: string): string {
    const menWuxing = MEN_WUXING[men];
    if (!menWuxing) return '';

    const gongWuxing = GONG_WUXING[gongPosition];
    const luoGong = getMenLuoGong(menWuxing, gongWuxing);
    const yueLing = getMenWangYueLing(men, monthZhi);

    if (luoGong && yueLing) {
        return `${luoGong}丨月${yueLing}`;
    }
    return luoGong || (yueLing ? `月${yueLing}` : '');
}

// ============ 九星旺衰（旺相休囚废） ============

/**
 * 获取九星月令旺衰（旺相休囚废）
 * 《烟波钓叟歌》：与我同行即为相，我生之月诚为旺，废于父母休于财，囚于鬼兮真不旺
 * 
 * 正确理解：
 * - 相：月令与我同行（比劫）
 * - 旺：我生月令（食伤）
 * - 休：我克月令（财）
 * - 废：月令生我（印）
 * - 囚：月令克我（官鬼）
 */
export function getXingWangYueLing(xing: string, monthZhi: string): string {
    const xingWuxing = XING_WUXING[xing];
    if (!xingWuxing) return '';

    const monthWuxing = ZHI_WUXING[monthZhi];
    if (!monthWuxing) return '';

    // 月令与我同行（比劫）=> 相
    if (monthWuxing === xingWuxing) {
        return '相';
    }

    // 我生月令（食伤）=> 旺
    if (WUXING_SHENG[xingWuxing] === monthWuxing) {
        return '旺';
    }

    // 我克月令（财）=> 休
    if (WUXING_KE[xingWuxing] === monthWuxing) {
        return '休';
    }

    // 月令生我（印）=> 废
    if (WUXING_BEISHENG[xingWuxing] === monthWuxing) {
        return '废';
    }

    // 月令克我（官鬼）=> 囚
    if (WUXING_BEIKE[xingWuxing] === monthWuxing) {
        return '囚';
    }

    return '';
}

/**
 * 获取九星完整旺衰：落宫丨月令
 * @param xing 九星名称
 * @param gongPosition 所落宫位
 * @param monthZhi 月支
 * @returns 格式如 "相丨月休"
 */
export function getXingWang(xing: string, gongPosition: number, monthZhi: string): string {
    const xingWuxing = XING_WUXING[xing];
    if (!xingWuxing) return '';

    const gongWuxing = GONG_WUXING[gongPosition];
    const luoGong = getWuxingRelation(xingWuxing, gongWuxing);
    const yueLing = getXingWangYueLing(xing, monthZhi);

    if (luoGong && yueLing) {
        return `${luoGong}丨月${yueLing}`;
    }
    return luoGong || (yueLing ? `月${yueLing}` : '');
}

// ============ 十二长生 ============

/**
 * 获取天干在指定宫位的十二长生状态（缩写形式）
 * 四维宫（乾坤艮巽）返回两个状态，如 "冠沐"
 * 四正宫返回单个状态，如 "旺"
 * 
 * @param gan 天干
 * @param gongPosition 宫位（洛书数 1-9）
 * @returns 十二长生缩写（单字或双字）
 */
export function getGanShiErCS(gan: string, gongPosition: number): string {
    if (!gan || gongPosition < 1 || gongPosition > 9) return '';

    const zhiList = GONG_TO_ZHI[gongPosition];
    if (!zhiList || zhiList.length === 0) return '';

    const results: string[] = [];

    for (const zhi of zhiList) {
        const key = gan + zhi;
        const fullName = SHI_ER_ZHANG_SHENG[key];
        if (fullName) {
            const abbr = SHIER_CS_ABBR[fullName] || fullName.charAt(0);
            results.push(abbr);
        }
    }

    return results.join('');
}
