/**
 * CaseStudy 模块 - 解析工具函数
 */
import { Lunar } from 'lunar-typescript';
import {
    DI_ZHI_CANG_GAN,
    SHI_SHEN,
    NA_YIN,
    SHI_ER_ZHANG_SHENG,
    TIAN_GAN_WU_XING,
    DI_ZHI_WU_XING,
} from '../xuan-bazi/maps';
import { getXunKong, getShiShenAbbr } from '../xuan-bazi/utils';
import { calculateBazi } from '../../services/bazi/baziCalculator';
import type { HiddenStem, BaziApiResponse } from '../../types/bazi';
import {
    type CaseMetadata,
    type ParsedBaziInfo,
    LUNAR_MONTH_MAP,
    LUNAR_DAY_MAP,
    HOUR_MAP,
    TIAN_GAN,
    DI_ZHI,
} from './types';

// ====== 元数据解析 ======

/**
 * 从头部元数据解析案例信息
 */
export const parseCaseMetadata = (content: string): CaseMetadata => {
    const birthMatch = content.match(/命主生辰[：:]\s*([^\n]+)/);
    const genderMatch = content.match(/性别[：:]\s*([乾坤]造)/);
    const dayMasterMatch = content.match(/日主[：:]\s*([^\n]+)/);
    const patternMatch = content.match(/格局[：:]\s*([^\n]+)/);
    const seasonMatch = content.match(/令地[：:]\s*([^\n]+)/);

    return {
        birthDateTime: birthMatch ? birthMatch[1].trim() : null,
        gender: genderMatch ? (genderMatch[1] as '乾造' | '坤造') : null,
        dayMasterElement: dayMasterMatch ? dayMasterMatch[1].trim() : null,
        pattern: patternMatch ? patternMatch[1].trim() : null,
        seasonStatus: seasonMatch ? seasonMatch[1].trim() : null,
    };
};

/**
 * 从头部元数据解析出生年月日时
 */
export const parseBirthFromMetadata = (birthDateTime: string): { year: number; month: number; day: number; hour: number | null } | null => {
    // 格式1: "1985/07/14 08:00 (GMT+8)" 带时间
    const matchWithTime = birthDateTime.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (matchWithTime) {
        return {
            year: parseInt(matchWithTime[1], 10),
            month: parseInt(matchWithTime[2], 10),
            day: parseInt(matchWithTime[3], 10),
            hour: parseInt(matchWithTime[4], 10),
        };
    }
    // 格式2: "2001/11/09 (GMT+8)" 只有日期没有时间
    const matchDateOnly = birthDateTime.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (matchDateOnly) {
        return {
            year: parseInt(matchDateOnly[1], 10),
            month: parseInt(matchDateOnly[2], 10),
            day: parseInt(matchDateOnly[3], 10),
            hour: null,
        };
    }
    return null;
};

/**
 * 过滤掉头部元数据，只保留正文内容用于显示
 */
