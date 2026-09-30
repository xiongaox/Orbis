import { Solar, Lunar } from 'lunar-typescript';

/**
 * 八字八字符（年干支、月干支、日干支、时干支）
 */
export interface EightCharResult {
    yearGan: string;
    yearZhi: string;
    monthGan: string;
    monthZhi: string;
    dayGan: string;
    dayZhi: string;
    timeGan: string;
    timeZhi: string;
}

/**
 * 农历日期信息
 */
export interface LunarDateInfo {
    yearInChinese: string;
    monthInChinese: string;
    dayInChinese: string;
    yearInGanZhi: string; // Add yearInGanZhi field
    year: number;
    month: number;
    day: number;
    isLeapMonth: boolean;
}

/**
 * 实时时钟数据
 */
export interface RealtimeClockData {
    solar: {
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
        second: number;
        formatted: string;
    };
    lunar: LunarDateInfo;
    eightChar: EightCharResult;
    pillars: {
        year: string;
        month: string;
        day: string;
        hour: string;
    };
}

/**
 * 从日期获取八字八字符
 */
export function getEightCharFromDate(date: Date): EightCharResult | null {
    try {
        const solar = Solar.fromYmdHms(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            0
        );
        const lunar = solar.getLunar();
        const eightChar = lunar.getEightChar();

        return {
            yearGan: eightChar.getYearGan(),
            yearZhi: eightChar.getYearZhi(),
            monthGan: eightChar.getMonthGan(),
            monthZhi: eightChar.getMonthZhi(),
            dayGan: eightChar.getDayGan(),
            dayZhi: eightChar.getDayZhi(),
            timeGan: eightChar.getTimeGan(),
            timeZhi: eightChar.getTimeZhi(),
        };
    } catch (e) {
        console.error('八字计算错误:', e);
        return null;
    }
}

/**
 * 从年月日获取八字八字符（不含时辰，时辰默认子时）
 */
export function getEightCharFromYmd(year: number, month: number, day: number): EightCharResult | null {
    try {
        const solar = Solar.fromYmd(year, month, day);
        const lunar = solar.getLunar();
        const eightChar = lunar.getEightChar();

        return {
            yearGan: eightChar.getYearGan(),
            yearZhi: eightChar.getYearZhi(),
            monthGan: eightChar.getMonthGan(),
            monthZhi: eightChar.getMonthZhi(),
            dayGan: eightChar.getDayGan(),
            dayZhi: eightChar.getDayZhi(),
            timeGan: eightChar.getTimeGan(),
            timeZhi: eightChar.getTimeZhi(),
        };
    } catch (e) {
        console.error('八字计算错误:', e);
        return null;
    }
}

/**
 * 从日期字符串解析并计算八字四柱（返回八字符数组）
 * 兼容中文日期格式和 ISO 格式
 */
export function getBaziPillarsFromDateString(dateStr: string): string[] {
    try {
        // 尝试解析中文日期格式
        const match = dateStr.match(/(\d+)年(\d+)月(\d+)日/);
        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            const result = getEightCharFromYmd(year, month, day);
            if (result) {
                return [
                    result.yearGan, result.yearZhi,
                    result.monthGan, result.monthZhi,
                    result.dayGan, result.dayZhi,
                    result.timeGan, result.timeZhi,
                ];
            }
        }

        // 尝试解析 ISO 日期格式
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const result = getEightCharFromDate(date);
            if (result) {
                return [
                    result.yearGan, result.yearZhi,
                    result.monthGan, result.monthZhi,
                    result.dayGan, result.dayZhi,
                    result.timeGan, result.timeZhi,
                ];
            }
        }

        return [];
    } catch (e) {
        console.error('八字计算错误:', e);
        return [];
    }
}

/**
 * 从 Date 对象获取实时时钟数据
 */
