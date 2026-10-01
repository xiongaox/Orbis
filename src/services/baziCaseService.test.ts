import { describe, expect, it, vi } from 'vitest';
import { baziCaseService } from './baziCaseService';

// listCases 的排序契约依赖 store 返回顺序，这里固定为「sort_order/更新时间序」以复现线上的原始顺序
vi.mock('./localPrivateStore', () => ({
    localPrivateStore: {
        list: vi.fn(async () => [
            { payload: { id: 'a', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-06-01T00:00:00.000Z' } },
            { payload: { id: 'b', created_at: '2026-03-01T00:00:00.000Z', updated_at: '2026-05-01T00:00:00.000Z' } },
            { payload: { id: 'c', created_at: '2026-02-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' } },
        ]),
    },
}));

describe('baziCaseService.getCases', () => {
    it('按创建时间倒序返回，最新新建在前（拖拽手动排序已移除）', async () => {
        const cases = await baziCaseService.getCases();
        expect(cases.map((c) => c.id)).toEqual(['b', 'c', 'a']);
    });
});
