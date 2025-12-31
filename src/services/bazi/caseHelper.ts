/**
 * 简化版八字计算，用于 Case 数据填充
 * (从废弃的 baziUtils.ts 迁移而来)
 */

// @ts-ignore
import { Solar } from 'lunar-javascript';
import { SHI_SHEN_MAP, ZANG_GAN_MAP, NA_YIN_MAP, CHANG_SHENG_MAP, getXunKong } from '../../utils/metaphysics';
import type { BaziChartData } from '../../types';

export function calculateBazi(birthDate: string, _gender: 'male' | 'female'): BaziChartData {
    try {
        const date = new Date(birthDate);
        const solar = Solar.fromYmdHms(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            0
        );
        const lunar = solar.getLunar();
        const bazi = lunar.getEightChar();

        const yearPillar = bazi.getYear();
        const monthPillar = bazi.getMonth();
        const dayPillar = bazi.getDay();
        const hourPillar = bazi.getTime();

        const dayGan = bazi.getDayGan();

        // 计算主星 (十神)
        const getShiShen = (gan: string) => SHI_SHEN_MAP[dayGan]?.[gan] || '';
        const mainStars = [
            getShiShen(bazi.getYearGan()),
            getShiShen(bazi.getMonthGan()),
            '日主',
            getShiShen(bazi.getTimeGan()),
        ];

        // 计算藏干
        const getHiddenStems = (zhi: string) => {
            const stems = ZANG_GAN_MAP[zhi] || [];
            return stems.map(stem => ({
                stem,
                god: SHI_SHEN_MAP[dayGan]?.[stem] || ''
            }));
        };

        const hiddenStems = [
            getHiddenStems(bazi.getYearZhi()),
            getHiddenStems(bazi.getMonthZhi()),
            getHiddenStems(bazi.getDayZhi()),
            getHiddenStems(bazi.getTimeZhi()),
        ];

        // 计算星运 (十二长生)
        const getStarLuck = (zhi: string) => CHANG_SHENG_MAP[dayGan]?.[zhi] || '';
        const starLucks = [
            getStarLuck(bazi.getYearZhi()),
            getStarLuck(bazi.getMonthZhi()),
            getStarLuck(bazi.getDayZhi()),
            getStarLuck(bazi.getTimeZhi()),
        ];

        // 计算自坐
        const getSelfSitting = (gan: string, zhi: string) => CHANG_SHENG_MAP[gan]?.[zhi] || '';
        const selfSitting = [
            getSelfSitting(bazi.getYearGan(), bazi.getYearZhi()),
            getSelfSitting(bazi.getMonthGan(), bazi.getMonthZhi()),
            getSelfSitting(bazi.getDayGan(), bazi.getDayZhi()),
            getSelfSitting(bazi.getTimeGan(), bazi.getTimeZhi()),
        ];

        // 纳音
        const naYin = [
            NA_YIN_MAP[yearPillar] || '',
            NA_YIN_MAP[monthPillar] || '',
            NA_YIN_MAP[dayPillar] || '',
            NA_YIN_MAP[hourPillar] || '',
        ];

        // 空亡
        const kongWang = [
            getXunKong(yearPillar),
            getXunKong(monthPillar),
            getXunKong(dayPillar),
            getXunKong(hourPillar),
        ];

        return {
            year_pillar: yearPillar,
            month_pillar: monthPillar,
            day_pillar: dayPillar,
            hour_pillar: hourPillar,
            main_stars: mainStars,
            hidden_stems: hiddenStems,
            star_lucks: starLucks,
            self_sitting: selfSitting,
            na_yin: naYin,
            kong_wang: kongWang,
            shen_sha: [], // 简化版不计算神煞
        };
    } catch (e) {
        console.error('calculateBazi error:', e);
        return {};
    }
}
