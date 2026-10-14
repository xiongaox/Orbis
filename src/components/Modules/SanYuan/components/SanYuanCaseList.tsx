import { useCallback, useEffect, useMemo, useState } from 'react';
import { SANYUAN_CASES_CHANGED_EVENT } from '../../../../data/caseConstants';
import type { SanYuanInput } from '../../../../lib/sanyuan';
import {
    SANYUAN_CASE_TYPES,
    sanyuanCaseService,
    type SanYuanCase,
    type SanYuanCaseType,
} from '../../../../services/sanyuanCaseService';
import BaseCaseList from '../../../Common/BaseCaseList';
import CategoryFilterDropdown from '../../../Common/CategoryFilterDropdown';
import SortFieldButton, { type SortState } from '../../../Common/SortFieldButton';
import { useToast } from '../../../../hooks/useToast';
import SanYuanCaseLibraryModal from './SanYuanCaseLibraryModal';
import SanYuanCaseCard from './SanYuanCaseCard';
import SanYuanCaseModal from './SanYuanCaseModal';
import { SANYUAN_SORT_OPTIONS, compareSanYuanCase } from '../caseSort';

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
    const [cases, setCases] = useState<SanYuanCase[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedType, setSelectedType] = useState<SanYuanCaseType | 'all'>('all');
    // 字段排序（时间/分类）：field 为 null 表示默认（创建时间倒序），与奇门侧栏同构
    const [sort, setSort] = useState<SortState>({ field: null, dir: 'desc' });
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCase, setEditingCase] = useState<SanYuanCase | null>(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const { toast, showToast } = useToast();

    const loadCases = useCallback(async () => {
        setIsLoading(true);
        try {
            setCases(await sanyuanCaseService.getCases());
        } catch (error) {
            console.error('加载三元案例失败:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadCases();
    }, [loadCases]);

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

    // 筛选 → 字段排序（未选字段时保持服务端的创建时间倒序）
    const sortedCases = sort.field
        ? [...filteredCases].sort((a, b) => compareSanYuanCase(a, b, sort.field as string) * (sort.dir === 'asc' ? 1 : -1))
        : filteredCases;

    const handleSaved = (caseData: SanYuanCase) => {
        const shouldSelect = !editingCase || editingCase.id === selectedCaseId;
        setIsCreateOpen(false);
        setEditingCase(null);
        if (shouldSelect) {
            onSelectCase(caseData);
        }
        window.dispatchEvent(new CustomEvent(SANYUAN_CASES_CHANGED_EVENT));
    };

    // 删除案例：左滑即删，无二次确认（与八字/奇门侧栏一致，可批量连删）
    const handleDeleteCase = async (id: string, title: string) => {
        try {
            await sanyuanCaseService.deleteCase(id);
            if (id === selectedCaseId) {
                onClearSelectedCase();
            }
            window.dispatchEvent(new CustomEvent(SANYUAN_CASES_CHANGED_EVENT));
        } catch (error) {
            console.error(`删除三元案例失败（${title}）:`, error);
            showToast('删除失败，请重试', 'error');
        }
    };

    const FILTER_TYPES = [{ id: 'all', name: '全部' }, ...SANYUAN_CASE_TYPES] as const;
    const currentTypeName = FILTER_TYPES.find((type) => type.id === selectedType)?.name ?? '全部';

    return (
        <BaseCaseList
            scrollKey="sanyuan"
            onOpenLibrary={() => setIsLibraryOpen(true)}
            renderFilter={
                <CategoryFilterDropdown
                    label={currentTypeName}
                    count={sortedCases.length}
                    selectedId={selectedType}
                    onSelect={(id) => setSelectedType(id as SanYuanCaseType | 'all')}
                    options={FILTER_TYPES.map((type) => ({
                        id: type.id,
                        name: type.name,
                        count: type.id === 'all' ? cases.length : cases.filter((caseData) => caseData.case_type === type.id).length,
                    }))}
                />
            }
            search={search}
            onSearchChange={setSearch}
            extraActions={
                <SortFieldButton options={SANYUAN_SORT_OPTIONS} value={sort} onChange={setSort} />
            }
            onCreate={() => setIsCreateOpen(true)}
            isLoading={isLoading}
            isEmpty={sortedCases.length === 0}
            emptyText="暂无案例"
            feedback={toast}
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
                </>
            }
        >
            {sortedCases.map((caseData) => (
                <SanYuanCaseCard
                    key={caseData.id}
                    caseData={caseData}
                    isSelected={selectedCaseId === caseData.id}
                    onSelect={() => onSelectCase(caseData)}
                    onEdit={() => setEditingCase(caseData)}
                    onDelete={() => handleDeleteCase(caseData.id, caseData.title)}
                />
            ))}
        </BaseCaseList>
    );
}
