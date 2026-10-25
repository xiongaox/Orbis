
import {
    TIAN_GAN,
    DI_ZHI,
    DI_ZHI_CANG_GAN,
    NA_YIN,
    KONG_WANG,
    SHI_SHEN,
} from '../maps';

/**
 * 获取天干索引（0-9）
 */
export function getTianGanIndex(gan: string): number {
    return TIAN_GAN.indexOf(gan as typeof TIAN_GAN[number]);
}

/**
 * 获取地支索引（0-11）
 */
export function getDiZhiIndex(zhi: string): number {
    return DI_ZHI.indexOf(zhi as typeof DI_ZHI[number]);
}

/**
 * 根据索引获取天干
 */
export function getTianGanByIndex(index: number): string {
    return TIAN_GAN[((index % 10) + 10) % 10];
}

/**
 * 根据索引获取地支
 */
export function getDiZhiByIndex(index: number): string {
    return DI_ZHI[((index % 12) + 12) % 12];
}

/**
 * 获取地支的藏干
 */
export function getDiZhiCangGan(zhi: string): string[] {
    return DI_ZHI_CANG_GAN[zhi] || [];
}

/**
 * 获取干支的纳音
 */
export function getNaYin(ganZhi: string): string {
    return NA_YIN[ganZhi] || '';
}

/**
 * 获取干支的空亡
 */
export function getKongWang(ganZhi: string): string {
    return KONG_WANG[ganZhi] || '';
}

/**
 * 获取十神
 * @param dayGan 日干
 * @param target 目标天干或地支
 */
export function getShiShen(dayGan: string, target: string): string {
    return SHI_SHEN[dayGan + target] || '';
}

/**
 * 解析干支为天干和地支
 */
export function parseGanZhi(ganZhi: string): { gan: string; zhi: string } | null {
    if (!ganZhi || ganZhi.length !== 2) return null;
    return {
        gan: ganZhi[0],
        zhi: ganZhi[1],
    };
}

/**
 * 组合天干地支
 */
export function combineGanZhi(gan: string, zhi: string): string {
    return gan + zhi;
}

/**
 * 十神简称映射
 */
export const SHI_SHEN_ABBR: Record<string, string> = {
    '比肩': '比',
    '劫财': '劫',
    '食神': '食',
    '伤官': '伤',
    '偏财': '才',
    '正财': '财',
    '七杀': '杀',
    '正官': '官',
    '偏印': '枭',
    '正印': '印',
};

/**
 * 获取十神简称
 */
export function getShiShenAbbr(shiShen: string): string {
    return SHI_SHEN_ABBR[shiShen] || '';
}

/**
 * 获取旬空（getKongWang 的别名）
 * @param ganZhi 干支字符串
 * @returns 旬空字符串
 */
export const getXunKong = getKongWang;
