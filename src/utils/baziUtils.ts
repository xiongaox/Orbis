import { Solar } from 'lunar-typescript';
import type { Case } from '../types';

// Constants
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// Hidden Stems Mapping (Standard Zang Gan)
const HIDDEN_STEMS: Record<string, string[]> = {
    '子': ['癸'],
    '丑': ['己', '癸', '辛'],
    '寅': ['甲', '丙', '戊'],
    '卯': ['乙'],
    '辰': ['戊', '乙', '癸'],
    '巳': ['丙', '戊', '庚'],
    '午': ['丁', '己'],
    '未': ['己', '丁', '乙'],
    '申': ['庚', '壬', '戊'],
    '酉': ['辛'],
    '戌': ['戊', '辛', '丁'],
    '亥': ['壬', '甲']
};

// Five Elements of Stems (0: Wood, 1: Fire, 2: Earth, 3: Metal, 4: Water)
// Gan Index: 甲0, 乙1, 丙2, 丁3, 戊4, 己5, 庚6, 辛7, 壬8, 癸9
// Element:   Wood, Wood, Fire, Fire, Earth, Earth, Metal, Metal, Water, Water
const GAN_ELEMENTS = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];

// Shi Shen Names
const SHI_SHEN_MAP: Record<number, { same: string, diff: string }> = {
    0: { same: '比肩', diff: '劫财' },
    1: { same: '食神', diff: '伤官' },
    2: { same: '偏财', diff: '正财' },
    3: { same: '七杀', diff: '正官' },
    4: { same: '偏印', diff: '正印' }
};

// Short Shi Shen Map for Hidden Stems
const SHI_SHEN_SHORT: Record<string, string> = {
    '比肩': '比', '劫财': '劫',
    '食神': '食', '伤官': '伤',
    '偏财': '才', '正财': '财',
    '七杀': '杀', '正官': '官',
    '偏印': '枭', '正印': '印'
};

const getShiShen = (dayGan: string, targetGan: string): string => {
    if (!dayGan || !targetGan) return '';
    const dIdx = TIAN_GAN.indexOf(dayGan);
    const tIdx = TIAN_GAN.indexOf(targetGan);
    if (dIdx === -1 || tIdx === -1) return '';

    const dElem = GAN_ELEMENTS[dIdx];
    const tElem = GAN_ELEMENTS[tIdx];

    // Relation Index: (Target - Day + 5) % 5
    let rel = (tElem - dElem + 5) % 5;

    // Polarity: Same (0) or Diff (1)
    const isSamePolarity = (dIdx % 2) === (tIdx % 2);

    return isSamePolarity ? SHI_SHEN_MAP[rel].same : SHI_SHEN_MAP[rel].diff;
};

// 12 Life Stages (Shi Er Zhang Sheng) 
const ZHANG_SHENG_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];

const ZHANG_SHENG_START_ZHI: Record<string, number> = {
    '甲': 11, '乙': 6, '丙': 2, '丁': 9, '戊': 2,
    '己': 9, '庚': 5, '辛': 0, '壬': 8, '癸': 3
};

const getZhangSheng = (gan: string, zhi: string): string => {
    if (!gan || !zhi) return '';
    const gIdx = TIAN_GAN.indexOf(gan);
    const zIdx = DI_ZHI.indexOf(zhi);
    if (gIdx === -1 || zIdx === -1) return '';

    const startZhi = ZHANG_SHENG_START_ZHI[gan];
    const isYang = gIdx % 2 === 0;

    let offset;
    if (isYang) {
        offset = (zIdx - startZhi + 12) % 12;
    } else {
        offset = (startZhi - zIdx + 12) % 12;
    }

    return ZHANG_SHENG_NAMES[offset];
};



// --- Shen Sha (Symbolic Stars) Lookup Tables ---

const TIAN_YI_MAP: Record<string, string[]> = {
    '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
    '乙': ['子', '申'], '己': ['子', '申'],
    '丙': ['亥', '酉'], '丁': ['亥', '酉'],
    '壬': ['巳', '卯'], '癸': ['巳', '卯'],
    '辛': ['午', '寅']
};

const TAI_JI_MAP: Record<string, string[]> = {
    '甲': ['子', '午'], '乙': ['子', '午'],
    '丙': ['酉', '卯'], '丁': ['酉', '卯'],
    '戊': ['辰', '戌', '丑', '未'], '己': ['辰', '戌', '丑', '未'],
    '庚': ['寅', '亥'], '辛': ['寅', '亥'],
    '壬': ['巳', '申'], '癸': ['巳', '申']
};

const YI_MA_MAP: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '寅': '申', '午': '申', '戌': '申',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳'
};

const TAO_HUA_MAP: Record<string, string> = {
    '申': '酉', '子': '酉', '辰': '酉',
    '寅': '卯', '午': '卯', '戌': '卯',
    '巳': '午', '酉': '午', '丑': '午',
    '亥': '子', '卯': '子', '未': '子'
};

