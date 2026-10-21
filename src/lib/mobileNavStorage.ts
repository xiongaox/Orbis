/**
 * 模块定位：
 * - 所在层级：本地存储工具层（与 lockedChartStorage 同层同风格）
 * - 主要目标：移动端底部导航槽位的持久化与模块命名元数据
 *
 * 规则（与 design-demos/mobile-bottom-nav 定稿一致）：
 * - 主菜单底栏分两页，靠底栏上滑 / 下滑切换：
 *   第一页 = 万年通历（首页固定）+ 可更换术数槽 + 个人中心
 *   第二页 = 案例学习分类槽 + 个人中心（默认 常识 · 八字案例 · 奇门案例）
 * - 两页槽位都可在「个人中心」对应的管理列表里更换，个人中心恒在末位
 * - 尚未上线的术数仅在「重选菜单」网格中露出，不可选中
*/
import type { ChartType } from '../types';
import { CATEGORIES } from './caseStudy/constants';
import { readSetting, writeSetting } from '../services/appSettingStore';

export const MOBILE_NAV_SLOTS_STORAGE_KEY = 'orbis_mobile_nav_slots';

/** 首页固定模块 */
export const MOBILE_NAV_HOME_CHART: ChartType = 'wannianli';

/** 除首页外，可固定到主菜单的术数槽位数量 */
export const MOBILE_NAV_MAX_SLOTS = 2;

/** 默认可换槽位（四柱八字 · 奇门遁甲） */
export const DEFAULT_MOBILE_NAV_SLOTS: ChartType[] = ['bazi', 'qimen'];

/** 第二页（案例学习层）槽位存储键 */
export const MOBILE_NAV_CASE_SLOTS_STORAGE_KEY = 'orbis_mobile_nav_case_slots';

/** 第二页槽位数量（个人中心恒在末位，不占此额度） */
export const MOBILE_NAV_CASE_MAX_SLOTS = 3;

/**
 * 第二页槽位标识：案例学习的分类 id，而非术数 ChartType。
 * 必须与 ChartType 分开——`bazi` / `qimen` 在两边同名，但点击语义完全不同：
 * 第二页的「八字案例」是进入案例学习模块并切到八字分类，不是打开八字盘面。
 */
export type CaseNavSlot = 'changshi' | 'duanfa' | 'bazi' | 'qimen';

/** 第二页默认可换槽位（常识 · 八字案例 · 奇门案例；断法默认不占位，需要时自行换入） */
export const DEFAULT_MOBILE_NAV_CASE_SLOTS: CaseNavSlot[] = ['changshi', 'bazi', 'qimen'];

/** 第二页候选分类的底栏文案。
 *  不能统一加「案例」后缀：常识是通用基础知识（十二时辰 / 干支象义 / 八卦纳音），
 *  不限于八字，任何术数都会用到；断法是断法文档库，二者都不是案例；
 *  只有八字、奇门才是案例库。
 *  断法文案不带门类前缀：目前只有奇门断法（src/data/cases/qimen/duanfa），
 *  之后会扩展其他门类，写死「奇门」会随内容增长失效。
 *  四个文案都取四字，与相邻槽位等宽；门类名仍用 CATEGORIES 的「常识 / 断法 / 八字 / 奇门」 */
const CASE_SLOT_NAMES: Record<CaseNavSlot, string> = {
    changshi: '术数基础',
    duanfa: '断法汇编',
    bazi: '八字案例',
    qimen: '奇门案例',
};

export const MOBILE_NAV_CASE_CANDIDATES: ReadonlyArray<{ id: CaseNavSlot; name: string }> =
    CATEGORIES.map((cat) => ({
        id: cat.id as CaseNavSlot,
        name: CASE_SLOT_NAMES[cat.id as CaseNavSlot],
    }));

/** 可更换槽位的候选模块（仅术数，供第一页使用） */
export const MOBILE_NAV_CANDIDATES: ReadonlyArray<{ id: ChartType; name: string }> = [
    { id: 'bazi', name: '四柱八字' },
    { id: 'qimen', name: '奇门遁甲' },
    // 三元天星暂不对外展示（作者自研中），代码保留；恢复时放回此行
    // { id: 'sanyuan', name: '三元天星' },
];

/** 独立固定菜单（非术数）：不占术数槽位，在重选菜单里作为独立格子露出 */
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
const CASE_CANDIDATE_IDS: ReadonlyArray<string> = MOBILE_NAV_CASE_CANDIDATES.map((item) => item.id);

/** 模块名统一出口，避免底栏 / 重选菜单 / 个人中心各自散落命名。
 *  注意只覆盖术数与独立菜单：第二页分类槽用 CaseNavSlot，其文案见 MOBILE_NAV_CASE_CANDIDATES */
export function mobileNavModuleName(chart: ChartType): string {
    if (chart === MOBILE_NAV_HOME_CHART) return '万年通历';
    return MOBILE_NAV_CANDIDATES.find((item) => item.id === chart)?.name
        ?? MOBILE_NAV_INDEPENDENT.find((item) => item.id === chart)?.name
        ?? MOBILE_NAV_UPCOMING.find((item) => item.id === chart)?.name
        ?? chart;
}

/** 读取已固定槽位；存储缺失或非法时回退默认值 */
export function readMobileNavSlots(): ChartType[] {
    const stored = readSetting<unknown>(MOBILE_NAV_SLOTS_STORAGE_KEY, null);
    if (!stored) return [...DEFAULT_MOBILE_NAV_SLOTS];
    if (!Array.isArray(stored)) return [...DEFAULT_MOBILE_NAV_SLOTS];
    const slots = stored.filter(
        (value): value is ChartType => typeof value === 'string' && CANDIDATE_IDS.includes(value),
    );
    return [...new Set(slots)].slice(0, MOBILE_NAV_MAX_SLOTS);
}

/** 持久化已固定槽位（调用方负责上限校验） */
export function writeMobileNavSlots(slots: ChartType[]): void {
    writeSetting(MOBILE_NAV_SLOTS_STORAGE_KEY, slots);
}

/** 读取第二页（案例学习层）槽位；存储缺失或非法时回退默认值 */
export function readMobileNavCaseSlots(): CaseNavSlot[] {
    const stored = readSetting<unknown>(MOBILE_NAV_CASE_SLOTS_STORAGE_KEY, null);
    if (!stored) return [...DEFAULT_MOBILE_NAV_CASE_SLOTS];
    if (!Array.isArray(stored)) return [...DEFAULT_MOBILE_NAV_CASE_SLOTS];
    const slots = stored.filter(
        (value): value is CaseNavSlot => typeof value === 'string' && CASE_CANDIDATE_IDS.includes(value),
    );
    return [...new Set(slots)].slice(0, MOBILE_NAV_CASE_MAX_SLOTS);
}

/** 持久化第二页槽位（调用方负责上限校验） */
export function writeMobileNavCaseSlots(slots: CaseNavSlot[]): void {
    writeSetting(MOBILE_NAV_CASE_SLOTS_STORAGE_KEY, slots);
}
