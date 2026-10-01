import { describe, expect, it } from 'vitest';
import { compareQimenCase } from './caseSort';
import type { QimenCase } from '../../../services/qimenCaseService';

const makeCase = (over: Partial<QimenCase>): QimenCase => ({
    id: 'id',
    title: '测试',
    test_date: '2026-01-01T12:00:00.000Z',
    category: 'work',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...over,
});

describe('奇门案例字段排序', () => {
    it('时间升序：早的在前，无效时间排最后', () => {
        const early = makeCase({ test_date: '2025-01-01T12:00:00.000Z' });
        const late = makeCase({ test_date: '2026-06-01T12:00:00.000Z' });
        expect(compareQimenCase(early, late, 'time')).toBeLessThan(0);

        const invalid = makeCase({ test_date: '' });
        expect(compareQimenCase(invalid, late, 'time')).toBeGreaterThan(0);
    });

    it('分类按中文名比较（工作事业 在 恋爱婚姻 前）', () => {
        const work = makeCase({ category: 'work' });
        const love = makeCase({ category: 'love' });
        expect(compareQimenCase(work, love, 'category')).toBeLessThan(0);
    });

    it('未知字段返回 0（不改变相对顺序）', () => {
        expect(compareQimenCase(makeCase({}), makeCase({}), 'unknown')).toBe(0);
    });
});
