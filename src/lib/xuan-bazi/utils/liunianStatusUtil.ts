/**
 * 流年状态检查工具函数
 * 从 DayunLiunianPanel.tsx 提取的流年特殊状态检测逻辑
 */
import {
    isTianGanHe,
    isDiZhiLiuHe,
    isDiZhiChong
} from './baziGanZhiLiuYiUtil';
import { TIAN_GAN_XIANG_KE, TIAN_GAN_XIANG_CHONG } from '../maps/baziGanZhiLiuYiMap';
import { JIEQI_LABELS } from '../../../constants/calendar';

export { JIEQI_LABELS };

// 流年状态类型
export interface LiunianStatus {
    message: string;
    type: 'danger' | 'warning' | 'success';
}

// 柱项类型
export interface PillarItem {
    tiangan: string;
    dizhi: string;
}

// 流年/大运项类型
export interface LiunianItem {
    tiangan: string;
    dizhi: string;
    year?: number;
}

/**
 * 检查天干相克或相冲
 */
export function isTianGanKeOrChong(g1: string, g2: string): boolean {
    const k1 = g1 + g2;
    const k2 = g2 + g1;
    return !!(TIAN_GAN_XIANG_KE[k1] || TIAN_GAN_XIANG_KE[k2] || TIAN_GAN_XIANG_CHONG[k1] || TIAN_GAN_XIANG_CHONG[k2]);
}

/**
 * 检查流年特殊状态
 * - 岁运并临：流年与大运完全相同
 * - 天合地合：与四柱天合地合
 * - 天克地冲：与四柱天克地冲
 */
export function checkLiunianStatus(
    lnItem: LiunianItem | null | undefined,
    currentDy: LiunianItem | null | undefined,
    pillarList: (PillarItem | null | undefined)[]
): LiunianStatus | null {
    if (!lnItem) return null;
    const { tiangan: lnGan, dizhi: lnZhi } = lnItem;

    const messages: string[] = [];
    let hasChong = false;
    let hasHe = false;
    let hasSuiYun = false;

    // 1. 岁运并临：流年与大运完全相同
    if (currentDy && currentDy.tiangan === lnGan && currentDy.dizhi === lnZhi) {
        messages.push('岁运并临');
        hasSuiYun = true;
    }

    // 2. 天合地合 / 天克地冲 (与四柱)
    const pillarNames = ['年柱', '月柱', '日柱', '时柱'];
    pillarList.forEach((p, idx) => {
        if (!p) return;
        const { tiangan: pGan, dizhi: pZhi } = p;
        if (!pGan || !pZhi) return;

        // 天合地合
        if (isTianGanHe(lnGan, pGan) && isDiZhiLiuHe(lnZhi, pZhi)) {
            messages.push(`与${pillarNames[idx]}天合地合`);
            hasHe = true;
        }

        // 天克地冲
        if (isTianGanKeOrChong(lnGan, pGan) && isDiZhiChong(lnZhi, pZhi)) {
            messages.push(`与${pillarNames[idx]}天克地冲`);
            hasChong = true;
        }
    });

    if (messages.length > 0) {
        let type: 'danger' | 'warning' | 'success' = 'success';
        if (hasChong) type = 'danger';      // 红色最优先
        else if (hasSuiYun) type = 'warning'; // 黄色次之
        else if (hasHe) type = 'success';     // 绿色最后

        return { message: messages.join('；'), type };
    }
    return null;
}
