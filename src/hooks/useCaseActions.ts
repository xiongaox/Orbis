/**
 * useCaseActions Hook
 * 统一案例 CRUD 操作和状态管理
 * 复用于 CaseList 和 CaseLibraryModal
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/useAuth';
import { baziCaseService, type BaziCase, type CaseTag } from '../services/baziCaseService';
import { BAZI_CASES_CHANGED_EVENT } from '../data/caseConstants';

interface UseCaseActionsOptions {
    /** 是否在挂载时自动加载 */
    autoLoad?: boolean;
    /** 额外的触发加载条件 */
    loadCondition?: boolean;
}

interface UseCaseActionsReturn {
    // 状态
    cases: BaziCase[];
    loading: boolean;
    search: string;
    selectedTag: CaseTag | null;
    editingCase: BaziCase | null;
    caseToDelete: BaziCase | null;
    deletingCaseId: string | null;

    // 操作
    setSearch: (search: string) => void;
    setSelectedTag: (tag: CaseTag | null) => void;
    setEditingCase: (caseData: BaziCase | null) => void;
    setCaseToDelete: (caseData: BaziCase | null) => void;
    loadCases: () => Promise<void>;
    executeDelete: (selectedCaseId?: string | null, onSelectCase?: (id: string | null) => void) => Promise<void>;
    refreshCases: () => void;

    // 计算属性
    filteredCases: BaziCase[];
}

/**
 * 案例操作 Hook
 */
export function useCaseActions(options: UseCaseActionsOptions = {}): UseCaseActionsReturn {
    const { autoLoad = true, loadCondition = true } = options;
    const { isAuthenticated, loading: authLoading } = useAuth();

    // 状态
    const [cases, setCases] = useState<BaziCase[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedTag, setSelectedTag] = useState<CaseTag | null>(null);
    const [editingCase, setEditingCase] = useState<BaziCase | null>(null);
    const [caseToDelete, setCaseToDelete] = useState<BaziCase | null>(null);
    const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

    // 加载案例
    const loadCases = useCallback(async () => {
        if (!isAuthenticated) {
            setCases([]);
            return;
        }

        setLoading(true);
        try {
            const data = await baziCaseService.getCases();
            setCases(data);
        } catch (error) {
            console.error('Failed to load cases:', error);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // 初始加载
    useEffect(() => {
        if (autoLoad && loadCondition && !authLoading) {
            loadCases();
        }
    }, [autoLoad, loadCondition, authLoading, loadCases]);

    // 监听案例变更事件
    useEffect(() => {
        const handleCasesChanged = () => {
            if (isAuthenticated && loadCondition) {
                loadCases();
            }
        };

        window.addEventListener(BAZI_CASES_CHANGED_EVENT, handleCasesChanged);
        return () => {
            window.removeEventListener(BAZI_CASES_CHANGED_EVENT, handleCasesChanged);
        };
    }, [isAuthenticated, loadCondition, loadCases]);

    // 删除案例
    const executeDelete = useCallback(async (
        selectedCaseId?: string | null,
        onSelectCase?: (id: string | null) => void
    ) => {
        if (!isAuthenticated || !caseToDelete) return;

        setDeletingCaseId(caseToDelete.id);
        try {
            await baziCaseService.deleteCase(caseToDelete.id);
            if (selectedCaseId === caseToDelete.id) {
                onSelectCase?.(null);
            }
            window.dispatchEvent(new CustomEvent(BAZI_CASES_CHANGED_EVENT));
            setCaseToDelete(null);
        } catch (error) {
            console.error('删除案例失败:', error);
            alert('删除失败');
        } finally {
            setDeletingCaseId(null);
        }
    }, [isAuthenticated, caseToDelete]);

    // 手动刷新
    const refreshCases = useCallback(() => {
        window.dispatchEvent(new CustomEvent(BAZI_CASES_CHANGED_EVENT));
    }, []);

    // 筛选后的案例
    const filteredCases = useMemo(() => {
        if (!isAuthenticated) return [];

        return cases.filter(item => {
            const matchesSearch =
                item.name.includes(search) ||
                item.birth_date.includes(search);
            const matchesTag = !selectedTag || (item.tags && item.tags.includes(selectedTag));
            return matchesSearch && matchesTag;
        });
    }, [isAuthenticated, cases, search, selectedTag]);

    return {
        // 状态
        cases,
        loading,
        search,
        selectedTag,
        editingCase,
        caseToDelete,
        deletingCaseId,

        // 操作
        setSearch,
        setSelectedTag,
        setEditingCase,
        setCaseToDelete,
        loadCases,
        executeDelete,
        refreshCases,

        // 计算属性
        filteredCases,
    };
}
