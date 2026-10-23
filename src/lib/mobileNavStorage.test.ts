import { describe, expect, it, vi } from 'vitest';

// readSetting 依赖启动预热的内存缓存，这里直接替换成可控的内存 map，
// 只验证槽位过滤/去重/截断这套纯逻辑
const store = new Map<string, unknown>();
vi.mock('../services/appSettingStore', () => ({
    readSetting: (key: string, fallback: unknown) => (store.has(key) ? store.get(key) : fallback),
    writeSetting: (key: string, value: unknown) => { store.set(key, value); },
}));

import {
    DEFAULT_MOBILE_NAV_CASE_SLOTS,
    MOBILE_NAV_CASE_MAX_SLOTS,
    MOBILE_NAV_CASE_SLOTS_STORAGE_KEY,
    MOBILE_NAV_SLOTS_STORAGE_KEY,
    readMobileNavCaseSlots,
    readMobileNavSlots,
    writeMobileNavCaseSlots,
    writeMobileNavSlots,
} from './mobileNavStorage';

describe('移动端底栏槽位存储', () => {
    it('第二页默认槽位为 常识 · 八字案例 · 奇门案例', () => {
        store.clear();
        expect(readMobileNavCaseSlots()).toEqual(DEFAULT_MOBILE_NAV_CASE_SLOTS);
    });

    it('第二页槽位往返存取', () => {
        store.clear();
        writeMobileNavCaseSlots(['duanfa', 'qimen']);
        expect(store.get(MOBILE_NAV_CASE_SLOTS_STORAGE_KEY)).toEqual(['duanfa', 'qimen']);
        expect(readMobileNavCaseSlots()).toEqual(['duanfa', 'qimen']);
    });

    it('第二页过滤非法值并去重、按上限截断', () => {
        store.clear();
        // 'bazi' 同时是术数 ChartType，但在第二页是合法的分类槽；
        // 'liuyao' 不是案例分类，必须被滤掉
        store.set(MOBILE_NAV_CASE_SLOTS_STORAGE_KEY, ['bazi', 'liuyao', 'bazi', 'changshi', 'qimen', 'duanfa']);
        expect(readMobileNavCaseSlots()).toEqual(['bazi', 'changshi', 'qimen']);
        expect(readMobileNavCaseSlots()).toHaveLength(MOBILE_NAV_CASE_MAX_SLOTS);
    });

    it('题库是第二页合法分类槽（与断法/常识同级）', () => {
        store.clear();
        writeMobileNavCaseSlots(['tiku', 'duanfa']);
        expect(readMobileNavCaseSlots()).toEqual(['tiku', 'duanfa']);
    });

    it('第二页非法存储回退默认值', () => {
        store.clear();
        store.set(MOBILE_NAV_CASE_SLOTS_STORAGE_KEY, 'not-an-array');
        expect(readMobileNavCaseSlots()).toEqual(DEFAULT_MOBILE_NAV_CASE_SLOTS);
    });

    it('第一页仍只接受术数候选，不接受案例分类', () => {
        store.clear();
        writeMobileNavSlots(['bazi', 'qimen']);
        expect(readMobileNavSlots()).toEqual(['bazi', 'qimen']);
        // 'changshi' 是第一页非法值，会被滤掉
        store.set(MOBILE_NAV_SLOTS_STORAGE_KEY, ['changshi', 'bazi']);
        expect(readMobileNavSlots()).toEqual(['bazi']);
    });
});
