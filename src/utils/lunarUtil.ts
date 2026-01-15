/**
 * lunarUtil - 农历/八字工具封装
 * 统一封装 lunar-typescript 的调用，避免组件直接依赖底层库
 */
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

