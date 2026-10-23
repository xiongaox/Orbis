import { describe, expect, it } from 'vitest';
import { parseBaziImportData } from './baziImportUtils';
import { parseQimenImportData } from './qimenImportUtils';

/**
 * 完整备份格式的往返：导出时选「完整备份」得到的是内部字段，
 * 导入必须原样还原，不能把生平时间轴 / 正文对话流丢掉。
 */
describe('完整备份导入往返', () => {
    it('八字：保留 life_events 与 bazi_data', () => {
        const backup = [{
            id: 'demo-bazi-liangxiangrun',
            name: '【示例】梁湘润',
            gender: 'male',
            birth_date: '1930-04-20 05:00',
            tags: ['名人'],
            notes: '说明',
            bazi_data: { pillars: ['甲', '子'] },
            life_events: [
                { kind: 'dayun', ref: '1940', ganZhi: '庚辰', text: '入学' },
                { kind: 'liunian', ref: '1950', ganZhi: '庚寅', text: '迁居' },
            ],
        }];
        const parsed = parseBaziImportData(backup);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].life_events).toHaveLength(2);
        expect(parsed[0].life_events?.[0].text).toBe('入学');
        expect(parsed[0].bazi_data).toEqual({ pillars: ['甲', '子'] });
        expect(parsed[0].tags).toEqual(['名人']);
    });

    it('奇门：保留 dialog_lines 与 qimen_data', () => {
        const backup = [{
            title: '【示例】1970女性·恋爱婚姻',
            test_date: '2007-10-19 11:17',
            category: 'love',
            description: '女性，1970 年人',
            feedback: '已反馈',
            analysis: '断法正文',
            dialog_lines: [
                { kind: 'q', text: '问婚姻' },
                { kind: 'a', text: '答：可成' },
            ],
            qimen_data: { custom_ju: 0 },
            pai_pan_method: 'zhirun',
        }];
        const parsed = parseQimenImportData(backup);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].dialog_lines).toHaveLength(2);
        expect(parsed[0].category).toBe('love');
        expect(parsed[0].analysis).toBe('断法正文');
    });

    it('精简表格仍按中文字段解析（旧格式不受影响）', () => {
        const flat = [{ 姓名: '张三', 性别: '男', 出生时间: '1990-01-01 08:00', 标签: '朋友' }];
        const parsed = parseBaziImportData(flat);
        expect(parsed[0].name).toBe('张三');
        expect(parsed[0].gender).toBe('male');
    });
});
