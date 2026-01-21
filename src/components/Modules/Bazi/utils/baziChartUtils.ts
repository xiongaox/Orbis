/**
 * BaziChart 辅助函数
 * 从 BaziChart.tsx 提取的计算逻辑
 */
import type { HiddenStem } from '../../../../types/bazi';
import {
    DI_ZHI_CANG_GAN,
    SHI_SHEN,
    NA_YIN,
    SHI_ER_ZHANG_SHENG,
    TIAN_GAN_WU_XING,
    DI_ZHI_WU_XING,
} from '../../../../lib/xuan-bazi/maps';
import { getXunKong } from '../../../../lib/xuan-bazi/utils';

/**
 * 获取五行
 */
export function getElement(char: string): string {
    return TIAN_GAN_WU_XING[char] || DI_ZHI_WU_XING[char] || '';
}

export interface PillarDetails {
    tianganShiShen: string;
    zanggan: HiddenStem[];
    diShi: string;
    ziZuo: string;
    kongWang: string;
    naYin: string;
}

/**
 * 动态计算柱的详细信息
 * 对于大运/流年：自坐使用日干查地支
 */
export function computePillarDetails(ganZhi: string, dayGan: string): PillarDetails {
    if (!ganZhi || ganZhi.length < 2) {
        return { tianganShiShen: '', zanggan: [], diShi: '', ziZuo: '', kongWang: '', naYin: '' };
    }

    const tiangan = ganZhi[0];
    const dizhi = ganZhi[1];

    const tianganShiShen = SHI_SHEN[dayGan + tiangan] || '';

    const hideGans = DI_ZHI_CANG_GAN[dizhi] || [];
    const zanggan: HiddenStem[] = hideGans.map((gan: string) => ({
        gan,
        shiShen: SHI_SHEN[dayGan + gan] || '',
        element: getElement(gan)
    }));

    const diShi = SHI_ER_ZHANG_SHENG[dayGan + dizhi] || '';
    const ziZuo = SHI_ER_ZHANG_SHENG[tiangan + dizhi] || '';
    const naYin = NA_YIN[ganZhi] || '';
    const kongWang = getXunKong(ganZhi);

    return { tianganShiShen, zanggan, diShi, ziZuo, kongWang, naYin };
}
