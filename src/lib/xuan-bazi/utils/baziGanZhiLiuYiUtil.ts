/**
 * 八字 - 干支留意工具
 * 移植自 Java 版本 BaZiGanZhiLiuYiUtil.java
 * @author 善待 (原作者)
 * 
 * 计算天干地支之间的相生、相克、相合、相冲、刑、破、害等关系
 */

import {
    TIAN_GAN_XIANG_SHENG,
    TIAN_GAN_XIANG_HE,
    TIAN_GAN_XIANG_CHONG,
    TIAN_GAN_XIANG_KE,
    DI_ZHI_BAN_HE,
    DI_ZHI_GONG_HE,
    DI_ZHI_AN_HE,
    DI_ZHI_LIU_HE,
    DI_ZHI_XIANG_XING,
    DI_ZHI_XIANG_CHONG,
    DI_ZHI_XIANG_PO,
    DI_ZHI_XIANG_HAI,
} from '../maps/baziGanZhiLiuYiMap';
import type { BaZiGanZhiLiuYiSetting } from '../settings/baziGanZhiLiuYiSetting';

// ==================== 类型定义 ====================

/**
 * 干支留意结果
 */
export interface GanZhiLiuYiResult {
    /** 留意类型（如 "相生"、"相冲"） */
    type: string;
    /** 留意描述（如 "甲丙相生"） */
    description: string;
    /** 涉及的干支位置 */
    positions: string[];
}

// ==================== 天干留意计算 ====================

/**
 * 计算天干留意
 * @param setting 干支留意设置
 * @param gans 天干数组（年干、月干、日干、时干、大运干、流年干...）
 * @returns 天干留意结果数组
 */
