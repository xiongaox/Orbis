/**
 * 八字核心类
 * 移植自 Java 版本 xuan-utils-pro
 * @author 善待 (原作者)
 * 
 * 注意：此版本为简化版，完整功能需要配合 lunar-typescript 库使用
 */

import {
    getTianGanWuXing,
    getDiZhiWuXing,
    getTianGanYinYang,
    getDiZhiCangGan,
    getNaYin,
    getNaYinWuXing,
    getKongWang,
    getShiShen,
    getShiShenAbbr,
    getShiErZhangSheng,
    getShengXiao,
    parseGanZhi,
    getNextGanZhi,
    SHI_SHEN_ABBR,
} from './utils';
import {
    TIAN_GAN,
    DI_ZHI,
    DI_ZHI_CHONG,
    DI_ZHI_SHENG_XIAO,
} from './maps';

/** 八字四柱信息 */
export interface SiZhu {
    ganZhi: string;
    gan: string;
    zhi: string;
    ganWuXing: string;
    zhiWuXing: string;
    ganYinYang: string;
    cangGan: string[];
    naYin: string;
    kongWang: string;
    shiShen: string;
    shiShenAbbr: string;
    shiErZhangSheng: string;
}

/** 八字完整信息 */
export interface BaziInfo {
    // 基本信息
    name: string;
    sex: string;
    solarDate: string;

    // 四柱
    year: SiZhu;
    month: SiZhu;
    day: SiZhu;
    hour: SiZhu;

    // 日主信息
    dayMaster: string;
    dayMasterWuXing: string;
    dayMasterYinYang: string;

    // 生肖
    shengXiao: string;

    // 五行统计
    wuXingCount: Record<string, number>;
}

/**
 * 创建四柱信息
 */
function createSiZhu(ganZhi: string, dayGan: string): SiZhu {
    const parsed = parseGanZhi(ganZhi);
    if (!parsed) {
        return {
            ganZhi: '',
            gan: '',
            zhi: '',
            ganWuXing: '',
            zhiWuXing: '',
            ganYinYang: '',
            cangGan: [],
            naYin: '',
            kongWang: '',
            shiShen: '',
            shiShenAbbr: '',
            shiErZhangSheng: '',
        };
    }

    const { gan, zhi } = parsed;
    const shiShen = getShiShen(dayGan, gan);

    return {
        ganZhi,
        gan,
        zhi,
        ganWuXing: getTianGanWuXing(gan),
        zhiWuXing: getDiZhiWuXing(zhi),
        ganYinYang: getTianGanYinYang(gan),
        cangGan: getDiZhiCangGan(zhi),
        naYin: getNaYin(ganZhi),
        kongWang: getKongWang(ganZhi),
        shiShen,
        shiShenAbbr: getShiShenAbbr(shiShen),
        shiErZhangSheng: getShiErZhangSheng(dayGan, zhi),
    };
}

/**
 * 统计五行数量
 */
function countWuXing(year: SiZhu, month: SiZhu, day: SiZhu, hour: SiZhu): Record<string, number> {
    const count: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };

    const pillars = [year, month, day, hour];
    for (const pillar of pillars) {
        if (pillar.ganWuXing) count[pillar.ganWuXing]++;
        if (pillar.zhiWuXing) count[pillar.zhiWuXing]++;
    }

    return count;
}

/**
 * 从四柱干支创建八字信息（静态工具方法）
 * 
 * @param siZhuGanZhi 四柱干支，格式：{ year: '甲子', month: '乙丑', day: '丙寅', hour: '丁卯' }
 * @param options 可选配置
 */
