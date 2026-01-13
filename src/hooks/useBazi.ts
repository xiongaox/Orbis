/**
 * 八字模块状态与逻辑 Hook
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { baziCaseService } from '../services/baziCaseService';
import { calculateBazi } from '../services/bazi/baziCalculator';
import type { BaziApiResponse } from '../types/bazi';
import type { Case } from '../types';
import { BAZI_CASES_CHANGED_EVENT } from '../data/caseConstants';

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
        if (!baziData && !loading) {
            loadBaziData();
        }
    }, [baziData, loading, loadBaziData]);

    // 监听案例选择变化
    useEffect(() => {
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
    }, [selectedCaseId, loadCase, loadBaziData]);

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
        setSelectedCaseId(caseId);
    };

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
        initializeBazi,
    };
}
