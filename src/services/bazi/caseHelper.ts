/**
 * 简化版八字计算，用于 Case 数据填充
 * (从废弃的 baziUtils.ts 迁移而来)
 * 
 * 使用 xuan-bazi 库作为底层计算引擎
 */

import { Solar } from 'lunar-typescript';
import {
    DI_ZHI_CANG_GAN,
    SHI_SHEN,
    NA_YIN,
    SHI_ER_ZHANG_SHENG,
    KONG_WANG,
} from '../../lib/xuan-bazi/maps';
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

        // 计算主星 (十神) - 使用 xuan-bazi 的 SHI_SHEN 映射
        const getShiShen = (gan: string) => SHI_SHEN[dayGan + gan] || '';
        const mainStars = [
            getShiShen(bazi.getYearGan()),
            getShiShen(bazi.getMonthGan()),
            '日主',
            getShiShen(bazi.getTimeGan()),
        ];

        // 计算藏干 - 使用 xuan-bazi 的 DI_ZHI_CANG_GAN 映射
        const getHiddenStems = (zhi: string) => {
            const stems = DI_ZHI_CANG_GAN[zhi] || [];
            return stems.map(stem => ({
                stem,
                god: SHI_SHEN[dayGan + stem] || ''
            }));
        };

        const hiddenStems = [
            getHiddenStems(bazi.getYearZhi()),
            getHiddenStems(bazi.getMonthZhi()),
            getHiddenStems(bazi.getDayZhi()),
            getHiddenStems(bazi.getTimeZhi()),
        ];

        // 计算星运 (十二长生) - 使用 xuan-bazi 的 SHI_ER_ZHANG_SHENG 映射
        const getStarLuck = (zhi: string) => SHI_ER_ZHANG_SHENG[dayGan + zhi] || '';
        const starLucks = [
            getStarLuck(bazi.getYearZhi()),
            getStarLuck(bazi.getMonthZhi()),
            getStarLuck(bazi.getDayZhi()),
            getStarLuck(bazi.getTimeZhi()),
        ];

        // 计算自坐
        const getSelfSitting = (gan: string, zhi: string) => SHI_ER_ZHANG_SHENG[gan + zhi] || '';
        const selfSitting = [
            getSelfSitting(bazi.getYearGan(), bazi.getYearZhi()),
            getSelfSitting(bazi.getMonthGan(), bazi.getMonthZhi()),
            getSelfSitting(bazi.getDayGan(), bazi.getDayZhi()),
            getSelfSitting(bazi.getTimeGan(), bazi.getTimeZhi()),
        ];

        // 纳音 - 使用 xuan-bazi 的 NA_YIN 映射
        const naYin = [
            NA_YIN[yearPillar] || '',
            NA_YIN[monthPillar] || '',
            NA_YIN[dayPillar] || '',
            NA_YIN[hourPillar] || '',
        ];

        // 空亡 - 使用 xuan-bazi 的 KONG_WANG 映射
        const kongWang = [
            KONG_WANG[yearPillar] || '',
            KONG_WANG[monthPillar] || '',
            KONG_WANG[dayPillar] || '',
            KONG_WANG[hourPillar] || '',
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

