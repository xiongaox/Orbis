import { beforeEach, describe, expect, it, vi } from 'vitest';

// 非 Tauri 环境：localPrivateStore 走内存回退，迁移链路（getCases→updateCase）可闭环验证
vi.stubGlobal('window', undefined);
vi.stubGlobal('indexedDB', undefined);

import { localPrivateStore } from './localPrivateStore';
import { qimenCaseService } from './qimenCaseService';
import { migrateQimenTitlesIntoDescription } from './qimenCaseService';
import { preloadAppSettings, writeSetting } from './appSettingStore';

const FLAG = 'qimen_title_desc_migrated';

const baseInput = { test_date: '2026-10-12T00:00:00.000Z', category: 'work' as const };

describe('migrateQimenTitlesIntoDescription', () => {
    beforeEach(async () => {
        // preload 让 readSetting 生效；随后重置迁移标志，保证每轮都会执行迁移
        await preloadAppSettings();
        writeSetting(FLAG, false);
        await localPrivateStore.clear('qimen_case');
    });

    it('空正文案例的标题补进 description，已有正文与记录流的案例不动', async () => {
        await qimenCaseService.createCase({ ...baseInput, title: '空正文案例' });
        await qimenCaseService.createCase({ ...baseInput, title: '已有正文', description: '原有提问' });
        await qimenCaseService.createCase({
            ...baseInput,
            title: '已有记录流',
            dialog_lines: [{ kind: 'q', text: '原有提问' }],
        });

        const migrated = await migrateQimenTitlesIntoDescription();
        expect(migrated).toBe(1);

        const cases = await qimenCaseService.getCases();
        const byTitle = new Map(cases.map((c) => [c.title, c]));
        expect(byTitle.get('空正文案例')?.description).toBe('空正文案例');
        expect(byTitle.get('已有正文')?.description).toBe('原有提问');
        expect(byTitle.get('已有记录流')?.dialog_lines).toHaveLength(1);
    });

    it('幂等：第二次调用不再补写', async () => {
        await qimenCaseService.createCase({ ...baseInput, title: '待迁移' });
        expect(await migrateQimenTitlesIntoDescription()).toBe(1);
        expect(await migrateQimenTitlesIntoDescription()).toBe(0);
    });

    it('纯空白标题的案例跳过，不产生空正文', async () => {
        await qimenCaseService.createCase({ ...baseInput, title: '   ' });
        expect(await migrateQimenTitlesIntoDescription()).toBe(0);
    });
});
