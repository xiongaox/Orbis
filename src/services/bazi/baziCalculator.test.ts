import { describe, it, expect } from 'vitest';
import { calculateBazi } from './baziCalculator';

// 出生前大运：用于查看六亲在命主出生前的岁运
describe('calculateBazi 出生前大运', () => {
    it('顺行：出生前大运沿干支序列逆推，且年份与出生年那一段连续', () => {
        const r = calculateBazi({ year: 1990, month: 10, day: 13, hour: 7, minute: 51, gender: 'male' });
        expect(r.yunInfo.isForward).toBe(true);

        const pre = r.daYun.filter(dy => dy.index < 0);
        expect(pre).toHaveLength(10);
        expect(pre.slice(-4).map(d => d.ganZhi)).toEqual(['癸未', '甲申', '乙酉', '丙戌']);
        expect(pre.slice(-4).map(d => `${d.startYear}-${d.endYear}`)).toEqual(['1950-1959', '1960-1969', '1970-1979', '1980-1989']);
        // 出生前段的年龄为负（界面统一显示 0 岁）
        expect(pre.slice(-4).map(d => d.startAge)).toEqual([-40, -30, -20, -10]);
        expect(pre.slice(-4).map(d => d.endAge)).toEqual([-31, -21, -11, -1]);

        // 大运序列年份首尾相接，直到起运大运
        for (let i = 1; i < r.daYun.length; i++) {
            expect(r.daYun[i].startYear).toBe(r.daYun[i - 1].endYear + 1);
        }
    });

    it('出生前的大运同样生成对应流年与小运，供点击查看', () => {
        const r = calculateBazi({ year: 1990, month: 10, day: 13, hour: 7, minute: 51, gender: 'male' });
        const preIndexes = r.daYun.filter(dy => dy.index < 0).map(dy => dy.index);
        expect(preIndexes).toHaveLength(10);
        for (const i of preIndexes) {
            const ln = r.liuNian.filter(x => x.dayunIndex === i);
            const xy = r.currentXiaoYun.filter(x => x.dayunIndex === i);
            expect(ln).toHaveLength(10);
            expect(xy).toHaveLength(10);
            // 出生前的流年年龄为负，小运干支仍须落在六十甲子内
            expect(ln.every(x => x.age < 0 && x.ganZhi.length === 2)).toBe(true);
            expect(xy.every(x => x.ganZhi.length === 2 && !x.ganZhi.includes('undefined'))).toBe(true);
        }
    });
});
