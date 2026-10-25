
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

/**
 * 获取字符对应的五行文本颜色
 */
export function getElementTextColor(char: string): string {
    return WU_XING_TEXT_COLORS[char] || 'text-foreground';
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
