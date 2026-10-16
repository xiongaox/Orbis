import { describe, expect, it } from 'vitest';
import { getGanChangShengNote } from './qimenUtils';

describe('getGanChangShengNote（长生注记：长生位/行度/本宫状态反查）', () => {
    it('乙落乾宫：长生在午、逆行，戌亥得墓、死', () => {
        expect(getGanChangShengNote('乙', 6)).toEqual({
            yinYang: '阴',
            zhi: '午',
            dir: '逆行',
            zhiList: ['戌', '亥'],
            states: ['墓', '死'],
        });
    });

    it('阳干顺行、阴干逆行（长生位由表反查）', () => {
        expect(getGanChangShengNote('甲', 1)).toMatchObject({ yinYang: '阳', zhi: '亥', dir: '顺行' });
        expect(getGanChangShengNote('戊', 6)).toMatchObject({ yinYang: '阳', zhi: '寅', dir: '顺行' });
        expect(getGanChangShengNote('辛', 7)).toMatchObject({ yinYang: '阴', zhi: '子', dir: '逆行', states: ['临官'] });
        expect(getGanChangShengNote('癸', 3)).toMatchObject({ yinYang: '阴', zhi: '卯', dir: '逆行' });
    });

    it('中宫（5，寄坤）不返回注记，与盘面小字为空对齐', () => {
        expect(getGanChangShengNote('乙', 5)).toBeNull();
    });
});
