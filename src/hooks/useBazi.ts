import { useState, useEffect, useCallback, useRef } from 'react';
import { baziCaseService } from '../services/baziCaseService';
import { calculateBazi } from '../services/bazi/baziCalculator';
import type { BaziApiResponse } from '../types/bazi';
import type { Case } from '../types';
import { BAZI_CASES_CHANGED_EVENT } from '../data/caseConstants';
import type { BaziLockedSnapshot } from '../lib/lockedChartStorage';

export function useBazi() {
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [baziData, setBaziData] = useState<BaziApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 选中的大运、流年和流月状态（用于联动显示）
    const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number | null>(null);
    const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number | null>(null);
    const [selectedLiuYueIndex, setSelectedLiuYueIndex] = useState<number | null>(null);
    // 时柱切换的时辰偏移量：±1 为一个时辰（2 小时），基于命例出生时间或当前时间整体平移重排
    const [shiChenOffset, setShiChenOffset] = useState(0);
    const [isTransient, setIsTransient] = useState(false);
    const restoringLockedSnapshotRef = useRef(false);

    // 加载案例数据
    const loadCase = useCallback(async (caseId: string) => {
        try {
            const remoteCase = await baziCaseService.getCaseById(caseId);
            if (!remoteCase) {
                setSelectedCase(null);
                return null;
            }
            const mappedCase: Case = {
                id: remoteCase.id,
                name: remoteCase.name,
                gender: remoteCase.gender,
                birth_date: remoteCase.birth_date,
                created_at: remoteCase.created_at,
            };
            setSelectedCase(mappedCase);
            return mappedCase;
        } catch (err) {
            console.error('加载案例失败:', err);
            setSelectedCase(null);
            return null;
        }
    }, []);

    // 获取八字数据（使用案例数据或当前时间，可叠加时辰偏移）
    const loadBaziData = useCallback(async (caseData?: Case | null, offsetShiChen = 0) => {
        setLoading(true);
        setError(null);

        try {
            let params;

            if (caseData?.birth_date) {
                // 使用案例数据
                const date = new Date(caseData.birth_date);
                if (offsetShiChen !== 0) {
                    date.setHours(date.getHours() + offsetShiChen * 2);
                }
                params = {
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                    day: date.getDate(),
                    hour: date.getHours(),
                    minute: date.getMinutes(),
                    gender: caseData.gender,
                };
            } else {
                // 没有案例时，使用当前时间排盘
                const now = new Date();
                const date = offsetShiChen !== 0
                    ? new Date(now.getTime() + offsetShiChen * 2 * 60 * 60 * 1000)
                    : now;
                params = {
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                    day: date.getDate(),
                    hour: date.getHours(),
                    minute: date.getMinutes(),
                    gender: 'male' as const,  // 默认男性
                };
            }

            const data = calculateBazi(params);
            setBaziData(data);
        } catch (err) {
            console.error('获取八字数据失败:', err);
            setError(err instanceof Error ? err.message : '获取数据失败');
            setBaziData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // 初始化加载
    const initializeBazi = useCallback(() => {
        if (!baziData && !loading && !restoringLockedSnapshotRef.current) {
            loadBaziData();
        }
    }, [baziData, loading, loadBaziData]);

    // 监听案例选择变化


    useEffect(() => {
        if (isTransient) return; // Skip loading if transient

        if (selectedCaseId === null) {
            setSelectedCase(null);
            loadBaziData(null);
            return;
        }

        const fetchData = async () => {
            const caseData = await loadCase(selectedCaseId);
            await loadBaziData(caseData);
        };

        fetchData();
    }, [selectedCaseId, isTransient, loadCase, loadBaziData]);

    useEffect(() => {
        const handleCasesChanged = () => {
            if (!selectedCaseId) {
                return;
            }
            loadCase(selectedCaseId).then(loadBaziData);
        };

        window.addEventListener(BAZI_CASES_CHANGED_EVENT, handleCasesChanged);
        return () => {
            window.removeEventListener(BAZI_CASES_CHANGED_EVENT, handleCasesChanged);
        };
    }, [selectedCaseId, loadCase, loadBaziData]);

    // 处理案例选择
    const handleSelectCase = (caseId: string | null) => {
        setShiChenOffset(0);
        setIsTransient(false);
        setSelectedCaseId(caseId);
    };

    const handleSetTransientCase = useCallback((caseData: Case) => {
        setShiChenOffset(0);
        setIsTransient(true);
        setSelectedCaseId('temp');
        setSelectedCase(caseData);
        loadBaziData(caseData);
    }, [loadBaziData]);

    // 时柱切换：以上一个/下一个时辰重排全盘
    // 直接基于当前命例源重算，不改案例选择状态，避免触发案例重新加载
    const handleShiftShiChen = useCallback((delta: 1 | -1) => {
        const next = shiChenOffset + delta;
        setShiChenOffset(next);
        loadBaziData(selectedCase, next);
    }, [shiChenOffset, selectedCase, loadBaziData]);

    const getLockedSnapshot = useCallback((): BaziLockedSnapshot => ({
        version: 1,
        capturedAt: new Date().toISOString(),
        selectedCaseId,
        selectedCase,
        selectedDaYunIndex,
        selectedLiuNianYear,
        selectedLiuYueIndex,
    }), [
        selectedCaseId,
        selectedCase,
        selectedDaYunIndex,
        selectedLiuNianYear,
        selectedLiuYueIndex,
    ]);

    const restoreLockedSnapshot = useCallback(async (snapshot: BaziLockedSnapshot) => {
        restoringLockedSnapshotRef.current = true;
        setShiChenOffset(0);
        setSelectedDaYunIndex(snapshot.selectedDaYunIndex);
        setSelectedLiuNianYear(snapshot.selectedLiuNianYear);
        setSelectedLiuYueIndex(snapshot.selectedLiuYueIndex);
        setIsTransient(true);
        setSelectedCaseId(snapshot.selectedCaseId);

        try {
            const caseData = snapshot.selectedCase ?? (
                snapshot.selectedCaseId && snapshot.selectedCaseId !== 'temp'
                    ? await loadCase(snapshot.selectedCaseId)
                    : null
            );
            setSelectedCase(caseData);
            await loadBaziData(caseData);
        } finally {
            restoringLockedSnapshotRef.current = false;
        }
    }, [loadBaziData, loadCase]);

    return {
        // 状态
        selectedCaseId,
        selectedCase,
        baziData,
        loading,
        error,
        selectedDaYunIndex,
        selectedLiuNianYear,
        selectedLiuYueIndex,
        shiChenOffset,
        // 操作
        setSelectedDaYunIndex,
        setSelectedLiuNianYear,
        setSelectedLiuYueIndex,
        handleSelectCase,
        handleSetTransientCase,
        handleShiftShiChen,
        getLockedSnapshot,
        restoreLockedSnapshot,
        initializeBazi,
    };
}
