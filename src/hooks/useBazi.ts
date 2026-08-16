/**
 * useBazi - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：提供复用状态和副作用逻辑的自定义 Hook
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `useBazi`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `useAuth`、内部模块 `baziCaseService` 等 7 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/useAuth';
import { baziCaseService } from '../services/baziCaseService';
import { calculateBazi } from '../services/bazi/baziCalculator';
import type { BaziApiResponse } from '../types/bazi';
import type { Case } from '../types';
import { BAZI_CASES_CHANGED_EVENT } from '../data/caseConstants';
import type { BaziLockedSnapshot } from '../lib/lockedChartStorage';

export function useBazi() {
    const { isAuthenticated } = useAuth();
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [baziData, setBaziData] = useState<BaziApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 选中的大运、流年和流月状态（用于联动显示）
    const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number | null>(null);
    const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number | null>(null);
    const [selectedLiuYueIndex, setSelectedLiuYueIndex] = useState<number | null>(null);
    const [isTransient, setIsTransient] = useState(false);
    const restoringLockedSnapshotRef = useRef(false);

    // 加载案例数据
    const loadCase = useCallback(async (caseId: string) => {
        try {
            if (isAuthenticated) {
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
            }
            setSelectedCase(null);
            return null;
        } catch (err) {
            console.error('加载案例失败:', err);
            setSelectedCase(null);
            return null;
        }
    }, [isAuthenticated]);

    // 获取八字数据（使用案例数据或当前时间）
    const loadBaziData = useCallback(async (caseData?: Case | null) => {
        setLoading(true);
        setError(null);

        try {
            let params;

            if (caseData?.birth_date) {
                // 使用案例数据
                const date = new Date(caseData.birth_date);
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
                params = {
                    year: now.getFullYear(),
                    month: now.getMonth() + 1,
                    day: now.getDate(),
                    hour: now.getHours(),
                    minute: now.getMinutes(),
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
        setIsTransient(false);
        setSelectedCaseId(caseId);
    };

    const handleSetTransientCase = useCallback((caseData: Case) => {
        setIsTransient(true);
        setSelectedCaseId('temp');
        setSelectedCase(caseData);
        loadBaziData(caseData);
    }, [loadBaziData]);

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
        // 操作
        setSelectedDaYunIndex,
        setSelectedLiuNianYear,
        setSelectedLiuYueIndex,
        handleSelectCase,
        handleSetTransientCase,
        getLockedSnapshot,
        restoreLockedSnapshot,
        initializeBazi,
    };
}
