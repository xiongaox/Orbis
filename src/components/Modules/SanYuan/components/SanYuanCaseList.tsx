import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../contexts/useAuth';
import { SANYUAN_CASES_CHANGED_EVENT } from '../../../../data/caseConstants';
import type { SanYuanInput } from '../../../../lib/sanyuan';
import {
    SANYUAN_CASE_TYPES,
    sanyuanCaseService,
    type SanYuanCase,
    type SanYuanCaseType,
} from '../../../../services/sanyuanCaseService';
import BaseCaseList from '../../../Common/BaseCaseList';
import ConfirmModal from '../../../Common/ConfirmModal';
import CustomSelect from '../../../UI/CustomSelect';
import SanYuanCaseLibraryModal from './SanYuanCaseLibraryModal';
import SanYuanCaseCard from './SanYuanCaseCard';
import SanYuanCaseModal from './SanYuanCaseModal';

interface SanYuanCaseListProps {
    chartInput: SanYuanInput;
    selectedCaseId: string | null;
    onSelectCase: (caseData: SanYuanCase) => void;
    onClearSelectedCase: () => void;
}

export default function SanYuanCaseList({
    chartInput,
    selectedCaseId,
    onSelectCase,
    onClearSelectedCase,
}: SanYuanCaseListProps) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [cases, setCases] = useState<SanYuanCase[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedType, setSelectedType] = useState<SanYuanCaseType | 'all'>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCase, setEditingCase] = useState<SanYuanCase | null>(null);
    const [caseToDelete, setCaseToDelete] = useState<SanYuanCase | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    const loadCases = useCallback(async () => {
        if (!isAuthenticated) {
            setCases([]);
            return;
        }

        setIsLoading(true);
        try {
            setCases(await sanyuanCaseService.getCases());
        } catch (error) {
            console.error('加载三元案例失败:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            void loadCases();
        }
    }, [authLoading, loadCases]);

    useEffect(() => {
        const handleCasesChanged = () => {
            void loadCases();
        };
        window.addEventListener(SANYUAN_CASES_CHANGED_EVENT, handleCasesChanged);
        return () => window.removeEventListener(SANYUAN_CASES_CHANGED_EVENT, handleCasesChanged);
    }, [loadCases]);

    const filteredCases = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return cases.filter((caseData) => {
            const matchesType = selectedType === 'all' || caseData.case_type === selectedType;
            const matchesSearch = !normalizedSearch
                || caseData.title.toLowerCase().includes(normalizedSearch)
                || caseData.location_label?.toLowerCase().includes(normalizedSearch);
            return matchesType && matchesSearch;
        });
    }, [cases, search, selectedType]);

    const handleSaved = (caseData: SanYuanCase) => {
        const shouldSelect = !editingCase || editingCase.id === selectedCaseId;
        setIsCreateOpen(false);
        setEditingCase(null);
        if (shouldSelect) {
            onSelectCase(caseData);
        }
        window.dispatchEvent(new CustomEvent(SANYUAN_CASES_CHANGED_EVENT));
    };

    const executeDelete = async () => {
        if (!caseToDelete) return;

        setIsDeleting(true);
        try {
            await sanyuanCaseService.deleteCase(caseToDelete.id);
            if (caseToDelete.id === selectedCaseId) {
                onClearSelectedCase();
            }
            setCaseToDelete(null);
            window.dispatchEvent(new CustomEvent(SANYUAN_CASES_CHANGED_EVENT));
        } catch (error) {
            console.error('删除三元案例失败:', error);
            alert('删除失败');
        } finally {
            setIsDeleting(false);
        }
    };

    const typeOptions = [
        { label: `全部（${cases.length}）`, value: 'all' },
        ...SANYUAN_CASE_TYPES.map((type) => ({
            label: `${type.name}（${cases.filter((caseData) => caseData.case_type === type.id).length}）`,
            value: type.id,
        })),
    ];

    return (
        <BaseCaseList
            isAuthenticated={isAuthenticated}
            onOpenLibrary={() => setIsLibraryOpen(true)}
            renderFilter={
                <CustomSelect
                    options={typeOptions}
                    value={selectedType}
                    onChange={(value) => setSelectedType(value as SanYuanCaseType | 'all')}
                    className="w-[92px]"
                />
            }
            search={search}
            onSearchChange={setSearch}
            onCreate={() => setIsCreateOpen(true)}
            isLoading={isLoading}
            isEmpty={filteredCases.length === 0}
            emptyText={isAuthenticated ? '暂无案例，点击上方按钮新建' : '登录后可保存案例'}
            modals={
                <>
                    <SanYuanCaseModal
                        isOpen={isCreateOpen || !!editingCase}
                        onClose={() => {
                            setIsCreateOpen(false);
                            setEditingCase(null);
                        }}
                        chartInput={chartInput}
                        initialCase={editingCase}
                        onSaved={handleSaved}
                    />
                    <SanYuanCaseLibraryModal
                        isOpen={isLibraryOpen}
                        onClose={() => setIsLibraryOpen(false)}
                        chartInput={chartInput}
                        selectedCaseId={selectedCaseId}
                        onSelectCase={(caseData) => {
                            onSelectCase(caseData);
                            setIsLibraryOpen(false);
                        }}
                        onClearSelectedCase={onClearSelectedCase}
                    />
                    <ConfirmModal
                        isOpen={!!caseToDelete}
                        onClose={() => setCaseToDelete(null)}
                        onConfirm={() => void executeDelete()}
                        title="删除确认"
                        description={<>确定要删除案例 <span className="font-medium text-foreground">「{caseToDelete?.title}」</span> 吗？此操作无法撤销。</>}
                        confirmText="删除"
                        variant="destructive"
                        loading={isDeleting}
                    />
                </>
            }
        >
            {filteredCases.map((caseData) => (
                <SanYuanCaseCard
                    key={caseData.id}
                    caseData={caseData}
                    isSelected={selectedCaseId === caseData.id}
                    onSelect={() => onSelectCase(caseData)}
                    onEdit={() => setEditingCase(caseData)}
                    onDelete={() => setCaseToDelete(caseData)}
                />
            ))}
        </BaseCaseList>
    );
}
