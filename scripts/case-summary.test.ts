import { describe, expect, it } from 'vitest';
import { extractCaseSummary } from './case-summary';

describe('extractCaseSummary', () => {
    it('八字：去掉时区并补零', () => {
        expect(extractCaseSummary('# 标题\n\n命主生辰: 1999/08/20 8:00 (GMT+8)\n日主: 甲木\n', 'bazi'))
            .toBe('1999/08/20 08:00');
        expect(extractCaseSummary('命主生辰: 1989/06/09 0:00 (GMT+9)\n日主: 庚金\n', 'bazi'))
            .toBe('1989/06/09 00:00');
    });

    it('奇门：去掉局数与秒，缺分按 0 补', () => {
        expect(extractCaseSummary('**公元**：2008年2月20日18时10分43秒 阳3局', 'qimen'))
            .toBe('2008/02/20 18:10');
        expect(extractCaseSummary('**公元**：2008年12月19日16时 阴1局', 'qimen'))
            .toBe('2008/12/19 16:00');
    });

    it('缺失时间源时回退为未知文案', () => {
        expect(extractCaseSummary('# 标题\n\n性别: 坤造\n', 'bazi')).toBe('未知八字');
        expect(extractCaseSummary('# 标题\n\n干支：甲子年\n', 'qimen')).toBe('未知时间');
    });
});
