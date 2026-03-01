/**
 * baziGanZhiLiuYiUtil - 应用底层设施
 *
 * 模块定位：
 * - 所在层级：应用底层设施
 * - 主要目标：封装第三方库或核心底层能力
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `GanZhiLiuYiResult`, `calculateTianGanLiuYi`, `calculateDiZhiLiuYi`, `isTianGanHe`, `isTianGanChong`, `isDiZhiLiuHe`, `isDiZhiChong`, `isDiZhiXing`, `isDiZhiHai`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `baziGanZhiLiuYiSetting`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
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
    DI_ZHI_SAN_HE,
    DI_ZHI_SAN_HUI,
    BAN_HE_TO_SAN_HE,
    GONG_HE_TO_SAN_HE,
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
    /** 是否涉及动态柱（大运/流年） */
    isDynamic: boolean;
}

// ==================== 天干留意计算 ====================

/**
 * 计算天干留意
 * @param setting 干支留意设置
 * @param staticGans 静态天干数组（四柱）
 * @param dynamicGans 动态天干数组（大运、流年）
 * @returns 天干留意结果数组
 */
export function calculateTianGanLiuYi(
    setting: BaZiGanZhiLiuYiSetting,
    staticGans: string[],
    dynamicGans: string[] = []
): GanZhiLiuYiResult[] {
    const results: GanZhiLiuYiResult[] = [];
    const allGans = [...staticGans, ...dynamicGans];
    const staticCount = staticGans.length;

    // 遍历所有天干组合
    for (let i = 0; i < allGans.length; i++) {
        for (let j = i + 1; j < allGans.length; j++) {
            const gan1 = allGans[i];
            const gan2 = allGans[j];
            const key1 = gan1 + gan2;
            const key2 = gan2 + gan1;

            // 判断是否涉及动态柱
            const isDynamic = i >= staticCount || j >= staticCount;

            // 检查天干相生
            if (setting.tianGanXiangSheng === 0) {
                if (TIAN_GAN_XIANG_SHENG[key1]) {
                    results.push({
                        type: '相生',
                        description: TIAN_GAN_XIANG_SHENG[key1],
                        positions: [String(i), String(j)],
                        isDynamic,
                    });
                } else if (TIAN_GAN_XIANG_SHENG[key2]) {
                    results.push({
                        type: '相生',
                        description: TIAN_GAN_XIANG_SHENG[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
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
                        isDynamic,
                    });
                } else if (TIAN_GAN_XIANG_HE[key2]) {
                    results.push({
                        type: '相合',
                        description: TIAN_GAN_XIANG_HE[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
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
                        isDynamic,
                    });
                } else if (TIAN_GAN_XIANG_CHONG[key2]) {
                    results.push({
                        type: '相冲',
                        description: TIAN_GAN_XIANG_CHONG[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
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
                        isDynamic,
                    });
                } else if (TIAN_GAN_XIANG_KE[key2]) {
                    results.push({
                        type: '相克',
                        description: TIAN_GAN_XIANG_KE[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
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
 * @param staticZhis 静态地支数组（四柱）
 * @param dynamicZhis 动态地支数组（大运、流年）
 * @returns 地支留意结果数组
 */
export function calculateDiZhiLiuYi(
    setting: BaZiGanZhiLiuYiSetting,
    staticZhis: string[],
    dynamicZhis: string[] = []
): GanZhiLiuYiResult[] {
    const results: GanZhiLiuYiResult[] = [];
    const allZhis = [...staticZhis, ...dynamicZhis];
    const staticCount = staticZhis.length;

    // 遍历所有地支组合
    for (let i = 0; i < allZhis.length; i++) {
        for (let j = i + 1; j < allZhis.length; j++) {
            const zhi1 = allZhis[i];
            const zhi2 = allZhis[j];
            const key1 = zhi1 + zhi2;
            const key2 = zhi2 + zhi1;

            // 判断是否涉及动态柱
            const isDynamic = i >= staticCount || j >= staticCount;

            // 检查地支半合
            if (setting.diZhiBanHe === 0) {
                if (DI_ZHI_BAN_HE[key1]) {
                    results.push({
                        type: '半合',
                        description: DI_ZHI_BAN_HE[key1],
                        positions: [String(i), String(j)],
                        isDynamic,
                    });
                } else if (DI_ZHI_BAN_HE[key2]) {
                    results.push({
                        type: '半合',
                        description: DI_ZHI_BAN_HE[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
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
                        isDynamic,
                    });
                } else if (DI_ZHI_GONG_HE[key2]) {
                    results.push({
                        type: '拱合',
                        description: DI_ZHI_GONG_HE[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
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
                        isDynamic,
                    });
                } else if (DI_ZHI_AN_HE[key2]) {
                    results.push({
                        type: '暗合',
                        description: DI_ZHI_AN_HE[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
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
                        isDynamic,
                    });
                } else if (DI_ZHI_LIU_HE[key2]) {
                    results.push({
                        type: '六合',
                        description: DI_ZHI_LIU_HE[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
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
                        isDynamic,
                    });
                } else if (DI_ZHI_XIANG_XING[key2]) {
                    results.push({
                        type: '相刑',
                        description: DI_ZHI_XIANG_XING[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
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
                        isDynamic,
                    });
                } else if (DI_ZHI_XIANG_CHONG[key2]) {
                    results.push({
                        type: '相冲',
                        description: DI_ZHI_XIANG_CHONG[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
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
                        isDynamic,
                    });
                } else if (DI_ZHI_XIANG_PO[key2]) {
                    results.push({
                        type: '相破',
                        description: DI_ZHI_XIANG_PO[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
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
                        isDynamic,
                    });
                } else if (DI_ZHI_XIANG_HAI[key2]) {
                    results.push({
                        type: '相害',
                        description: DI_ZHI_XIANG_HAI[key2],
                        positions: [String(j), String(i)],
                        isDynamic,
                    });
                }
            }
        }
    }

    // ==================== 三元关系检测（三合、三会） ====================
    const fullSanHeKeys: string[] = []; // 记录完整的三合键，用于后续过滤半合

    // 三合局检测
    if (setting.diZhiSanHe === 0 && allZhis.length >= 3) {
        for (let i = 0; i < allZhis.length; i++) {
            for (let j = i + 1; j < allZhis.length; j++) {
                for (let k = j + 1; k < allZhis.length; k++) {
                    const zhis = [allZhis[i], allZhis[j], allZhis[k]];
                    // 排序后拼接作为查找键
                    const sortedKey = zhis.sort().join('');
                    const sanHeInfo = DI_ZHI_SAN_HE[sortedKey];
                    if (sanHeInfo) {
                        const isDynamic = i >= staticCount || j >= staticCount || k >= staticCount;
                        results.push({
                            type: '三合',
                            description: sanHeInfo.result,
                            positions: [String(i), String(j), String(k)],
                            isDynamic,
                        });
                        fullSanHeKeys.push(sortedKey);
                    }
                }
            }
        }
    }

    // 三会局检测
    if (setting.diZhiSanHui === 0 && allZhis.length >= 3) {
        for (let i = 0; i < allZhis.length; i++) {
            for (let j = i + 1; j < allZhis.length; j++) {
                for (let k = j + 1; k < allZhis.length; k++) {
                    const zhis = [allZhis[i], allZhis[j], allZhis[k]];
                    const sortedKey = zhis.sort().join('');
                    const sanHuiInfo = DI_ZHI_SAN_HUI[sortedKey];
                    if (sanHuiInfo) {
                        const isDynamic = i >= staticCount || j >= staticCount || k >= staticCount;
                        results.push({
                            type: '三会',
                            description: sanHuiInfo.result,
                            positions: [String(i), String(j), String(k)],
                            isDynamic,
                        });
                    }
                }
            }
        }
    }

    // ==================== 过滤逻辑：完整三合时隐藏对应的半合和拱合 ====================
    if (setting.hideBanHeWhenFullSanHe === 0 && fullSanHeKeys.length > 0) {
        return results.filter(r => {
            // 只过滤半合和拱合
            if (r.type !== '半合' && r.type !== '拱合') return true;

            // 获取涉及的两个地支
            const pos0 = parseInt(r.positions[0]);
            const pos1 = parseInt(r.positions[1]);
            const zhiPair = [allZhis[pos0], allZhis[pos1]].sort().join('');

            // 检查这个关系是否属于某个完整三合
            let correspondingSanHe: string | undefined;
            if (r.type === '半合') {
                correspondingSanHe = BAN_HE_TO_SAN_HE[zhiPair];
            } else if (r.type === '拱合') {
                correspondingSanHe = GONG_HE_TO_SAN_HE[zhiPair];
            }

            if (correspondingSanHe && fullSanHeKeys.includes(correspondingSanHe)) {
                return false; // 隐藏
            }
            return true;
        });
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