export function calculateTianGanLiuYi(
    setting: BaZiGanZhiLiuYiSetting,
    gans: string[]
): GanZhiLiuYiResult[] {
    const results: GanZhiLiuYiResult[] = [];

    // 遍历所有天干组合
    for (let i = 0; i < gans.length; i++) {
        for (let j = i + 1; j < gans.length; j++) {
            const gan1 = gans[i];
            const gan2 = gans[j];
            const key1 = gan1 + gan2;
            const key2 = gan2 + gan1;

            // 检查天干相生
            if (setting.tianGanXiangSheng === 0) {
                if (TIAN_GAN_XIANG_SHENG[key1]) {
                    results.push({
                        type: '相生',
                        description: TIAN_GAN_XIANG_SHENG[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (TIAN_GAN_XIANG_SHENG[key2]) {
                    results.push({
                        type: '相生',
                        description: TIAN_GAN_XIANG_SHENG[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }

            // 检查天干相合
            if (setting.tianGanXiangHe === 0) {
                if (TIAN_GAN_XIANG_HE[key1]) {
                    results.push({
                        type: '相合',
                        description: TIAN_GAN_XIANG_HE[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (TIAN_GAN_XIANG_HE[key2]) {
                    results.push({
                        type: '相合',
                        description: TIAN_GAN_XIANG_HE[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }

            // 检查天干相冲
            if (setting.tianGanXiangChong === 0) {
                if (TIAN_GAN_XIANG_CHONG[key1]) {
                    results.push({
                        type: '相冲',
                        description: TIAN_GAN_XIANG_CHONG[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (TIAN_GAN_XIANG_CHONG[key2]) {
                    results.push({
                        type: '相冲',
                        description: TIAN_GAN_XIANG_CHONG[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }

            // 检查天干相克
            if (setting.tianGanXiangKe === 0) {
                if (TIAN_GAN_XIANG_KE[key1]) {
                    results.push({
                        type: '相克',
                        description: TIAN_GAN_XIANG_KE[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (TIAN_GAN_XIANG_KE[key2]) {
                    results.push({
                        type: '相克',
                        description: TIAN_GAN_XIANG_KE[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }
        }
    }

    return results;
}

// ==================== 地支留意计算 ====================

/**
 * 计算地支留意
 * @param setting 干支留意设置
 * @param zhis 地支数组（年支、月支、日支、时支、大运支、流年支...）
 * @returns 地支留意结果数组
 */
export function calculateDiZhiLiuYi(
    setting: BaZiGanZhiLiuYiSetting,
    zhis: string[]
): GanZhiLiuYiResult[] {
    const results: GanZhiLiuYiResult[] = [];

    // 遍历所有地支组合
    for (let i = 0; i < zhis.length; i++) {
        for (let j = i + 1; j < zhis.length; j++) {
            const zhi1 = zhis[i];
            const zhi2 = zhis[j];
            const key1 = zhi1 + zhi2;
            const key2 = zhi2 + zhi1;

            // 检查地支半合
            if (setting.diZhiBanHe === 0) {
                if (DI_ZHI_BAN_HE[key1]) {
                    results.push({
                        type: '半合',
                        description: DI_ZHI_BAN_HE[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (DI_ZHI_BAN_HE[key2]) {
                    results.push({
                        type: '半合',
                        description: DI_ZHI_BAN_HE[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }

            // 检查地支拱合
            if (setting.diZhiGongHe === 0) {
                if (DI_ZHI_GONG_HE[key1]) {
                    results.push({
                        type: '拱合',
                        description: DI_ZHI_GONG_HE[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (DI_ZHI_GONG_HE[key2]) {
                    results.push({
                        type: '拱合',
                        description: DI_ZHI_GONG_HE[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }

            // 检查地支暗合
            if (setting.diZhiAnHe === 0) {
                if (DI_ZHI_AN_HE[key1]) {
                    results.push({
                        type: '暗合',
                        description: DI_ZHI_AN_HE[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (DI_ZHI_AN_HE[key2]) {
                    results.push({
                        type: '暗合',
                        description: DI_ZHI_AN_HE[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }

            // 检查地支六合
            if (setting.diZhiLiuHe === 0) {
                if (DI_ZHI_LIU_HE[key1]) {
                    results.push({
                        type: '六合',
                        description: DI_ZHI_LIU_HE[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (DI_ZHI_LIU_HE[key2]) {
                    results.push({
                        type: '六合',
                        description: DI_ZHI_LIU_HE[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }

            // 检查地支相刑
            if (setting.diZhiXiangXing === 0) {
                if (DI_ZHI_XIANG_XING[key1]) {
                    results.push({
                        type: '相刑',
                        description: DI_ZHI_XIANG_XING[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (DI_ZHI_XIANG_XING[key2]) {
                    results.push({
                        type: '相刑',
                        description: DI_ZHI_XIANG_XING[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }

            // 检查地支相冲
            if (setting.diZhiXiangChong === 0) {
                if (DI_ZHI_XIANG_CHONG[key1]) {
                    results.push({
                        type: '相冲',
                        description: DI_ZHI_XIANG_CHONG[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (DI_ZHI_XIANG_CHONG[key2]) {
                    results.push({
                        type: '相冲',
                        description: DI_ZHI_XIANG_CHONG[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }

            // 检查地支相破
            if (setting.diZhiXiangPo === 0) {
                if (DI_ZHI_XIANG_PO[key1]) {
                    results.push({
                        type: '相破',
                        description: DI_ZHI_XIANG_PO[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (DI_ZHI_XIANG_PO[key2]) {
                    results.push({
                        type: '相破',
                        description: DI_ZHI_XIANG_PO[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }

            // 检查地支相害
            if (setting.diZhiXiangHai === 0) {
                if (DI_ZHI_XIANG_HAI[key1]) {
                    results.push({
                        type: '相害',
                        description: DI_ZHI_XIANG_HAI[key1],
                        positions: [String(i), String(j)],
                    });
                } else if (DI_ZHI_XIANG_HAI[key2]) {
                    results.push({
                        type: '相害',
                        description: DI_ZHI_XIANG_HAI[key2],
                        positions: [String(j), String(i)],
                    });
                }
            }
        }
    }

    return results;
}

// ==================== 辅助函数 ====================

/**
 * 快速检查两个天干是否相合
 */
export function isTianGanHe(gan1: string, gan2: string): boolean {
    const key1 = gan1 + gan2;
    const key2 = gan2 + gan1;
    return !!(TIAN_GAN_XIANG_HE[key1] || TIAN_GAN_XIANG_HE[key2]);
}

/**
 * 快速检查两个天干是否相冲
 */
export function isTianGanChong(gan1: string, gan2: string): boolean {
    const key1 = gan1 + gan2;
    const key2 = gan2 + gan1;
    return !!(TIAN_GAN_XIANG_CHONG[key1] || TIAN_GAN_XIANG_CHONG[key2]);
}

/**
 * 快速检查两个地支是否六合
 */
export function isDiZhiLiuHe(zhi1: string, zhi2: string): boolean {
    const key1 = zhi1 + zhi2;
    const key2 = zhi2 + zhi1;
    return !!(DI_ZHI_LIU_HE[key1] || DI_ZHI_LIU_HE[key2]);
}

/**
 * 快速检查两个地支是否相冲
 */
export function isDiZhiChong(zhi1: string, zhi2: string): boolean {
    const key1 = zhi1 + zhi2;
    const key2 = zhi2 + zhi1;
    return !!(DI_ZHI_XIANG_CHONG[key1] || DI_ZHI_XIANG_CHONG[key2]);
}

/**
 * 快速检查两个地支是否相刑
 */
export function isDiZhiXing(zhi1: string, zhi2: string): boolean {
    const key1 = zhi1 + zhi2;
    const key2 = zhi2 + zhi1;
    return !!(DI_ZHI_XIANG_XING[key1] || DI_ZHI_XIANG_XING[key2]);
}

/**
 * 快速检查两个地支是否相害
 */
export function isDiZhiHai(zhi1: string, zhi2: string): boolean {
    const key1 = zhi1 + zhi2;
    const key2 = zhi2 + zhi1;
    return !!(DI_ZHI_XIANG_HAI[key1] || DI_ZHI_XIANG_HAI[key2]);
}
