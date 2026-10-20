import type { QimenCase } from '../services/qimenCaseService';
import type { PaiPanMethod } from './csp-qimen/qimenService';
import type { Case, ChartType } from '../types';
import { readSetting, writeSetting } from '../services/appSettingStore';

export const LOCKED_CHARTS_STORAGE_KEY = 'orbis_locked_charts';
export const LOCKED_CHART_SNAPSHOTS_STORAGE_KEY = 'orbis_locked_chart_snapshots';

export const LOCKABLE_CHARTS: ChartType[] = ['bazi', 'qimen', 'xiaoliuren'];

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
    xiaoliuren?: CaseStudyLockedSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isLockableChart(value: unknown): value is ChartType {
    return typeof value === 'string' && LOCKABLE_CHARTS.includes(value as ChartType);
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

export function readLockedCharts(): ChartType[] {
    const stored = readJson(LOCKED_CHARTS_STORAGE_KEY);
    return Array.isArray(stored)
        ? Array.from(new Set(stored.filter(isLockableChart)))
        : [];
}

export function writeLockedCharts(charts: ChartType[]) {
    writeSetting(LOCKED_CHARTS_STORAGE_KEY, charts);
}

export function readLockedChartSnapshots(): LockedChartSnapshots {
    const stored = readJson(LOCKED_CHART_SNAPSHOTS_STORAGE_KEY);
    if (!isRecord(stored)) return {};

    return {
        bazi: isBaziSnapshot(stored.bazi) ? stored.bazi : undefined,
        qimen: isQimenSnapshot(stored.qimen) ? stored.qimen : undefined,
        xiaoliuren: isCaseStudySnapshot(stored.xiaoliuren) ? stored.xiaoliuren : undefined,
    };
}

export function writeLockedChartSnapshots(snapshots: LockedChartSnapshots) {
    writeSetting(LOCKED_CHART_SNAPSHOTS_STORAGE_KEY, snapshots);
}

