/**
 * qimenShiShenUtils - 应用底层设施
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
 * - `getShiShenAbbr`, `getGanShiShen`, `getXingShiShen`, `getMenShiShen`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `constants`、内部模块 `baziJichuUtil`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { SHI_SHEN } from '../xuan-bazi/constants';
import { SHI_SHEN_ABBR } from '../xuan-bazi/utils/baziJichuUtil';
import { XING_WUXING, MEN_WUXING } from './constants';

// ============ 十神简称映射 ============

// ============ 五行对应虚拟天干 ============

/** 五行 -> 阳干映射 */
const WUXING_TO_YANG_GAN: Record<string, string> = {
    '木': '甲',
    '火': '丙',
    '土': '戊',
    '金': '庚',
    '水': '壬',
};

/** 五行 -> 阴干映射 */
const WUXING_TO_YIN_GAN: Record<string, string> = {
    '木': '乙',
    '火': '丁',
    '土': '己',
    '金': '辛',
    '水': '癸',
};

// ============ 九星阴阳属性 ============
/** 
 * 九星阴阳映射
 * 阳: 天蓬、天冲、天辅、天禽、天任
 * 阴: 天芮、天心、天柱、天英
 */
const XING_YINYANG: Record<string, 'yang' | 'yin'> = {
    '天蓬': 'yang',  // 坎一宫，阳水
    '天芮': 'yin',   // 坤二宫，阴土
    '天冲': 'yang',  // 震三宫，阳木
    '天辅': 'yang',  // 巽四宫，阳木
    '天禽': 'yang',  // 中五宫，阳土
    '天心': 'yin',   // 乾六宫，阴金
    '天柱': 'yin',   // 兑七宫，阴金
    '天任': 'yang',  // 艮八宫，阳土
    '天英': 'yin',   // 离九宫，阴火
};

// ============ 八门阴阳属性 ============
/**
 * 八门阴阳映射
 * 阳: 休门、伤门、开门、生门
 * 阴: 死门、杜门、惊门、景门
 */
const MEN_YINYANG: Record<string, 'yang' | 'yin'> = {
    '休': 'yang', '休门': 'yang',  // 坎一宫，阳水
    '死': 'yin', '死门': 'yin',   // 坤二宫，阴土
    '伤': 'yang', '伤门': 'yang',  // 震三宫，阳木
    '杜': 'yin', '杜门': 'yin',   // 巽四宫，阴木
    '开': 'yang', '开门': 'yang',  // 乾六宫，阳金
    '惊': 'yin', '惊门': 'yin',   // 兑七宫，阴金
    '生': 'yang', '生门': 'yang',  // 艮八宫，阳土
    '景': 'yin', '景门': 'yin',   // 离九宫，阴火
};

// ============ 十神计算函数 ============

/**
 * 获取十神简称
 * @param shiShen 十神全称
 * @returns 单字简称
 */
export function getShiShenAbbr(shiShen: string): string {
    return SHI_SHEN_ABBR[shiShen] || shiShen?.charAt(0) || '';
}

/**
 * 以日干为太极点，计算目标天干的十神
 * @param riGan 日干
 * @param targetGan 目标天干
 * @returns 十神全称
 */
export function getGanShiShen(riGan: string, targetGan: string): string {
    if (!riGan || !targetGan) return '';

    const key = riGan + targetGan;
    return SHI_SHEN[key] || '';
}

/**
 * 以日干为太极点，计算九星的十神
 * @param riGan 日干
 * @param xing 九星名称
 * @returns 十神全称
 */
export function getXingShiShen(riGan: string, xing: string): string {
    if (!riGan || !xing) return '';

    const xingWuxing = XING_WUXING[xing];
    if (!xingWuxing) return '';

    // 根据九星阴阳属性选择对应的虚拟天干
    const yinyang = XING_YINYANG[xing];
    const virtualGan = yinyang === 'yin'
        ? WUXING_TO_YIN_GAN[xingWuxing]
        : WUXING_TO_YANG_GAN[xingWuxing];

    if (!virtualGan) return '';
    return getGanShiShen(riGan, virtualGan);
}

/**
 * 以日干为太极点，计算八门的十神
 * @param riGan 日干
 * @param men 八门名称
 * @returns 十神全称
 */
export function getMenShiShen(riGan: string, men: string): string {
    if (!riGan || !men) return '';

    const menWuxing = MEN_WUXING[men];
    if (!menWuxing) return '';

    // 根据八门阴阳属性选择对应的虚拟天干
    const yinyang = MEN_YINYANG[men];
    const virtualGan = yinyang === 'yin'
        ? WUXING_TO_YIN_GAN[menWuxing]
        : WUXING_TO_YANG_GAN[menWuxing];

    if (!virtualGan) return '';
    return getGanShiShen(riGan, virtualGan);
}