export function createBaziFromSiZhu(
    siZhuGanZhi: {
        year: string;
        month: string;
        day: string;
        hour: string;
    },
    options?: {
        name?: string;
        sex?: 0 | 1;
        solarDate?: string;
    }
): BaziInfo {
    const dayParsed = parseGanZhi(siZhuGanZhi.day);
    const dayGan = dayParsed?.gan || '';
    const yearParsed = parseGanZhi(siZhuGanZhi.year);

    const year = createSiZhu(siZhuGanZhi.year, dayGan);
    const month = createSiZhu(siZhuGanZhi.month, dayGan);
    const day = createSiZhu(siZhuGanZhi.day, dayGan);
    const hour = createSiZhu(siZhuGanZhi.hour, dayGan);

    return {
        name: options?.name || '',
        sex: options?.sex === 0 ? '女' : '男',
        solarDate: options?.solarDate || '',
        year,
        month,
        day,
        hour,
        dayMaster: dayGan,
        dayMasterWuXing: getTianGanWuXing(dayGan),
        dayMasterYinYang: getTianGanYinYang(dayGan),
        shengXiao: yearParsed ? getShengXiao(yearParsed.zhi) : '',
        wuXingCount: countWuXing(year, month, day, hour),
    };
}

/**
 * 计算大运
 * 
 * @param dayGan 日干
 * @param monthGanZhi 月干支
 * @param sex 性别 (0: 女, 1: 男)
 * @param yearGan 年干
 * @param count 大运数量（默认10轮）
 */
export function calculateDaYun(
    dayGan: string,
    monthGanZhi: string,
    sex: 0 | 1,
    yearGan: string,
    count: number = 10
): Array<{
    index: number;
    ganZhi: string;
    gan: string;
    zhi: string;
    shiShen: string;
    shiShenAbbr: string;
    shiErZhangSheng: string;
}> {
    const daYunList: Array<{
        index: number;
        ganZhi: string;
        gan: string;
        zhi: string;
        shiShen: string;
        shiShenAbbr: string;
        shiErZhangSheng: string;
    }> = [];

    // 判断大运顺逆：阳年男顺女逆，阴年男逆女顺
    const yearGanYinYang = getTianGanYinYang(yearGan);
    const isYangYear = yearGanYinYang === '阳';
    const isShun = (isYangYear && sex === 1) || (!isYangYear && sex === 0);
    const direction = isShun ? 1 : -1;

    let currentGanZhi = monthGanZhi;

    for (let i = 0; i < count; i++) {
        currentGanZhi = getNextGanZhi(currentGanZhi, direction);
        const parsed = parseGanZhi(currentGanZhi);
        if (!parsed) continue;

        const shiShen = getShiShen(dayGan, parsed.gan);

        daYunList.push({
            index: i,
            ganZhi: currentGanZhi,
            gan: parsed.gan,
            zhi: parsed.zhi,
            shiShen,
            shiShenAbbr: getShiShenAbbr(shiShen),
            shiErZhangSheng: getShiErZhangSheng(dayGan, parsed.zhi),
        });
    }

    return daYunList;
}

/**
 * 计算某年的流年
 * 
 * @param year 公历年份
 */
export function calculateLiuNian(year: number): {
    ganZhi: string;
    gan: string;
    zhi: string;
    shengXiao: string;
} {
    // 1984年是甲子年
    const baseYear = 1984;
    const offset = year - baseYear;
    const ganIndex = ((offset % 10) + 10) % 10;
    const zhiIndex = ((offset % 12) + 12) % 12;

    const gan = TIAN_GAN[ganIndex];
    const zhi = DI_ZHI[zhiIndex];
    const ganZhi = gan + zhi;

    return {
        ganZhi,
        gan,
        zhi,
        shengXiao: getShengXiao(zhi),
    };
}

// 导出常用常量和工具
export {
    TIAN_GAN,
    DI_ZHI,
    DI_ZHI_CHONG,
    DI_ZHI_SHENG_XIAO,
    SHI_SHEN_ABBR,
};

export {
    getTianGanWuXing,
    getDiZhiWuXing,
    getTianGanYinYang,
    getDiZhiCangGan,
    getNaYin,
    getNaYinWuXing,
    getKongWang,
    getShiShen,
    getShiShenAbbr,
    getShiErZhangSheng,
    getShengXiao,
    parseGanZhi,
    getNextGanZhi,
};
