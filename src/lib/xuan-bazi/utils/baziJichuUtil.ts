/**
 * 八字 - 基础工具函数
 * 移植自 Java 版本 xuan-utils-pro
 * @author 善待 (原作者)
 */

import {
    TIAN_GAN,
    DI_ZHI,
    TIAN_GAN_WU_XING,
    DI_ZHI_WU_XING,
    TIAN_GAN_YIN_YANG,
    DI_ZHI_CANG_GAN,
    NA_YIN,
    KONG_WANG,
    SHI_SHEN,
    SHI_ER_ZHANG_SHENG,
    DI_ZHI_SHENG_XIAO,
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
 * 获取天干的五行
 */
export function getTianGanWuXing(gan: string): string {
    return TIAN_GAN_WU_XING[gan] || '';
}

/**
 * 获取地支的五行
 */
export function getDiZhiWuXing(zhi: string): string {
    return DI_ZHI_WU_XING[zhi] || '';
}

/**
 * 获取天干的阴阳
 */
export function getTianGanYinYang(gan: string): string {
    return TIAN_GAN_YIN_YANG[gan] || '';
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
 * 获取干支的纳音五行
 */
export function getNaYinWuXing(ganZhi: string): string {
    const naYin = getNaYin(ganZhi);
    if (!naYin) return '';

    // 纳音最后一个字就是五行
    const lastChar = naYin[naYin.length - 1];
    const wuXingMap: Record<string, string> = {
        '金': '金', '木': '木', '水': '水', '火': '火', '土': '土',
    };
    return wuXingMap[lastChar] || '';
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
 * 获取十二长生
 * @param gan 天干
 * @param zhi 地支
 */
export function getShiErZhangSheng(gan: string, zhi: string): string {
    return SHI_ER_ZHANG_SHENG[gan + zhi] || '';
}

/**
 * 获取生肖
 */
export function getShengXiao(zhi: string): string {
    return DI_ZHI_SHENG_XIAO[zhi] || '';
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
 * 计算两个干支之间的索引差
 */
export function getGanZhiIndexDiff(ganZhi1: string, ganZhi2: string): number {
    const parsed1 = parseGanZhi(ganZhi1);
    const parsed2 = parseGanZhi(ganZhi2);
    if (!parsed1 || !parsed2) return 0;

    const ganDiff = getTianGanIndex(parsed2.gan) - getTianGanIndex(parsed1.gan);
    return ((ganDiff % 10) + 10) % 10;
}

/**
 * 根据干支索引获取下一个干支
 */
export function getNextGanZhi(ganZhi: string, offset: number = 1): string {
    const parsed = parseGanZhi(ganZhi);
    if (!parsed) return '';

    const ganIndex = getTianGanIndex(parsed.gan);
    const zhiIndex = getDiZhiIndex(parsed.zhi);

    return combineGanZhi(
        getTianGanByIndex(ganIndex + offset),
        getDiZhiByIndex(zhiIndex + offset)
    );
}

/**
 * 计算干支序号（甲子=0，乙丑=1，...，癸亥=59）
 */
export function getGanZhiIndex(ganZhi: string): number {
    const parsed = parseGanZhi(ganZhi);
    if (!parsed) return -1;

    const ganIndex = getTianGanIndex(parsed.gan);
    const zhiIndex = getDiZhiIndex(parsed.zhi);

    // 天干地支组合的规律：干支序号 = (天干索引 * 6 + 地支索引) % 60 的逆运算
    // 实际上需要找到满足 ganIndex = n % 10 且 zhiIndex = n % 12 的 n
    for (let n = 0; n < 60; n++) {
        if (n % 10 === ganIndex && n % 12 === zhiIndex) {
            return n;
        }
    }
    return -1;
}

/**
 * 根据干支序号获取干支
 */
export function getGanZhiByIndex(index: number): string {
    const normalizedIndex = ((index % 60) + 60) % 60;
    return combineGanZhi(
        getTianGanByIndex(normalizedIndex),
        getDiZhiByIndex(normalizedIndex)
    );
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