const WEN_CHANG_MAP: Record<string, string> = {
    '甲': '巳', '乙': '午',
    '丙': '申', '戊': '申',
    '丁': '酉', '己': '酉',
    '庚': '亥', '辛': '子',
    '壬': '寅', '癸': '卯'
};

const getShenSha = (dayGan: string, dayZhi: string, yearZhi: string, zhiSet: Set<string>): string[] => {
    const stars: Set<string> = new Set();

    // Helper to check if any target zhi exists in chart
    const hasZhi = (targets: string | string[]) => {
        const arr = Array.isArray(targets) ? targets : [targets];
        return arr.some(z => zhiSet.has(z));
    };

    if (hasZhi(TIAN_YI_MAP[dayGan] || [])) stars.add('天乙贵人');
    if (hasZhi(TAI_JI_MAP[dayGan] || [])) stars.add('太极贵人');
    if (hasZhi(WEN_CHANG_MAP[dayGan] || [])) stars.add('文昌贵人');
    if (hasZhi(YI_MA_MAP[dayZhi] || '') || hasZhi(YI_MA_MAP[yearZhi] || '')) stars.add('驿马');
    if (hasZhi(TAO_HUA_MAP[dayZhi] || '') || hasZhi(TAO_HUA_MAP[yearZhi] || '')) stars.add('桃花');

    return Array.from(stars);
};

export const calculateBazi = (birthDateIso: string, _gender: 'male' | 'female'): Partial<Case> => {
    const date = new Date(birthDateIso);
    const solar = Solar.fromYmdHms(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
    );
    const lunar = solar.getLunar();
    const baZi = lunar.getEightChar();

    // Pillars (Strings)
    const yearPillar = baZi.getYear();
    const monthPillar = baZi.getMonth();
    const dayPillar = baZi.getDay();
    const hourPillar = baZi.getTime();

    // Extract Stems and Branches
    const yearGan = baZi.getYearGan();
    const monthGan = baZi.getMonthGan();
    const dayGan = baZi.getDayGan();
    const hourGan = baZi.getTimeGan();

    const yearZhi = baZi.getYearZhi();
    const monthZhi = baZi.getMonthZhi();
    const dayZhi = baZi.getDayZhi();
    const hourZhi = baZi.getTimeZhi();

    // 1. Calculate Main Stars (Shi Shen)
    const mainStars = [
        getShiShen(dayGan, yearGan),
        getShiShen(dayGan, monthGan),
        '日主',
        getShiShen(dayGan, hourGan)
    ];

    // 2. Hidden Stems (Cang Gan)
    const getHiddenStruct = (zhi: string) => {
        const stems = HIDDEN_STEMS[zhi] || [];
        return stems.map(stem => {
            const godFull = getShiShen(dayGan, stem);
            return {
                stem,
                god: SHI_SHEN_SHORT[godFull] || ''
            };
        });
    };

    const hiddenStems = [
        getHiddenStruct(yearZhi),
        getHiddenStruct(monthZhi),
        getHiddenStruct(dayZhi),
        getHiddenStruct(hourZhi)
    ];

    // 3. Star Luck (Shi Er Zhang Sheng) - Day Gan vs Branches
    const starLucks = [
        getZhangSheng(dayGan, yearZhi),
        getZhangSheng(dayGan, monthZhi),
        getZhangSheng(dayGan, dayZhi),
        getZhangSheng(dayGan, hourZhi)
    ];

    // 4. Self Sitting (Zi Zuo) - Stem vs its own Branch
    const selfSitting = [
        getZhangSheng(yearGan, yearZhi),
        getZhangSheng(monthGan, monthZhi),
        getZhangSheng(dayGan, dayZhi),
        getZhangSheng(hourGan, hourZhi)
    ];

    // 5. Na Yin (Melodic Element) - Using Library
    const naYins = [
        baZi.getYearNaYin(),
        baZi.getMonthNaYin(),
        baZi.getDayNaYin(),
        baZi.getTimeNaYin()
    ];

    // 6. Void (Kong Wang) - Using Library
    const kongWangs = [
        baZi.getYearXunKong(),
        baZi.getMonthXunKong(),
        baZi.getDayXunKong(),
        baZi.getTimeXunKong()
    ];

    // 7. Calculate Shen Sha (Symbolic Stars)
    // Gather all Earthly Branches in the chart
    const zhiSet = new Set([yearZhi, monthZhi, dayZhi, hourZhi]);
    const shenShaList = getShenSha(dayGan, dayZhi, yearZhi, zhiSet);

    return {
        solar_date: `${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日 ${solar.getHour()}:${solar.getMinute()}`,
        lunar_date: `${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`,
        year_pillar: yearPillar,
        month_pillar: monthPillar,
        day_pillar: dayPillar,
        hour_pillar: hourPillar,
        zodiac: lunar.getYearShengXiao(),

        main_stars: mainStars,
        hidden_stems: hiddenStems,
        star_lucks: starLucks,
        self_sitting: selfSitting,
        na_yin: naYins,
        kong_wang: kongWangs,
        shen_sha: shenShaList
    };
};
