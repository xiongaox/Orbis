/**
 * 五行旺衰状态计算工具
 * 根据月令（月支）计算五行的旺相休囚死状态
 */

// 五行类型
export type Wuxing = '木' | '火' | '土' | '金' | '水';

// 旺衰状态
export type WuxingState = '旺' | '相' | '休' | '囚' | '死';

// 五行状态项
export interface WuxingStatusItem {
    element: Wuxing;
    state: WuxingState;
    color: string;  // 五行对应颜色
}

// 月支 -> 当令五行
const MONTH_ELEMENT_MAP: Record<string, Wuxing> = {
    '寅': '木', '卯': '木',
    '巳': '火', '午': '火',
    '辰': '土', '戌': '土', '丑': '土', '未': '土',
    '申': '金', '酉': '金',
    '亥': '水', '子': '水'
};

// 五行生克循环顺序：木 -> 火 -> 土 -> 金 -> 水 -> 木
const WUXING_CYCLE: Wuxing[] = ['木', '火', '土', '金', '水'];

// 五行颜色映射 (使用 CSS 变量，与 index.css 保持一致)
const WUXING_COLORS: Record<Wuxing, string> = {
    '木': 'var(--element-wood)',
    '火': 'var(--element-fire)',
    '土': 'var(--element-earth)',
    '金': 'var(--element-metal)',
    '水': 'var(--element-water)'
};

/**
 * 计算五行旺衰状态
 * @param monthBranch 月支
 * @returns 五行状态数组（按旺、相、休、囚、死顺序）
 */
export function calculateWuxingStatus(monthBranch: string): WuxingStatusItem[] {
    const currentElement = MONTH_ELEMENT_MAP[monthBranch];
    if (!currentElement) {
        // 默认返回土旺
        return getStatusFromDangLing('土');
    }
    return getStatusFromDangLing(currentElement);
}

/**
 * 根据当令五行计算所有五行的旺衰状态
 * 旺：当令
 * 相：被当令生
 * 休：生当令
 * 囚：克当令
 * 死：被当令克
 */
function getStatusFromDangLing(dangLing: Wuxing): WuxingStatusItem[] {
    const idx = WUXING_CYCLE.indexOf(dangLing);

    // 按照五行相生顺序：当令生X，X克当令等
    const results: WuxingStatusItem[] = [
        // 旺：当令
        { element: dangLing, state: '旺', color: WUXING_COLORS[dangLing] },
        // 相：被当令生（当令 -> 相）
        { element: WUXING_CYCLE[(idx + 1) % 5], state: '相', color: WUXING_COLORS[WUXING_CYCLE[(idx + 1) % 5]] },
        // 休：生当令（休 -> 当令）
        { element: WUXING_CYCLE[(idx + 4) % 5], state: '休', color: WUXING_COLORS[WUXING_CYCLE[(idx + 4) % 5]] },
        // 囚：克当令（囚 x 当令）
        { element: WUXING_CYCLE[(idx + 3) % 5], state: '囚', color: WUXING_COLORS[WUXING_CYCLE[(idx + 3) % 5]] },
        // 死：被当令克（当令 x 死）
        { element: WUXING_CYCLE[(idx + 2) % 5], state: '死', color: WUXING_COLORS[WUXING_CYCLE[(idx + 2) % 5]] },
    ];

    return results;
}

/**
 * 获取月支对应的当令五行
 */
export function getMonthElement(monthBranch: string): Wuxing | null {
    return MONTH_ELEMENT_MAP[monthBranch] || null;
}
