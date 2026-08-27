import { describe, expect, it } from 'vitest';
import { parseQimenImportData } from './qimenImportUtils';

describe('奇门案例导入', () => {
    it('支持任务附件使用的中文字段', () => {
        const [caseInput] = parseQimenImportData([
            {
                '标题': '妈的健康问题',
                '占测时间': '2026-08-24 14:03',
                '分类': '疾病身体',
                '事情描述': '午未临空，申年对宫遇死门',
                '事件反馈': '',
                '案例断法': '',
            },
        ]);

        expect(caseInput).toMatchObject({
            title: '妈的健康问题',
            category: 'health',
            description: '午未临空，申年对宫遇死门',
        });
        expect(Number.isNaN(new Date(caseInput.test_date).getTime())).toBe(false);
    });
});
