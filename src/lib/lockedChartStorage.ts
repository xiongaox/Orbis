import type { QimenCase } from '../services/qimenCaseService';
import type { PaiPanMethod } from './csp-qimen/qimenService';
import type { Case, ChartType } from '../types';

export const LOCKED_CHARTS_STORAGE_KEY = 'orbis_locked_charts';
export const LOCKED_CHART_SNAPSHOTS_STORAGE_KEY = 'orbis_locked_chart_snapshots';

const LOCKABLE_CHARTS: ChartType[] = ['bazi', 'qimen'];

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

export interface LockedChartSnapshots {
    bazi?: BaziLockedSnapshot;
    qimen?: QimenLockedSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isLockableChart(value: unknown): value is ChartType {
    return typeof value === 'string' && LOCKABLE_CHARTS.includes(value as ChartType);
}

function readJson(key: string): unknown {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
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

export function readLockedCharts(): ChartType[] {
    const stored = readJson(LOCKED_CHARTS_STORAGE_KEY);
    return Array.isArray(stored)
        ? Array.from(new Set(stored.filter(isLockableChart)))
        : [];
}

export function writeLockedCharts(charts: ChartType[]) {
    localStorage.setItem(LOCKED_CHARTS_STORAGE_KEY, JSON.stringify(charts));
}

export function readLockedChartSnapshots(): LockedChartSnapshots {
    const stored = readJson(LOCKED_CHART_SNAPSHOTS_STORAGE_KEY);
    if (!isRecord(stored)) return {};

    return {
        bazi: isBaziSnapshot(stored.bazi) ? stored.bazi : undefined,
        qimen: isQimenSnapshot(stored.qimen) ? stored.qimen : undefined,
    };
}

export function writeLockedChartSnapshots(snapshots: LockedChartSnapshots) {
    localStorage.setItem(LOCKED_CHART_SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
}

