import { describe, expect, it, vi } from 'vitest';

const settings = new Map<string, unknown>();
const records = new Map<string, { payload: Record<string, unknown> }>();

vi.mock('../services/appSettingStore', () => ({
    readSetting: (k: string, fb: unknown) => (settings.has(k) ? settings.get(k) : fb),
    writeSetting: (k: string, v: unknown) => { settings.set(k, v); },
}));
vi.mock('../services/localPrivateStore', () => ({
    localPrivateStore: {
        put: async (type: string, payload: Record<string, unknown>, id: string) => {
            records.set(`${type}:${id}`, { payload });
            return { id, type, payload };
        },
        get: async (type: string, id: string) => records.get(`${type}:${id}`) ?? null,
    },
}));

import {
    seedDemoCases,
    DEMO_BAZI_CASE,
    DEMO_BAZI_CASE_ID,
    DEMO_QIMEN_CASE,
    DEMO_QIMEN_CASE_ID,
} from './demoCases';

const qimenRecord = () => records.get(`qimen_case:${DEMO_QIMEN_CASE_ID}`)?.payload;

describe('内置示例案例', () => {
    it('首次启动写入两条示例，用固定 id，标记为当前版本号', async () => {
        settings.clear(); records.clear();
        await seedDemoCases();
        expect(records.has(`bazi_case:${DEMO_BAZI_CASE_ID}`)).toBe(true);
        expect(records.has(`qimen_case:${DEMO_QIMEN_CASE_ID}`)).toBe(true);
        // 标记是版本数字（旧版是 boolean true，等价于版本 1）
        expect(settings.get('demo_cases_seeded')).toBe(2);
    });

    it('用户删掉示例后不会被重新塞回来', async () => {
        settings.clear(); records.clear();
        await seedDemoCases();
        records.clear(); // 模拟用户删光
        await seedDemoCases();
        expect(records.size).toBe(0);
    });

    it('旧版标记（boolean true）+ 旧三条形态：升级为记录流且保留创建时间', async () => {
        settings.clear(); records.clear();
        // 模拟 v1 时代的库存量：奇门示例仍是三条整段
        records.set(`qimen_case:${DEMO_QIMEN_CASE_ID}`, {
            payload: { dialog_lines: [{ kind: 'q', text: 'x' }, { kind: 'a', text: 'y' }, { kind: 'r', text: 'z' }], created_at: '2026-10-20T00:00:00.000Z' },
        });
        settings.set('demo_cases_seeded', true);

        await seedDemoCases();
        // 奇门示例被升级为记录流（13 条），创建时间保留
        const upgraded = qimenRecord();
        expect(upgraded?.dialog_lines).toHaveLength(13);
        expect(upgraded?.created_at).toBe('2026-10-20T00:00:00.000Z');
        // 标记推进到当前版本，后续不再触发
        expect(settings.get('demo_cases_seeded')).toBe(2);
    });

    it('用户编辑过示例（非旧三条形态）：升级不覆盖', async () => {
        settings.clear(); records.clear();
        records.set(`qimen_case:${DEMO_QIMEN_CASE_ID}`, {
            payload: { dialog_lines: [{ kind: 'q', text: '用户自己的记录' }], created_at: '2026-10-21T00:00:00.000Z' },
        });
        settings.set('demo_cases_seeded', true);

        await seedDemoCases();
        const untouched = qimenRecord();
        const untouchedLines = untouched?.dialog_lines as Array<{ kind: string; text: string }> | undefined;
        expect(untouchedLines).toHaveLength(1);
        expect(untouchedLines?.[0]).toMatchObject({ kind: 'q', text: '用户自己的记录' });
        // 标记仍要推进，避免下次重复判定
        expect(settings.get('demo_cases_seeded')).toBe(2);
    });

    /**
     * 示例的意义是「让新用户知道案例该长什么样」，
     * 空壳案例反而会误导，所以完整性必须由测试守住。
     */
    it('八字示例带完整生平与排盘数据', () => {
        expect(DEMO_BAZI_CASE.life_events).toHaveLength(21);
        expect(DEMO_BAZI_CASE.life_events?.[0]).toMatchObject({
            kind: 'liunian',
            ref: '1935',
            ganZhi: '乙亥',
        });
        expect(DEMO_BAZI_CASE.bazi_data?.year_pillar).toBe('庚午');
        // 时间是 ISO 字符串，与库里新建案例的写库格式一致
        expect(DEMO_BAZI_CASE.birth_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('奇门示例为问答记录流，断法跟在回答之后', () => {
        const kinds: string[] = DEMO_QIMEN_CASE.dialog_lines?.map((line) => line.kind) ?? [];
        // 记录流与作者桌面端拆分一致：13 条，首条提问、末条断法收尾
        expect(kinds).toHaveLength(13);
        expect(kinds[0]).toBe('q');
        expect(kinds[kinds.length - 1]).toBe('r');
        expect(DEMO_QIMEN_CASE.description).toContain('看看什么时间能嫁人');
        expect(DEMO_QIMEN_CASE.feedback).toContain('大伏吟局');
        expect(DEMO_QIMEN_CASE.analysis).toContain('日干丙下临丙');
        // 断法是多条短段而非整段聚合
        const rLines = DEMO_QIMEN_CASE.dialog_lines?.filter((line) => line.kind === 'r') ?? [];
        expect(rLines.length).toBeGreaterThanOrEqual(4);
        expect(DEMO_QIMEN_CASE.category).toBe('love');
        expect(DEMO_QIMEN_CASE.test_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
});
