import { describe, expect, it } from 'vitest';
import { allTikuVolumes, pickDailyTiku, todayKey } from './dailyTiku';

describe('pickDailyTiku', () => {
    it('同一天多次调用抽到同一卷（当天固定）', () => {
        const a = pickDailyTiku('2026-10-22');
        const b = pickDailyTiku('2026-10-22');
        expect(a?.volume.id).toBe(b?.volume.id);
    });

    it('候选池跨全部题库汇总，且抽中的卷必在池内', () => {
        const pool = allTikuVolumes();
        expect(pool.length).toBeGreaterThan(0);
        const pick = pickDailyTiku('2026-10-22');
        expect(pool.some((p) => p.volume.id === pick?.volume.id)).toBe(true);
    });

    it('连续多天能覆盖到不同卷（不是永远同一题）', () => {
        const ids = new Set(
            ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26']
                .map((d) => pickDailyTiku(d)?.volume.id),
        );
        expect(ids.size).toBeGreaterThan(1);
    });

    it('todayKey 输出本地 YYYY-MM-DD', () => {
        expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
});

describe('pickDailyTiku 换一题', () => {
    it('offset 顺延时取到不同命例卷', () => {
        const a = pickDailyTiku('2026-10-22', 0);
        const b = pickDailyTiku('2026-10-22', 1);
        expect(a?.volume.id).not.toBe(b?.volume.id);
    });

    it('offset 绕回池长度时与默认题一致（环形）', () => {
        const pool = allTikuVolumes();
        expect(pickDailyTiku('2026-10-22', pool.length)?.volume.id).toBe(
            pickDailyTiku('2026-10-22', 0)?.volume.id,
        );
    });
});
