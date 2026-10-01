import { describe, expect, it } from 'vitest';
import { compareBaziCase } from './caseSort';
import type { BaziCase } from '../../../services/baziCaseService';

const makeCase = (over: Partial<BaziCase>): BaziCase => ({
    id: 'id',
    name: '测试',
    gender: 'male',
    birth_date: '2000-01-01T00:00:00.000Z',
    tags: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...over,
});

describe('八字案例字段排序', () => {
    it('年龄升序：年纪小的在前', () => {
        const younger = makeCase({ birth_date: '2010-01-01T00:00:00.000Z' });
        const older = makeCase({ birth_date: '2000-01-01T00:00:00.000Z' });
        expect(compareBaziCase(younger, older, 'age')).toBeLessThan(0);
    });

    it('分组按第一个 tag 的中文序比较', () => {
        const parent = makeCase({ tags: ['父母'] });
        const friend = makeCase({ tags: ['朋友'] });
        expect(compareBaziCase(parent, friend, 'group')).toBeLessThan(0);
    });

    it('性别：男在前、女在后，无标签案例不参与该字段', () => {
        const male = makeCase({ gender: 'male' });
        const female = makeCase({ gender: 'female' });
        expect(compareBaziCase(male, female, 'gender')).toBeLessThan(0);
        expect(compareBaziCase(male, female, 'unknown-field')).toBe(0);
    });
});
