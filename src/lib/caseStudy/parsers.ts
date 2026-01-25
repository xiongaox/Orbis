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

// ====== 奇门时间解析 ======

/**
 * 解析内容中所有出现的奇门时间
 * 格式示例: 公元：2009年7月9日20时43分47秒
 */
export function parseAllQimenTime(content: string): Array<{ year: number, month: number, day: number, hour: number, minute: number }> {
    const matches = Array.from(content.matchAll(/(?:^|\n|[\s，。；])(?:(?:公元|公历)[：:])?\s*(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2})时(\d{1,2})分/g));

    if (matches.length > 0) {
        return matches.map(match => ({
            year: parseInt(match[1]),
            month: parseInt(match[2]),
            day: parseInt(match[3]),
            hour: parseInt(match[4]),
            minute: parseInt(match[5])
        }));
    }

    // 尝试备用格式 (可能没有"公元")
    const backupMatches = Array.from(content.matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2})时/g));
    if (backupMatches.length > 0) {
        // 过滤掉已经在上面匹配过的 (简单去重，如果位置重叠)
        // 这里简化处理，直接返回备用匹配结果，但在实际混合情况可能需要更复杂逻辑
        // 鉴于目前案例格式比较统一，先只支持一种主要格式或备用格式
        return backupMatches.map(match => ({
            year: parseInt(match[1]),
            month: parseInt(match[2]),
            day: parseInt(match[3]),
            hour: parseInt(match[4]),
            minute: 0
        }));
    }

    return [];
}

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

/**
 * 解析内容中所有出现的八字信息
 */
export const parseAllBaziInfo = (content: string): ParsedBaziInfo[] => {
    const results: ParsedBaziInfo[] = [];

    // 1. 简化的主八字解析逻辑
    // 为了避免将同一案例的"头部元数据"和"正文排盘"识别为两个不同的八字，
    // 我们不再根据 "乾造/坤造" 进行拆分，只根据 "命主生辰" 拆分（如果有多个案例合并在同一文件的情况）
    // 但通常每个文件只有一个案例，所以主要依赖 parseBaziInfo 直接解析全文。

    const indices: number[] = [];
    const headerRegex = /(?:命主生辰)[：:]/g;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(content)) !== null) {
        indices.push(headerMatch.index);
    }

    if (indices.length > 1) {
        // 只有当存在多个 "命主生辰" 时才拆分 (罕见情况)
        for (let i = 0; i < indices.length; i++) {
            const start = indices[i];
            const end = i < indices.length - 1 ? indices[i + 1] : content.length;
            results.push(parseBaziInfo(content.substring(start, end)));
        }
    } else {
        // 标准情况：单案例文件
        const mainInfo = parseBaziInfo(content);
        if (mainInfo.pillars.length > 0 || mainInfo.birthYear) {
            results.push(mainInfo);
        }
    }

    // 2. 新增逻辑：解析强调格式的八字 【**甲子，乙丑，丙寅，丁卯**】
    // Format: 【**YZ，MZ，RZ，HZ**】
    const GZ = '[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]';
    const SEP = '[\\s,，、]+';
    // Capture context before the match for gender inference
    // Note: JS RegExp lookbehind support is good in modern Node, but safer to use exec index
    const secondaryRegex = new RegExp(`【\\*\\*\\s*(${GZ})${SEP}(${GZ})${SEP}(${GZ})${SEP}(${GZ})\\s*\\*\\*】`, 'g');

    let secMatch;
    while ((secMatch = secondaryRegex.exec(content)) !== null) {
        const [, y, m, d, h] = secMatch;
        const pillars = [
            { label: '年柱', ganZhi: y, tiangan: y[0], dizhi: y[1] },
            { label: '月柱', ganZhi: m, tiangan: m[0], dizhi: m[1] },
            { label: '日柱', ganZhi: d, tiangan: d[0], dizhi: d[1] },
            { label: '时柱', ganZhi: h, tiangan: h[0], dizhi: h[1] },
        ];

        // De-dupe: Check if these pillars already exist in results
        const isDuplicate = results.some(r =>
            r.pillars.length >= 4 &&
            r.pillars[0].ganZhi === y &&
            r.pillars[1].ganZhi === m &&
            r.pillars[2].ganZhi === d &&
            r.pillars[3].ganZhi === h
        );

        if (!isDuplicate) {
            // Infer Gender from context (preceding 20 chars)
            // Infer Gender from context (preceding 50 chars)
            // Fix: Do not include fullStr in context to avoid matching '子' in Bazi characters
            const contextStart = Math.max(0, secMatch.index - 50);
            const contextEnd = secMatch.index;
            const context = content.substring(contextStart, contextEnd);

            let gender: '乾造' | '坤造' | null = null;

            // Priority 1: Explicit markers
            if (/乾造/.test(context)) {
                gender = '乾造';
            } else if (/坤造/.test(context)) {
                gender = '坤造';
            } else {
                // Priority 2: Keywords
                // Fix: Use specific words instead of character class [子] which matches 'Rat' in Bazi
                const maleKeywords = /丈夫|老公|男友|前夫|父亲|爸爸|儿子|爷爷|公公|男/;
                const femaleKeywords = /妻子|老婆|女友|前妻|母亲|妈妈|女儿|奶奶|婆婆|女/;

                // Check occurrences or proximity if needed, but simple precedence might work
                const hasMale = maleKeywords.test(context);
                const hasFemale = femaleKeywords.test(context);

                if (hasMale && !hasFemale) {
                    gender = '乾造';
                } else if (hasFemale && !hasMale) {
                    gender = '坤造';
                } else if (hasMale && hasFemale) {
                    // If both, check which one is closer to the end of context?
                    // Simple heuristic: Last mention wins
                    const lastMale = Math.max(...['丈夫', '老公', '男友', '前夫', '父亲', '爸爸', '儿子', '男'].map(k => context.lastIndexOf(k)));
                    const lastFemale = Math.max(...['妻子', '老婆', '女友', '前妻', '母亲', '妈妈', '女儿', '女'].map(k => context.lastIndexOf(k)));
                    gender = lastMale > lastFemale ? '乾造' : '坤造';
                }
            }

            results.push({
                gender,
                pillars,
                daYun: [], // No explicit DaYun in this format usually
                birthYear: null,
                birthMonth: null,
                birthDay: null,
                birthHour: null,
                isLunar: false,
                baziData: null
            });
        }
    }

    // Filter out invalid results
    return results.filter(r => r.pillars.length >= 4);
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
