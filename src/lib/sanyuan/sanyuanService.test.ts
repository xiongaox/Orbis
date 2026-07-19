import { describe, expect, it } from 'vitest';
import {
    analyzeSanYuanPalace,
    DIRECTIONS,
    calculateSanYuanChart,
    getHumanStarRelation,
    getNineStarName,
    getYuanPhaseDefault,
    isBigXuanKongZeroGod,
    isFourAuspiciousStar,
    toChineseNumeral,
} from './index';

describe('三元天星排盘', () => {
    it('按 PDF 盘例计算九运壬山丙向下卦', () => {
        const chart = calculateSanYuanChart({
            mountain: '壬',
            facing: '丙',
            yun: 9,
            panType: 'xia',
            yuanPhase: 'lower',
        });

        expect(chart.header).toMatchObject({
            directionLabel: '壬山丙向',
            mountainStart: 5,
            facingStart: 4,
            bigXuanKongStart: 2,
            bigXuanKongFlight: '逆飞',
            mountainFlight: '顺飞',
            facingFlight: '逆飞',
        });
        expect(chart.palaces.Xun).toMatchObject({
            bigXuanKong: 3,
            yunStar: 8,
            mountainStar: 4,
            facingStar: 5,
            earthStar: 6,
            waterStar: 6,
            heavenStar: 2,
        });
        expect(chart.palaces.Li).toMatchObject({
            bigXuanKong: 7,
            yunStar: 4,
            mountainStar: 9,
            facingStar: 9,
            earthStar: 8,
            waterStar: 5,
            heavenStar: 8,
        });
    });

    it('按 PDF 盘例计算八运辰山戌向替卦', () => {
        const chart = calculateSanYuanChart({
            mountain: '辰',
            facing: '戌',
            yun: 8,
            panType: 'ti',
            yuanPhase: 'lower',
        });

        expect(chart.header).toMatchObject({
            mountainStart: 9,
            facingStart: 7,
            mountainUsesReplacement: true,
            facingUsesReplacement: true,
        });
        expect(chart.palaces.Qian).toMatchObject({
            bigXuanKong: 7,
            yunStar: 9,
            mountainStar: 1,
            facingStar: 8,
            earthStar: 4,
            waterStar: 6,
            heavenStar: 4,
        });
    });

    it('支持全部 24 山向、1 至 9 运及两种盘型', () => {
        for (const direction of DIRECTIONS) {
            for (let yun = 1; yun <= 9; yun += 1) {
                for (const panType of ['xia', 'ti'] as const) {
                    const chart = calculateSanYuanChart({
                        mountain: direction.mountain,
                        facing: direction.facing,
                        yun,
                        panType,
                        yuanPhase: getYuanPhaseDefault(yun),
                    });

                    expect(Object.values(chart.palaces)).toHaveLength(8);
                    expect(chart.header.panType).toBe(panType);
                }
            }
        }
    });

    it('五运的上元与下元会改变大玄空顺逆', () => {
        const upper = calculateSanYuanChart({
            mountain: '壬',
            facing: '丙',
            yun: 5,
            panType: 'xia',
            yuanPhase: 'upper',
        });
        const lower = calculateSanYuanChart({
            mountain: '壬',
            facing: '丙',
            yun: 5,
            panType: 'xia',
            yuanPhase: 'lower',
        });

        expect(upper.header.bigXuanKongFlight).toBe('顺飞');
        expect(lower.header.bigXuanKongFlight).toBe('逆飞');
        expect(upper.palaces.Qian.bigXuanKong).toBe(3);
        expect(lower.palaces.Qian.bigXuanKong).toBe(1);
    });

    it('按元期标出大玄空零神，并按四吉星标出三才数', () => {
        expect(isBigXuanKongZeroGod(1, 'lower')).toBe(true);
        expect(isBigXuanKongZeroGod(4, 'lower')).toBe(true);
        expect(isBigXuanKongZeroGod(6, 'lower')).toBe(false);
        expect(isBigXuanKongZeroGod(6, 'upper')).toBe(true);
        expect(isBigXuanKongZeroGod(4, 'upper')).toBe(false);

        expect([1, 2, 6, 8].every(isFourAuspiciousStar)).toBe(true);
        expect([3, 4, 5, 7].some(isFourAuspiciousStar)).toBe(false);
    });

    it('盘面辅助数字使用简体中文数字', () => {
        expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(toChineseNumeral)).toEqual([
            '一', '二', '三', '四', '五', '六', '七', '八', '九',
        ]);
    });

    it('提供九星名称与人子八宅提示', () => {
        expect([1, 2, 3, 4, 5, 6, 7, 8].map(getNineStarName)).toEqual([
            '贪狼', '巨门', '禄存', '文曲', '廉贞', '武曲', '破军', '辅弼',
        ]);
        expect([1, 2, 3, 4, 5, 6, 7, 8].map(getHumanStarRelation)).toEqual([
            '生气', '天医', '祸害', '六煞', '五鬼', '延年', '绝命', '伏位',
        ]);
    });

    it('将九运壬山丙向盘转为可核验的宫位研判', () => {
        const chart = calculateSanYuanChart({
            mountain: '壬',
            facing: '丙',
            yun: 9,
            panType: 'xia',
            yuanPhase: 'lower',
        });
        const xun = analyzeSanYuanPalace(chart, 'Xun');
        const li = analyzeSanYuanPalace(chart, 'Li');

        expect(xun.talents).toMatchObject({
            earthMother: { title: '地母', alias: '地母翻卦', value: 6, starName: '武曲' },
            heavenFather: { title: '天父', alias: '辅星水法', value: 6, starName: '武曲' },
            humanChild: { title: '人子', alias: '天星阳宅', value: 2, starName: '巨门', relation: '天医' },
            fourAuspiciousCount: 3,
        });
        expect(xun.timing).toMatchObject({
            mountainAtCurrentYun: false,
            facingAtCurrentYun: false,
        });
        expect(xun.verification.level).toBe('verify');

        expect(li.timing).toMatchObject({
            mountainStar: 9,
            facingStar: 9,
            mountainAtCurrentYun: true,
            facingAtCurrentYun: true,
        });
        expect(li.verification.level).toBe('priority');
    });

    it('宫位研判始终保留峦头、天父与人子的核验边界', () => {
        const chart = calculateSanYuanChart({
            mountain: '壬',
            facing: '丙',
            yun: 9,
            panType: 'xia',
            yuanPhase: 'lower',
        });
        const analysis = analyzeSanYuanPalace(chart, 'Qian');
        const allGuidance = [
            ...analysis.verification.checklist,
            ...analysis.verification.actionTips,
            analysis.talents.heavenFather.guidance,
            analysis.talents.humanChild.guidance,
        ].join(' ');

        expect(allGuidance).toContain('峦头');
        expect(analysis.talents.heavenFather.guidance).toContain('水');
        expect(analysis.talents.heavenFather.guidance).toContain('向星');
        expect(analysis.talents.humanChild.guidance).toContain('长期坐卧');
        expect(analysis.talents.humanChild.guidance).toContain('活动');
    });

    it('八宫均产生七组数，中宫不属于计算结果', () => {
        const chart = calculateSanYuanChart({
            mountain: '壬',
            facing: '丙',
            yun: 9,
            panType: 'xia',
            yuanPhase: 'lower',
        });

        expect(Object.keys(chart.palaces)).toHaveLength(8);
        expect('center' in chart.palaces).toBe(false);
        for (const palace of Object.values(chart.palaces)) {
            expect([
                palace.bigXuanKong,
                palace.yunStar,
                palace.mountainStar,
                palace.facingStar,
                palace.earthStar,
                palace.waterStar,
                palace.heavenStar,
            ]).toHaveLength(7);
        }
    });
});
