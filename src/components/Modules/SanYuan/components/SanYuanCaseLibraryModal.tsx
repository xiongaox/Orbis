import { useCallback, useEffect, useMemo, useState } from 'react';
import { Library, Plus, Search } from 'lucide-react';
import { useAuth } from '../../../../contexts/useAuth';
import { SANYUAN_CASES_CHANGED_EVENT } from '../../../../data/caseConstants';
import type { SanYuanInput } from '../../../../lib/sanyuan';
import {
    SANYUAN_CASE_TYPES,
    sanyuanCaseService,
    type SanYuanCase,
    type SanYuanCaseType,
} from '../../../../services/sanyuanCaseService';
import ConfirmModal from '../../../Common/ConfirmModal';
import BaseModal from '../../../UI/BaseModal';
import CustomSelect from '../../../UI/CustomSelect';
import SanYuanCaseCard from './SanYuanCaseCard';
import SanYuanCaseModal from './SanYuanCaseModal';

interface SanYuanCaseLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    chartInput: SanYuanInput;
    selectedCaseId: string | null;
    onSelectCase: (caseData: SanYuanCase) => void;
    onClearSelectedCase: () => void;
}

export default function SanYuanCaseLibraryModal({
    isOpen,
    onClose,
    chartInput,
    selectedCaseId,
    onSelectCase,
    onClearSelectedCase,
}: SanYuanCaseLibraryModalProps) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [cases, setCases] = useState<SanYuanCase[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedType, setSelectedType] = useState<SanYuanCaseType | 'all'>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCase, setEditingCase] = useState<SanYuanCase | null>(null);
    const [caseToDelete, setCaseToDelete] = useState<SanYuanCase | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadCases = useCallback(async () => {
        if (!isAuthenticated) {
            setCases([]);
            return;
        }

        setIsLoading(true);
        try {
            setCases(await sanyuanCaseService.getCases());
        } catch (error) {
            console.error('加载三元案例库失败:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isOpen && !authLoading) {
            void loadCases();
        }
    }, [authLoading, isOpen, loadCases]);

    useEffect(() => {
        const handleCasesChanged = () => {
            if (isOpen) {
                void loadCases();
            }
        };
        window.addEventListener(SANYUAN_CASES_CHANGED_EVENT, handleCasesChanged);
        return () => window.removeEventListener(SANYUAN_CASES_CHANGED_EVENT, handleCasesChanged);
    }, [isOpen, loadCases]);

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

    const typeOptions = [
        { label: `全部（${cases.length}）`, value: 'all' },
        ...SANYUAN_CASE_TYPES.map((type) => ({
            label: `${type.name}（${cases.filter((caseData) => caseData.case_type === type.id).length}）`,
            value: type.id,
        })),
    ];

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

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title={`案例库（${cases.length}）`}
                titleIcon={<Library className="w-5 h-5" />}
                maxWidth="max-w-3xl"
                bodyClassName="flex min-h-[65vh] flex-col overflow-hidden p-4 sm:p-6"
            >
                {!isAuthenticated ? (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/20 text-sm text-muted-foreground">
                        登录后可管理您的三元天星案例
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2">
                            <div className="relative min-w-[12rem] flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="搜索名称或地点..."
                                    className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-ring"
                                />
                            </div>
                            <CustomSelect
                                options={typeOptions}
                                value={selectedType}
                                onChange={(value) => setSelectedType(value as SanYuanCaseType | 'all')}
                                className="w-[112px]"
                            />
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-ring"
                            >
                                <Plus className="h-4 w-4" />
                                新建
                            </button>
                        </div>

                        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="py-12 text-center text-sm text-muted-foreground">加载中...</div>
                            ) : filteredCases.length === 0 ? (
                                <div className="py-12 text-center text-sm text-muted-foreground">暂无匹配案例</div>
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {filteredCases.map((caseData) => (
                                        <SanYuanCaseCard
                                            key={caseData.id}
                                            caseData={caseData}
                                            isSelected={caseData.id === selectedCaseId}
                                            onSelect={() => {
                                                onSelectCase(caseData);
                                                onClose();
                                            }}
                                            onEdit={() => setEditingCase(caseData)}
                                            onDelete={() => setCaseToDelete(caseData)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </BaseModal>

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
    );
}
