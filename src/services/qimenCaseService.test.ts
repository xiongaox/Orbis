import { describe, expect, it, vi } from 'vitest';
import { qimenCaseService } from './qimenCaseService';

// getCases 的排序契约依赖 store 返回顺序，这里固定为「更新时间倒序」以复现线上的原始顺序
vi.mock('./localPrivateStore', () => ({
    localPrivateStore: {
        list: vi.fn(async () => [
            { payload: { id: 'a', title: '旧案例', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-06-01T00:00:00.000Z' } },
            { payload: { id: 'b', title: '新案例', created_at: '2026-03-01T00:00:00.000Z', updated_at: '2026-05-01T00:00:00.000Z' } },
            { payload: { id: 'c', title: '中案例', created_at: '2026-02-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' } },
        ]),
    },
}));

describe('qimenCaseService.getCases', () => {
    it('按创建时间倒序返回，最新创建在前', async () => {
        const cases = await qimenCaseService.getCases();
        expect(cases.map((c) => c.id)).toEqual(['b', 'c', 'a']);
    });
});
