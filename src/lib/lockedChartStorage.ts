import type { QimenCase } from '../services/qimenCaseService';
import type { PaiPanMethod } from './csp-qimen/qimenService';
import type { Case, ChartType } from '../types';
import { readSetting, writeSetting } from '../services/appSettingStore';

export const LOCKED_CHARTS_STORAGE_KEY = 'orbis_locked_charts';
export const LOCKED_CHART_SNAPSHOTS_STORAGE_KEY = 'orbis_locked_chart_snapshots';

/** 可直接锁定的术数模块（案例学习除外：它按分类分别锁定，见 caseStudyLockKey） */
export const LOCKABLE_CHARTS: ChartType[] = ['bazi', 'qimen', 'xiaoliuren'];

/** 可锁定的案例学习分类（与 CATEGORIES 的 id 一致；此处独立列出避免 lib 循环依赖） */
const CASE_LOCK_CATEGORIES = ['changshi', 'duanfa', 'tiku', 'bazi', 'qimen'];

/** 案例学习的锁定键：每个分类独立锁定，形如 xiaoliuren:changshi */
export function caseStudyLockKey(category: string): string {
    return `xiaoliuren:${category}`;
}

/** 从锁定键取出案例学习分类；不是案例学习键时返回 null */
export function caseStudyCategoryOfLock(key: string): string | null {
    const prefix = 'xiaoliuren:';
    return key.startsWith(prefix) ? key.slice(prefix.length) : null;
}

/** 同时可锁定的模块上限：锁第 3 个时淘汰最早锁定的那个 */
export const LOCKED_CHARTS_MAX = 2;

export interface BaziLockedSnapshot {
    version: 1;
    capturedAt: string;
    selectedCaseId: string | null;
    selectedCase: Case | null;
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    selectedLiuYueIndex: number | null;
}

export interface QimenLockedSnapshot {
    version: 1;
    capturedAt: string;
    selectedCaseId: string | null;
    currentCase: QimenCase | null;
    selectedDate: string;
    paiPanMethod: PaiPanMethod;
    customJu: number;
}

/** 案例学习锁定快照：只存导航态（分类 / 当前文章 / 列表页码 / 断法选中文件），
 *  正文与排盘结果会按需重新加载，阅读滚动位置由 useReadingProgress 另行持久化 */
export interface CaseStudyLockedSnapshot {
    version: 1;
    capturedAt: string;
    selectedCategory: string;
    selectedCaseId: string | null;
    currentPage: number;
    duanFaFileId: string | null;
    changshiItemId?: string | null;
}

export interface LockedChartSnapshots {
    bazi?: BaziLockedSnapshot;
    qimen?: QimenLockedSnapshot;
    /** 案例学习：每个分类一份快照，键为分类 id（changshi / duanfa / bazi / qimen） */
    xiaoliuren?: Record<string, CaseStudyLockedSnapshot>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isLockableKey(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    if (LOCKABLE_CHARTS.includes(value as ChartType)) return true;
    // 案例学习按分类锁定：xiaoliuren:<category>（category 必须在已知分类内）
    const category = caseStudyCategoryOfLock(value);
    return category !== null && CASE_LOCK_CATEGORIES.includes(category);
}

function readJson(key: string): unknown {
    // 值以结构化对象存于 SQLite（app_setting），无需再 JSON.parse
    return readSetting<unknown>(key, null);
}

function isBaziSnapshot(value: unknown): value is BaziLockedSnapshot {
    return isRecord(value)
        && value.version === 1
        && typeof value.capturedAt === 'string'
        && (typeof value.selectedCaseId === 'string' || value.selectedCaseId === null)
        && (value.selectedCase === null || isRecord(value.selectedCase));
}

function isQimenSnapshot(value: unknown): value is QimenLockedSnapshot {
    return isRecord(value)
        && value.version === 1
        && typeof value.capturedAt === 'string'
        && typeof value.selectedDate === 'string'
        && typeof value.paiPanMethod === 'string'
        && typeof value.customJu === 'number'
        && (typeof value.selectedCaseId === 'string' || value.selectedCaseId === null)
        && (value.currentCase === null || isRecord(value.currentCase));
}

function isCaseStudySnapshot(value: unknown): value is CaseStudyLockedSnapshot {
    return isRecord(value)
        && value.version === 1
        && typeof value.capturedAt === 'string'
        && typeof value.selectedCategory === 'string'
        && typeof value.currentPage === 'number'
        && (typeof value.selectedCaseId === 'string' || value.selectedCaseId === null)
        && (typeof value.duanFaFileId === 'string' || value.duanFaFileId === null);
}

export function readLockedCharts(): string[] {
    const stored = readJson(LOCKED_CHARTS_STORAGE_KEY);
    return Array.isArray(stored)
        ? Array.from(new Set(stored.filter(isLockableKey)))
        : [];
}

export function writeLockedCharts(keys: string[]) {
    writeSetting(LOCKED_CHARTS_STORAGE_KEY, keys);
}

export function readLockedChartSnapshots(): LockedChartSnapshots {
    const stored = readJson(LOCKED_CHART_SNAPSHOTS_STORAGE_KEY);
    if (!isRecord(stored)) return {};

    // 案例学习快照：旧版是单份（含 selectedCategory），新版是按分类的 map。
    // 旧版按快照内分类迁移成 map，避免升级后已有锁定状态丢失
    let caseSnapshots: Record<string, CaseStudyLockedSnapshot> | undefined;
    const rawCase = stored.xiaoliuren;
    if (isCaseStudySnapshot(rawCase)) {
        caseSnapshots = { [rawCase.selectedCategory]: rawCase };
    } else if (isRecord(rawCase)) {
        const map: Record<string, CaseStudyLockedSnapshot> = {};
        for (const [category, snapshot] of Object.entries(rawCase)) {
            if (isCaseStudySnapshot(snapshot)) map[category] = snapshot;
        }
        caseSnapshots = Object.keys(map).length > 0 ? map : undefined;
    }

    return {
        bazi: isBaziSnapshot(stored.bazi) ? stored.bazi : undefined,
        qimen: isQimenSnapshot(stored.qimen) ? stored.qimen : undefined,
        xiaoliuren: caseSnapshots,
    };
}

export function writeLockedChartSnapshots(snapshots: LockedChartSnapshots) {
    writeSetting(LOCKED_CHART_SNAPSHOTS_STORAGE_KEY, snapshots);
}

