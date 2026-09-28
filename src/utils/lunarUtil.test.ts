import { describe, expect, it } from 'vitest';
import { getBaziYearGanZhi, getCurrentBaziYear } from './lunarUtil';

/**
 * 回归用例：老年命例点击"当前流年"必须跳到当前年份。
 *
 * 历史 Bug：跳转逻辑用「实时年干支」去流年表里 find 第一条同干支记录。
 * 干支只能在六十甲子里定位一位，丙午对应 1906 / 1966 / 2026，
 * 于是 1936/1939 年生的命例会被带到 1966 年。
 */
describe('八字年（以立春为界）', () => {
    it('年干支按立春换年，而非农历新年', () => {
        // 2026 年立春为 2 月 4 日，春节为 2 月 17 日
        expect(getBaziYearGanZhi(2026)).toBe('丙午');
        expect(getBaziYearGanZhi(2025)).toBe('乙巳');
        expect(getBaziYearGanZhi(1966)).toBe('丙午');
    });

    it('同一干支对应多个公历年（丙午 = 1906/1966/2026）', () => {
        expect(getBaziYearGanZhi(1906)).toBe('丙午');
        expect(getBaziYearGanZhi(1966)).toBe('丙午');
        expect(getBaziYearGanZhi(2026)).toBe('丙午');
    });

    it('实时八字年号与干支自洽', () => {
        const cases = [
            new Date(2026, 0, 20),      // 立春前：仍属乙巳年
            new Date(2026, 1, 1),       // 立春前
            new Date(2026, 1, 4, 12),   // 立春后
            new Date(2026, 5, 15),      // 年中
            new Date(2026, 11, 20),     // 年末
        ];

        for (const date of cases) {
            const { solarYear, ganZhi } = getCurrentBaziYear(date);
            expect(getBaziYearGanZhi(solarYear)).toBe(ganZhi);
        }
    });

    it('立春前后年号正确切换', () => {
        expect(getCurrentBaziYear(new Date(2026, 0, 20)).solarYear).toBe(2025);
        expect(getCurrentBaziYear(new Date(2026, 0, 20)).ganZhi).toBe('乙巳');
        expect(getCurrentBaziYear(new Date(2026, 1, 4, 12)).solarYear).toBe(2026);
        expect(getCurrentBaziYear(new Date(2026, 1, 4, 12)).ganZhi).toBe('丙午');
        expect(getCurrentBaziYear(new Date(2026, 5, 15)).solarYear).toBe(2026);
    });
});
