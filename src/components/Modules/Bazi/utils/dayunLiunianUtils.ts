/**
 * dayunLiunianUtils - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `getShiShenAbbr`, `isTianGanKeOrChong`, `LiunianStatus`, `checkLiunianStatus`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `utils`、内部模块 `baziGanZhiLiuYiMap`、内部模块 `calendar`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { getShiShen, getShiShenAbbr as getShiShenAbbrByName } from '../../../../lib/xuan-bazi/utils';
import {
    isTianGanHe,
    isDiZhiLiuHe,
    isDiZhiChong
} from '../../../../lib/xuan-bazi/utils/baziGanZhiLiuYiUtil';
import { TIAN_GAN_XIANG_KE, TIAN_GAN_XIANG_CHONG } from '../../../../lib/xuan-bazi/maps/baziGanZhiLiuYiMap';
import { JIEQI_LABELS } from '../../../../constants/calendar';

export { JIEQI_LABELS };

/**
 * 兼容辅助函数：获取十神缩写（两参数版本）
 */
export function getShiShenAbbr(dayMaster: string, target: string): string {
    const shiShen = getShiShen(dayMaster, target);
    return getShiShenAbbrByName(shiShen) || '';
}

/**
 * 检查天干相克/相冲
 */
export function isTianGanKeOrChong(g1: string, g2: string): boolean {
    const k1 = g1 + g2;
    const k2 = g2 + g1;
    return !!(TIAN_GAN_XIANG_KE[k1] || TIAN_GAN_XIANG_KE[k2] || TIAN_GAN_XIANG_CHONG[k1] || TIAN_GAN_XIANG_CHONG[k2]);
}

export interface LiunianStatus {
    message: string;
    type: 'danger' | 'warning' | 'success';
}

interface PillarItem {
    tiangan?: string;
    dizhi?: string;
}

interface LiunianItem {
    tiangan?: string;
    dizhi?: string;
}

interface DayunItem {
    tiangan?: string;
    dizhi?: string;
}

/**
 * 检查流年特殊状态
 * 返回提示信息和类型（danger=红色, warning=黄色, success=绿色）
 */
export function checkLiunianStatus(
    lnItem: LiunianItem | null | undefined,
    currentDy: DayunItem | null | undefined,
    pillarList: PillarItem[]
): LiunianStatus | null {
    if (!lnItem) return null;
    const { tiangan: lnGan, dizhi: lnZhi } = lnItem;
    if (!lnGan || !lnZhi) return null;

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
