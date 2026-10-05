/**
 * 模块定位：
 * - 所在层级：本地存储工具层（与 lockedChartStorage 同层同风格）
 * - 主要目标：移动端底部导航「可更换术数槽位」的持久化与模块命名元数据
 *
 * 规则（与 design-demos/mobile-bottom-nav 定稿一致）：
 * - 首页固定为万年通历，占主菜单第一个槽位，不可更换
 * - 其余槽位（默认 2 个）可在「个人中心 → 底部菜单管理」从候选模块中更换
 * - 尚未上线的术数仅在「重选菜单」网格中露出，不可选中
*/
import type { ChartType } from '../types';

export const MOBILE_NAV_SLOTS_STORAGE_KEY = 'orbis_mobile_nav_slots';

/** 首页固定模块 */
export const MOBILE_NAV_HOME_CHART: ChartType = 'wannianli';

/** 除首页外，可固定到主菜单的术数槽位数量 */
export const MOBILE_NAV_MAX_SLOTS = 2;

/** 默认可换槽位（四柱八字 · 奇门遁甲） */
export const DEFAULT_MOBILE_NAV_SLOTS: ChartType[] = ['bazi', 'qimen'];

/** 可更换槽位的候选模块（仅术数；案例学习为独立菜单，不参与更换） */
export const MOBILE_NAV_CANDIDATES: ReadonlyArray<{ id: ChartType; name: string }> = [
    { id: 'bazi', name: '四柱八字' },
    { id: 'qimen', name: '奇门遁甲' },
    { id: 'sanyuan', name: '三元天星' },
];

/** 独立固定菜单（非术数）：常驻主菜单，不占术数槽位、不可更换 */
export const MOBILE_NAV_INDEPENDENT: ReadonlyArray<{ id: ChartType; name: string }> = [
    { id: 'xiaoliuren', name: '案例学习' },
];

/** 尚未上线的术数（重选菜单中仅展示） */
export const MOBILE_NAV_UPCOMING: ReadonlyArray<{ id: ChartType; name: string }> = [
    { id: 'daliuren', name: '大六壬' },
    { id: 'meihua', name: '梅花易数' },
    { id: 'ziwei', name: '紫微斗数' },
    { id: 'liuyao', name: '六爻' },
];

const CANDIDATE_IDS: ReadonlyArray<string> = MOBILE_NAV_CANDIDATES.map((item) => item.id);

/** 模块名统一出口，避免底栏 / 重选菜单 / 个人中心各自散落命名 */
export function mobileNavModuleName(chart: ChartType): string {
    if (chart === MOBILE_NAV_HOME_CHART) return '万年通历';
    return MOBILE_NAV_CANDIDATES.find((item) => item.id === chart)?.name
        ?? MOBILE_NAV_INDEPENDENT.find((item) => item.id === chart)?.name
        ?? MOBILE_NAV_UPCOMING.find((item) => item.id === chart)?.name
        ?? chart;
}

/** 读取已固定槽位；存储缺失或非法时回退默认值 */
export function readMobileNavSlots(): ChartType[] {
    try {
        const stored = localStorage.getItem(MOBILE_NAV_SLOTS_STORAGE_KEY);
        if (!stored) return [...DEFAULT_MOBILE_NAV_SLOTS];
        const parsed: unknown = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [...DEFAULT_MOBILE_NAV_SLOTS];
        const slots = parsed.filter(
            (value): value is ChartType => typeof value === 'string' && CANDIDATE_IDS.includes(value),
        );
        return [...new Set(slots)].slice(0, MOBILE_NAV_MAX_SLOTS);
    } catch {
        return [...DEFAULT_MOBILE_NAV_SLOTS];
    }
}

/** 持久化已固定槽位（调用方负责上限校验） */
export function writeMobileNavSlots(slots: ChartType[]): void {
    try {
        localStorage.setItem(MOBILE_NAV_SLOTS_STORAGE_KEY, JSON.stringify(slots));
    } catch {
        // 存储不可用时静默降级：本次会话内状态仍在
    }
}
