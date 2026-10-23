import { describe, expect, it, vi } from 'vitest';

const settings = new Map<string, unknown>();
const records = new Map<string, unknown>();

vi.mock('../services/appSettingStore', () => ({
    readSetting: (k: string, fb: unknown) => (settings.has(k) ? settings.get(k) : fb),
    writeSetting: (k: string, v: unknown) => { settings.set(k, v); },
}));
vi.mock('../services/localPrivateStore', () => ({
    localPrivateStore: {
        put: async (type: string, payload: Record<string, unknown>, id: string) => {
            records.set(`${type}:${id}`, payload);
            return { id, type, payload };
        },
    },
}));

import {
    seedDemoCases,
    DEMO_BAZI_CASE,
    DEMO_BAZI_CASE_ID,
    DEMO_QIMEN_CASE,
    DEMO_QIMEN_CASE_ID,
} from './demoCases';

describe('内置示例案例', () => {
    it('首次启动写入两条示例，用固定 id', async () => {
        settings.clear(); records.clear();
        await seedDemoCases();
        expect(records.has(`bazi_case:${DEMO_BAZI_CASE_ID}`)).toBe(true);
        expect(records.has(`qimen_case:${DEMO_QIMEN_CASE_ID}`)).toBe(true);
        expect(settings.get('demo_cases_seeded')).toBe(true);
    });

    it('用户删掉示例后不会被重新塞回来', async () => {
        settings.clear(); records.clear();
        await seedDemoCases();
        records.clear(); // 模拟用户删光
        await seedDemoCases();
        expect(records.size).toBe(0);
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

    it('奇门示例带完整正文，断法挂在回答之后', () => {
        expect(DEMO_QIMEN_CASE.description).toContain('看看什么时间能嫁人');
        expect(DEMO_QIMEN_CASE.feedback).toContain('大伏吟局');
        expect(DEMO_QIMEN_CASE.analysis).toContain('日干丙下临丙');
        // dialog_lines 与三段字段同源，且顺序为 问 → 答 → 断
        expect(DEMO_QIMEN_CASE.dialog_lines?.map((line) => line.kind)).toEqual(['q', 'a', 'r']);
        expect(DEMO_QIMEN_CASE.dialog_lines?.[0].text).toBe(DEMO_QIMEN_CASE.description);
        expect(DEMO_QIMEN_CASE.dialog_lines?.[2].text).toBe(DEMO_QIMEN_CASE.analysis);
        expect(DEMO_QIMEN_CASE.category).toBe('love');
        expect(DEMO_QIMEN_CASE.test_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
});