export const filterContentForDisplay = (content: string): string => {
    const metadataPattern = /^(命主生辰|性别|日主|格局|令地)[：:][^\n]*\n?/gm;
    let filtered = content.replace(metadataPattern, '');
    filtered = filtered.replace(/^#\s+[^\n]+\n?/, '');
    return filtered.replace(/^\n+/, '');
};

/**
 * 提取八字摘要用于列表显示
 */
export const extractBazi = (content: string): string => {
    const metadata = parseCaseMetadata(content);
    if (metadata.birthDateTime && metadata.dayMasterElement) {
        const birth = parseBirthFromMetadata(metadata.birthDateTime);
        if (birth) {
            return `${birth.year}/${birth.month}/${birth.day} ${metadata.dayMasterElement}`;
        }
    }

    const match = content.match(/[乾坤]造[：:]\s*([^\n(（]+)/);
    if (match) {
        let bazi = match[1].replace(/[年月日时，,、\s]+/g, ' ').trim();
        const pillars = bazi.split(/\s+/);
        if (pillars.length >= 4) {
            return pillars.slice(0, 4).join(' ');
        }
        return bazi;
    }
    return "未知八字";
};

// ====== 八字解析 ======

/**
 * 解析完整八字信息
 */
export const parseBaziInfo = (content: string): ParsedBaziInfo => {
    const metadata = parseCaseMetadata(content);

    // Gender
    const gender = metadata.gender || (() => {
        const genderMatch = content.match(/([乾坤])造/);
        return genderMatch ? (genderMatch[1] === '乾' ? '乾造' : '坤造') as '乾造' | '坤造' : null;
    })();

    // 解析出生日期
    let birthYear: number | null = null;
    let birthMonth: number | null = null;
    let birthDay: number | null = null;
    let birthHour: number | null = null;
    let isLunar = false;

    // 优先从头部元数据获取公历日期
    if (metadata.birthDateTime) {
        const birth = parseBirthFromMetadata(metadata.birthDateTime);
        if (birth) {
            birthYear = birth.year;
            birthMonth = birth.month;
            birthDay = birth.day;
            birthHour = birth.hour;
            isLunar = false;
        }
    }

    // 回退格式1: 农历
    if (!birthYear) {
        const lunarMatch1 = content.match(/农历\s*(\d{4})年\s*(正|一|二|三|四|五|六|七|八|九|十|十一|冬|十二|腊)月\s*(初一|初二|初三|初四|初五|初六|初七|初八|初九|初十|十一|十二|十三|十四|十五|十六|十七|十八|十九|二十|廿一|廿二|廿三|廿五|廿六|廿七|廿八|廿九|三十|三十一)\s*(?:(上午|下午|中午|晚上|午夜|凌晨|早上)?\s*(\d{1,2}))?/i);
        if (lunarMatch1) {
            isLunar = true;
            birthYear = parseInt(lunarMatch1[1], 10);
            birthMonth = LUNAR_MONTH_MAP[lunarMatch1[2]] || null;
            birthDay = LUNAR_DAY_MAP[lunarMatch1[3]] || null;
            if (lunarMatch1[5]) {
                let hour = parseInt(lunarMatch1[5], 10);
                const period = lunarMatch1[4];
                if (period === '下午' && hour < 12) hour += 12;
                if (period === '上午' && hour === 12) hour = 0;
                if (period === '中午') hour = 12;
                birthHour = hour;
            }
        }
    }

    // 回退格式2
    if (!birthYear) {
        const lunarMatch2 = content.match(/农历\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
        if (lunarMatch2) {
            isLunar = true;
            birthYear = parseInt(lunarMatch2[1], 10);
            birthMonth = parseInt(lunarMatch2[2], 10);
            birthDay = parseInt(lunarMatch2[3], 10);
        }
    }

    // 解析时辰
    if (!birthHour) {
        const hourMatch = content.match(/(上午|下午|中午|晚上|午夜|凌晨|早上)?\s*(\d{1,2})\s*[点时:]/i);
        if (hourMatch) {
            let hour = parseInt(hourMatch[2], 10);
            const period = hourMatch[1];
            if (period === '下午' && hour !== 12) hour += 12;
            if (period === '上午' && hour === 12) hour = 0;
            if (period === '中午') hour = 12;
            birthHour = hour;
        }
    }

    // Pillars
    const pillars: ParsedBaziInfo['pillars'] = [];
    const pillarMatch = content.match(/[乾坤]造[：:]\s*([^\n(（]+)/);
    if (pillarMatch) {
        const parts = pillarMatch[1].match(/([^\s,，年月日时]+)[年月日时]/g);
        if (parts && parts.length >= 4) {
            const labels = ['年柱', '月柱', '日柱', '时柱'];
            parts.slice(0, 4).forEach((part, i) => {
                const ganZhi = part.replace(/[年月日时]/g, '');
                if (ganZhi.length >= 2) {
                    pillars.push({
                        ganZhi,
                        tiangan: ganZhi[0],
                        dizhi: ganZhi[1],
                        label: labels[i]
                    });
                }
            });
        }
    }

    // 从时柱提取时辰
    if (!birthHour && pillars.length >= 4) {
        const timeZhi = pillars[3].dizhi;
        if (timeZhi && HOUR_MAP[timeZhi] !== undefined) {
            birthHour = HOUR_MAP[timeZhi];
        }
    }

    // Da Yun
    const daYun: string[] = [];
    const daYunMatch = content.match(/大运[：:]\s*([^\n]+)/);
    if (daYunMatch) {
        const parts = daYunMatch[1].split(/[，,、\s]+/).filter(s => s.length === 2);
        daYun.push(...parts);
    }

    // 计算完整八字数据
    let baziData: BaziApiResponse | null = null;
    if (birthYear && birthMonth && birthDay && birthHour !== null) {
        try {
            let solarYear = birthYear;
            let solarMonth = birthMonth;
            let solarDay = birthDay;

            if (isLunar) {
                const lunar = Lunar.fromYmd(birthYear, birthMonth, birthDay);
                const solar = lunar.getSolar();
                solarYear = solar.getYear();
                solarMonth = solar.getMonth();
                solarDay = solar.getDay();
            }

            baziData = calculateBazi({
                year: solarYear,
                month: solarMonth,
                day: solarDay,
                hour: birthHour,
                minute: 0,
                gender: gender === '乾造' ? 'male' : 'female'
            });
        } catch (e) {
            console.warn('计算八字失败:', e);
        }
    }

    // 使用计算结果填充缺失的 pillars
    if (baziData && baziData.pillars && pillars.length < 4) {
        const labels = ['年柱', '月柱', '日柱', '时柱'];
        const newPillars = [];
        for (let i = 0; i < 4; i++) {
            const p = baziData.pillars[i];
            if (p && p.ganZhi) {
                newPillars.push({
                    ganZhi: p.ganZhi,
                    tiangan: p.ganZhi[0],
                    dizhi: p.ganZhi[1],
                    label: labels[i]
                });
            }
        }
        if (newPillars.length === 4) {
            pillars.length = 0;
            pillars.push(...newPillars);
        }
    }

    return { gender, pillars, daYun, birthYear, birthMonth, birthDay, birthHour, isLunar, baziData };
};

// ====== 大运计算 ======

/**
 * 根据首个大运和性别推算完整大运列表
 */
export function extendDaYun(firstDaYun: string, gender: '乾造' | '坤造' | null, yearGan: string, targetCount: number = 12): string[] {
    if (!firstDaYun || firstDaYun.length < 2) return [];

    const result: string[] = [firstDaYun];

    const yangGan = ['甲', '丙', '戊', '庚', '壬'];
    const isYangYear = yangGan.includes(yearGan);
    const isMale = gender === '乾造';
    const forward = (isYangYear && isMale) || (!isYangYear && !isMale);

    let ganIndex = TIAN_GAN.indexOf(firstDaYun[0]);
    let zhiIndex = DI_ZHI.indexOf(firstDaYun[1]);

    for (let i = 1; i < targetCount; i++) {
        if (forward) {
            ganIndex = (ganIndex + 1) % 10;
            zhiIndex = (zhiIndex + 1) % 12;
        } else {
            ganIndex = (ganIndex - 1 + 10) % 10;
            zhiIndex = (zhiIndex - 1 + 12) % 12;
        }
        result.push(TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex]);
    }

    return result;
}

// ====== 柱详情计算 ======

/**
 * 获取五行
 */
export function getElement(char: string): string {
    return TIAN_GAN_WU_XING[char] || DI_ZHI_WU_XING[char] || '';
}

/**
 * 计算柱的详细信息（十神、藏干、自坐、纳音、空亡）
 */
export function computePillarDetails(ganZhi: string, dayGan: string, abbreviate: boolean = false) {
    if (!ganZhi || ganZhi.length < 2) {
        return { tianganShiShen: '', zanggan: [], diShi: '', ziZuo: '', kongWang: '', naYin: '' };
    }

    const tiangan = ganZhi[0];
    const dizhi = ganZhi[1];

    const fullTianganShiShen = SHI_SHEN[dayGan + tiangan] || '';
    const tianganShiShen = abbreviate ? (getShiShenAbbr(fullTianganShiShen) || '') : fullTianganShiShen;

    const hideGans = DI_ZHI_CANG_GAN[dizhi] || [];
    const zanggan: HiddenStem[] = hideGans.map((gan: string) => {
        const fullShiShen = SHI_SHEN[dayGan + gan] || '';
        return {
            gan,
            shiShen: abbreviate ? (getShiShenAbbr(fullShiShen) || '') : fullShiShen,
            element: getElement(gan)
        };
    });

    const diShi = SHI_ER_ZHANG_SHENG[dayGan + dizhi] || '';
    const ziZuo = SHI_ER_ZHANG_SHENG[tiangan + dizhi] || '';
    const naYin = NA_YIN[ganZhi] || '';
    const kongWang = getXunKong(ganZhi);

    return { tianganShiShen, zanggan, diShi, ziZuo, kongWang, naYin };
}