export function getRealtimeClockData(date: Date): RealtimeClockData {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    return {
        solar: {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            second: date.getSeconds(),
            formatted: `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
        },
        lunar: {
            yearInChinese: lunar.getYearInChinese(),
            monthInChinese: lunar.getMonthInChinese(),
            dayInChinese: lunar.getDayInChinese(),
            yearInGanZhi: lunar.getYearInGanZhi(),
            year: lunar.getYear(),
            month: lunar.getMonth(),
            day: lunar.getDay(),
            isLeapMonth: lunar.getMonth() < 0,
        },
        eightChar: {
            yearGan: eightChar.getYearGan(),
            yearZhi: eightChar.getYearZhi(),
            monthGan: eightChar.getMonthGan(),
            monthZhi: eightChar.getMonthZhi(),
            dayGan: eightChar.getDayGan(),
            dayZhi: eightChar.getDayZhi(),
            timeGan: eightChar.getTimeGan(),
            timeZhi: eightChar.getTimeZhi(),
        },
        pillars: {
            year: eightChar.getYearGan() + eightChar.getYearZhi(),
            month: eightChar.getMonthGan() + eightChar.getMonthZhi(),
            day: eightChar.getDayGan() + eightChar.getDayZhi(),
            hour: eightChar.getTimeGan() + eightChar.getTimeZhi(),
        },
    };
}

/**
 * 获取某个公历年所对应的八字年干支（以立春为界）。
 *
 * 取该年 6 月 15 日（必定晚于立春、且不跨到下一年立春）求年干支，
 * 因此不受"农历新年"与"立春"错位的影响，比取 1 月日期更稳健。
 *
 * @param solarYear 公历年
 * @returns 年干支（如 '丙午'）；计算失败时返回空字符串
 */
export function getBaziYearGanZhi(solarYear: number): string {
    try {
        return Solar.fromYmd(solarYear, 6, 15).getLunar().getYearInGanZhi();
    } catch (e) {
        console.error('八字年干支计算错误:', e);
        return '';
    }
}

/**
 * 获取当前时刻所属的八字年（以立春为界）及其干支。
 *
 * 干支只能定位到"六十甲子中的某一位"，存在多个候选公历年（如丙午对应
 * 1906/1966/2026）。真正的年份必须用「当前公历年按立春折算后的年号」来确定。
 *
 * @param date 参照时刻，默认当前时间
 * @returns solarYear 八字年对应的公历年号、ganZhi 该年的年干支
 */
export function getCurrentBaziYear(date: Date = new Date()): { solarYear: number; ganZhi: string } {
    const clockData = getRealtimeClockData(date);
    const ganZhi = clockData.eightChar.yearGan + clockData.eightChar.yearZhi;

    // 八字年以立春换年：1 月必然还属上一年；2 月需按立春的日/时判断。
    // 立春最早出现在 2 月 3 日、最晚 2 月 5 日，这里取保守的 2 月 4 日界限，
    // 用于"当前公历年 → 八字年号"的降级估算。
    let solarYear = date.getFullYear();
    const month = date.getMonth(); // 0-based
    if (month === 0 || (month === 1 && date.getDate() < 4)) {
        solarYear -= 1;
    }

    // 若该估算年号的干支与实时干支不一致（立春边界日内可能发生），
    // 用相邻年份自校验一次，确保年号与干支自洽。
    if (ganZhi && getBaziYearGanZhi(solarYear) !== ganZhi) {
        const prevGanZhi = getBaziYearGanZhi(solarYear - 1);
        if (prevGanZhi === ganZhi) {
            solarYear -= 1;
        } else if (getBaziYearGanZhi(solarYear + 1) === ganZhi) {
            solarYear += 1;
        }
    }

    return { solarYear, ganZhi };
}

/**
 * 从农历日期获取公历日期
 * @param year 农历年
 * @param month 农历月（负数表示闰月）
 * @param day 农历日
 */
export function getLunarToSolarDate(year: number, month: number, day: number): Date {
    const lunar = Lunar.fromYmd(year, month, day);
    const solar = lunar.getSolar();
    return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
}

/**
 * 从公历日期获取农历信息
 */
export function getSolarToLunarInfo(date: Date): LunarDateInfo {
    const lunar = Lunar.fromDate(date);
    return {
        yearInChinese: lunar.getYearInChinese(),
        monthInChinese: lunar.getMonthInChinese(),
        dayInChinese: lunar.getDayInChinese(),
        yearInGanZhi: lunar.getYearInGanZhi(), // Populate it
        year: lunar.getYear(),
        month: lunar.getMonth(),
        day: lunar.getDay(),
        isLeapMonth: lunar.getMonth() < 0,
    };
}

/**
 * 获取指定农历年月的天数
 */
export function getLunarMonthDays(year: number, month: number): number {
    try {
        // lunar-typescript 中闰月用负数表示
        const lunar = Lunar.fromYmd(year, month, 1);
        // 获取当月天数
        const lunarMonth = lunar.getMonth();
        // 通过遍历判断天数
        let days = 29;
        try {
            Lunar.fromYmd(year, lunarMonth, 30);
            days = 30;
        } catch {
            // 29天
        }
        return days;
    } catch {
        return 30;
    }
}

/**
 * 从出生日期计算虚岁
 * 虚岁计算：当前年 - 出生年 + 1
 */
export function getAgeFromBirth(birthDate?: string): number | null {
    if (!birthDate) return null;
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) return null;
    const now = new Date();
    // Bazi typically uses Virtual Age (虚岁): Current Year - Birth Year + 1
    return now.getFullYear() - date.getFullYear() + 1;
}

