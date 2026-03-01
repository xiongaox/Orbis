/**
 * baziStyleMap - 应用底层设施
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
 * - `WU_XING_TEXT_COLORS`, `WU_XING_BG_COLORS`, `getElementTextColor`, `getElementBgColor`, `getElementColor`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `baziJichuMap`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { TIAN_GAN_WU_XING, DI_ZHI_WU_XING } from './baziJichuMap';

/** 五行文本颜色 (Tailwind Classes using CSS Variables) */
export const WU_XING_TEXT_COLORS: Record<string, string> = {
    '甲': 'text-[var(--element-wood)]', '乙': 'text-[var(--element-wood)]',
    '丙': 'text-[var(--element-fire)]', '丁': 'text-[var(--element-fire)]',
    '戊': 'text-[var(--element-earth)]', '己': 'text-[var(--element-earth)]',
    '庚': 'text-[var(--element-metal)]', '辛': 'text-[var(--element-metal)]',
    '壬': 'text-[var(--element-water)]', '癸': 'text-[var(--element-water)]',

    '寅': 'text-[var(--element-wood)]', '卯': 'text-[var(--element-wood)]',
    '巳': 'text-[var(--element-fire)]', '午': 'text-[var(--element-fire)]',
    '辰': 'text-[var(--element-earth)]', '戌': 'text-[var(--element-earth)]', '丑': 'text-[var(--element-earth)]', '未': 'text-[var(--element-earth)]',
    '申': 'text-[var(--element-metal)]', '酉': 'text-[var(--element-metal)]',
    '亥': 'text-[var(--element-water)]', '子': 'text-[var(--element-water)]',
};

/** 五行背景颜色 (Tailwind Classes using CSS Variables) 
 * 使用自定义属性 bg 支持透明度修改，或者直接使用预定义的 bg 变量
 */
export const WU_XING_BG_COLORS: Record<string, string> = {
    '甲': 'bg-[var(--element-wood)]/10', '乙': 'bg-[var(--element-wood)]/10',
    '丙': 'bg-[var(--element-fire)]/10', '丁': 'bg-[var(--element-fire)]/10',
    '戊': 'bg-[var(--element-earth)]/10', '己': 'bg-[var(--element-earth)]/10',
    '庚': 'bg-[var(--element-metal)]/10', '辛': 'bg-[var(--element-metal)]/10',
    '壬': 'bg-[var(--element-water)]/10', '癸': 'bg-[var(--element-water)]/10',

    '寅': 'bg-[var(--element-wood)]/10', '卯': 'bg-[var(--element-wood)]/10',
    '巳': 'bg-[var(--element-fire)]/10', '午': 'bg-[var(--element-fire)]/10',
    '辰': 'bg-[var(--element-earth)]/10', '戌': 'bg-[var(--element-earth)]/10', '丑': 'bg-[var(--element-earth)]/10', '未': 'bg-[var(--element-earth)]/10',
    '申': 'bg-[var(--element-metal)]/10', '酉': 'bg-[var(--element-metal)]/10',
    '亥': 'bg-[var(--element-water)]/10', '子': 'bg-[var(--element-water)]/10',
};

/**
 * 获取字符对应的五行文本颜色
 */
export function getElementTextColor(char: string): string {
    return WU_XING_TEXT_COLORS[char] || 'text-foreground';
}

/**
 * 获取字符对应的五行背景颜色
 */
export function getElementBgColor(char: string): string {
    return WU_XING_BG_COLORS[char] || 'bg-muted/50';
}

/** 五行颜色映射 (CSS Variable Strings for style attribute) */
const ELEMENT_COLORS: Record<string, string> = {
    '木': 'var(--element-wood)',
    '火': 'var(--element-fire)',
    '土': 'var(--element-earth)',
    '金': 'var(--element-metal)',
    '水': 'var(--element-water)',
};

/**
 * 获取天干或地支对应的五行颜色 CSS 变量（用于 style 属性）
 * @param char 天干或地支字符
 * @returns CSS 变量字符串，如 'var(--element-wood)'
 */
export function getElementColor(char: string): string {
    const wuxing = TIAN_GAN_WU_XING[char] || DI_ZHI_WU_XING[char];
    return ELEMENT_COLORS[wuxing] || 'currentColor';
}
