import { describe, it, expect } from 'vitest';
import { calculateBazi } from '../../../services/bazi/baziCalculator';
import { groupLifeEvents, defaultDayunCount, minDayunCount } from './lifeEvents';
import type { LifeEvent } from '../../../services/baziCaseService';

/**
 * 生平时间轴的两个关键假设：
 * 1. 完整排盘能给出大运 / 流年，且流年年份落在对应大运区间内（记录靠年份归位的依据）
 * 2. 记录按大运节点分组的归位与排序规则
 */

describe('生平时间轴 · 大运流年数据源', () => {
    const full = calculateBazi({ year: 1992, month: 12, day: 1, hour: 11, minute: 5, gender: 'male' });

    it('完整排盘返回大运与流年', () => {
        expect(full.daYun.length).toBeGreaterThan(0);
        expect(full.liuNian.length).toBeGreaterThan(0);
    });

    it('每个流年的年份都落在其所属大运区间内（年份归位的依据）', () => {
        const byStart = new Map(full.daYun.map((d) => [d.index, d]));
        const checked = full.liuNian.filter((l) => l.dayunIndex !== undefined);
        expect(checked.length).toBeGreaterThan(0);
        for (const ln of checked) {
            const owner = byStart.get(ln.dayunIndex as number);
            if (!owner) continue;
            expect(ln.year).toBeGreaterThanOrEqual(owner.startYear);
            expect(ln.year).toBeLessThanOrEqual(owner.endYear);
        }
    });

    it('大运按年份连续衔接，出生后段 index >= 0', () => {
        const after = full.daYun.filter((d) => d.index >= 0).sort((a, b) => a.startYear - b.startYear);
        expect(after.length).toBeGreaterThan(0);
        for (let i = 1; i < after.length; i++) {
            expect(after[i].startYear).toBe(after[i - 1].endYear + 1);
        }
    });
});

describe('生平时间轴 · 记录分组', () => {
    const rangeList = [
        { startYear: 1992, endYear: 2001 },
        { startYear: 2002, endYear: 2011 },
    ];
    const event = (kind: LifeEvent['kind'], ref: string, text: string): LifeEvent =>
        ({ kind, ref, ganZhi: '甲子', text });

    it('大运记录挂到起始年节点，流年记录挂到年份所在节点', () => {
        const { map } = groupLifeEvents(
            [event('dayun', '2002', '大运记述'), event('liunian', '1999', '流年记述')],
            rangeList,
        );
        expect(map.get(1992)?.map((e) => e.text)).toEqual(['流年记述']);
        expect(map.get(2002)?.map((e) => e.text)).toEqual(['大运记述']);
    });

    it('同节点内大运记录在前，流年记录按年份升序', () => {
        const { map } = groupLifeEvents(
            [event('liunian', '2000', '后'), event('dayun', '1992', '大运'), event('liunian', '1999', '前')],
            rangeList,
        );
        expect(map.get(1992)?.map((e) => e.text)).toEqual(['大运', '前', '后']);
    });

    it('年份落不进任何大运段的记录进 orphan，不静默丢弃', () => {
        const { map, orphan } = groupLifeEvents([event('liunian', '1888', '很久以前')], rangeList);
        expect(map.size).toBe(0);
        expect(orphan.map((e) => e.text)).toEqual(['很久以前']);
    });

    it('空记录返回空分组', () => {
        const { map, orphan } = groupLifeEvents([], rangeList);
        expect(map.size).toBe(0);
        expect(orphan).toEqual([]);
    });
});

describe('生平时间轴 · 默认展示范围（到 100 岁）', () => {
    const event = (ref: string): LifeEvent => ({ kind: 'liunian', ref, ganZhi: '甲子', text: 'x' });
    // 每段 10 年，从 1 岁起
    const periods = Array.from({ length: 20 }, (_, i) => ({ startAge: 1 + i * 10, endYear: 2000 + i * 10 + 9 }));

    it('截到 100 岁所在的段', () => {
        // startAge 1..91 都 <= 100，第 11 段 startAge=101 → 取前 10 段
        expect(defaultDayunCount(periods, [], 2020)).toBe(10);
    });

    it('当前年份落在更远的段上时一并纳入', () => {
        // 2020 落在第 2 段（endYear 2019 之后、2029 之前），不影响 100 岁上限
        expect(defaultDayunCount(periods, [], 2020)).toBe(10);
        // 当前年份已过百岁：首个 endYear >= 2130 的是第 14 段（endYear 2139）
        expect(defaultDayunCount(periods, [], 2130)).toBe(14);
    });

    it('已有记录落在 100 岁之后时，必须覆盖到该段而不被藏起来', () => {
        // 首个 endYear >= 2150 的是第 16 段（endYear 2159）
        expect(defaultDayunCount(periods, [event('2150')], 2020)).toBe(16);
    });

    it('段数不足 100 岁时全展示', () => {
        const few = periods.slice(0, 3);
        expect(defaultDayunCount(few, [], 2020)).toBe(3);
    });

    it('空大运返回 0', () => {
        expect(defaultDayunCount([], [], 2020)).toBe(0);
    });
});

describe('生平时间轴 · 减少大运的下限', () => {
    const event = (ref: string): LifeEvent => ({ kind: 'liunian', ref, ganZhi: '甲子', text: 'x' });
    const periods = Array.from({ length: 20 }, (_, i) => ({ startAge: 1 + i * 10, endYear: 2000 + i * 10 + 9 }));

    it('没有记录时至少留 1 段，且不低于当前年份所在段', () => {
        // currentYear 2020 → 首个 endYear >= 2020 的是第 3 段（endYear 2029）
        expect(minDayunCount(periods, [], 2020)).toBe(3);
        expect(minDayunCount(periods, [], 1990)).toBe(1);
    });

    it('有记录的段不能被收起来', () => {
        // 2150 落在第 16 段（endYear 2159）
        expect(minDayunCount(periods, [event('2150')], 2020)).toBe(16);
    });

    it('下限不会超过总段数', () => {
        expect(minDayunCount(periods, [event('9999')], 2020)).toBe(20);
    });

    it('空大运返回 0', () => {
        expect(minDayunCount([], [], 2020)).toBe(0);
    });
});
