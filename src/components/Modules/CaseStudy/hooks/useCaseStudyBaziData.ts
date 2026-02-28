import { useMemo } from 'react';
import { TIAN_GAN, DI_ZHI } from '../../../../lib/caseStudy/types';
import { parseBaziInfo, parseAllBaziInfo, extendDaYun, computePillarDetails } from '../../../../lib/caseStudy/parsers';
import type { BaziApiResponse, DaYunPeriod, PillarData } from '../../../../types/bazi';
import type { CaseItem } from './useCaseStudy';

const getBaziData = (baziInfo: ReturnType<typeof parseBaziInfo>): BaziApiResponse | null => {
    if (baziInfo.baziData) return baziInfo.baziData;
    if (baziInfo.pillars.length < 4) return null;

    const dayGan = baziInfo.pillars[2].tiangan;

    // 构造 Pillars
    const pillars: PillarData[] = baziInfo.pillars.map((p) => {
        const details = computePillarDetails(p.ganZhi, dayGan);
        return {
            label: p.label,
            ganZhi: p.ganZhi,
            tiangan: p.tiangan,
            dizhi: p.dizhi,
            tianganElement: '',
            dizhiElement: '',
            tianganShiShen: details.tianganShiShen,
            dizhiShiShen: [],
            zanggan: details.zanggan,
            diShi: details.diShi,
            naYin: details.naYin,
            kongWang: details.kongWang,
            ziZuo: details.ziZuo,
        };
    });

    let birthYear = baziInfo.birthYear;
    if (!birthYear) {
        const currentYear = new Date().getFullYear();
        birthYear = currentYear - 30;
    }

    let fullDaYun: string[] = [];
    if (baziInfo.daYun.length > 0) {
        const yearGan = pillars[0].tiangan;
        fullDaYun = extendDaYun(baziInfo.daYun[0], baziInfo.gender, yearGan, 14);
    } else if (baziInfo.gender && pillars.length >= 2) {
        const yearGan = pillars[0].tiangan;
        const monthPillar = pillars[1].ganZhi;
        const yangGan = ['甲', '丙', '戊', '庚', '壬'];
        const isYangYear = yangGan.includes(yearGan);
        const isMale = baziInfo.gender === '乾造';
        const isForward = (isYangYear && isMale) || (!isYangYear && !isMale);
        const ganIndex = TIAN_GAN.indexOf(monthPillar[0]);
        const zhiIndex = DI_ZHI.indexOf(monthPillar[1]);

        let nextGanIndex, nextZhiIndex;
        if (isForward) {
            nextGanIndex = (ganIndex + 1) % 10;
            nextZhiIndex = (zhiIndex + 1) % 12;
        } else {
            nextGanIndex = (ganIndex - 1 + 10) % 10;
            nextZhiIndex = (zhiIndex - 1 + 12) % 12;
        }
        const firstDaYun = TIAN_GAN[nextGanIndex] + DI_ZHI[nextZhiIndex];
        fullDaYun = extendDaYun(firstDaYun, baziInfo.gender, yearGan, 14);
    }

    const startYunAge = 1;
    const daYun: DaYunPeriod[] = fullDaYun.map((ganZhi, i) => {
        const index = i + 1;
        const startAge = startYunAge + i * 10;
        const endAge = startAge + 9;
        const startYear = birthYear! + startAge - 1;
        const endYear = birthYear! + endAge - 1;

        return {
            index, startYear, endYear, startAge, endAge, ganZhi,
            tiangan: ganZhi[0], dizhi: ganZhi[1],
        };
    });

    const liuNian = [];
    if (birthYear) {
        for (let i = 0; i < 100; i++) {
            const year = birthYear + i;
            const offset = year - 1984;
            const ganIndex = (0 + offset) % 10;
            const zhiIndex = (0 + offset) % 12;
            const normalizedGanIndex = ganIndex >= 0 ? ganIndex : ganIndex + 10;
            const normalizedZhiIndex = zhiIndex >= 0 ? zhiIndex : zhiIndex + 12;
            const gan = TIAN_GAN[normalizedGanIndex];
            const zhi = DI_ZHI[normalizedZhiIndex];

            const age = i + 1;
            const currentDaYun = daYun.find(dy => age >= dy.startAge && age <= dy.endAge);

            liuNian.push({
                year,
                age,
                ganZhi: gan + zhi,
                tiangan: gan,
                dizhi: zhi,
                dayunIndex: currentDaYun ? currentDaYun.index : -1,
            });
        }
    }

    return {
        solarDate: '',
        lunarDate: '',
        zodiac: '',
        gender: baziInfo.gender === '乾造' ? 'male' : 'female',
        pillars,
        yunInfo: { startYear: birthYear || 0, startMonth: 0, startDay: 0, startSolarDate: '', isForward: true },
        daYun,
        liuNian,
        currentXiaoYun: [],
        extra: { taiYuan: '', mingGong: '', shenGong: '' },
    };
};

export function useCaseStudyBaziData(activeCase: CaseItem | null | undefined, activeChartIndex: number) {
    const content = activeCase?.content;
    return useMemo(() => {
        if (!content) return null;
        const infos = parseAllBaziInfo(content);
        const index = activeChartIndex >= infos.length ? 0 : activeChartIndex;
        const info = infos[index] || parseBaziInfo(content);
        return getBaziData(info);
    }, [content, activeChartIndex]);
}
