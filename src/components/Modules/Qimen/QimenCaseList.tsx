import { useState, useEffect } from 'react';
import { qimenCaseService, type QimenCase, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';
import QimenCaseLibraryModal from './QimenCaseLibraryModal';
import { QIMEN_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import BaseCaseList from '../../Common/BaseCaseList';
import CategoryFilterDropdown from '../../Common/CategoryFilterDropdown';
import QimenCaseCard from './QimenCaseCard';
import SortFieldButton, { type SortState } from '../../Common/SortFieldButton';
import { QIMEN_SORT_OPTIONS, compareQimenCase } from './caseSort';
import type { PaiPanMethod } from '../../../lib/csp-qimen/qimenService';

interface QimenCaseListProps {
    selectedCaseId: string | null;
    onSelectCase: (id: string, k: QimenCase) => void;
    onOpenDatePicker?: () => void;
    onDeleteCase?: (id: string) => void;
    onEditCase?: (caseItem: QimenCase) => void;
    refreshTrigger?: number; // Trigger refresh
    variant?: 'sidebar' | 'drawer';
    /** 当前页面排盘方法：旧案例盘状态的兜底计算依据 */
    paiPanMethod?: PaiPanMethod;
}

export default function QimenCaseList({
    selectedCaseId,
    onSelectCase,
    onOpenDatePicker,
    onDeleteCase,
    onEditCase,
    refreshTrigger = 0,
    variant = 'sidebar',
    paiPanMethod = 'zhirun'
}: QimenCaseListProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    // 字段排序（时间/分类）：field 为 null 表示默认（创建时间倒序）
    const [sort, setSort] = useState<SortState>({ field: null, dir: 'desc' });

    const [cases, setCases] = useState<QimenCase[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCases = async () => {
        setIsLoading(true);
        try {
            const data = await qimenCaseService.getCases();
            setCases(data);
        } catch (error) {
            console.error("Fetch cases failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
    }, [refreshTrigger]);

    useEffect(() => {
        const handleCasesChanged = () => {
            fetchCases();
        };
        window.addEventListener(QIMEN_CASES_CHANGED_EVENT, handleCasesChanged);
        return () => window.removeEventListener(QIMEN_CASES_CHANGED_EVENT, handleCasesChanged);
    }, []);

    // 筛选 → 字段排序（未选字段时保持服务端的创建时间倒序）
    const filteredCases = cases.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });
    const sortedCases = sort.field
        ? [...filteredCases].sort((a, b) => compareQimenCase(a, b, sort.field as string) * (sort.dir === 'asc' ? 1 : -1))
        : filteredCases;

    const FILTER_CATEGORIES = [{ id: 'all', name: '全部' }, ...QIMEN_CATEGORIES];
    const currentCategoryName = FILTER_CATEGORIES.find(c => c.id === selectedCategory)?.name || '未知';

    return (
        <BaseCaseList
            variant={variant}
            scrollKey="qimen"
            onOpenLibrary={() => setShowLibraryModal(true)}
            renderFilter={
                <CategoryFilterDropdown
                    label={currentCategoryName}
                    count={filteredCases.length}
                    selectedId={selectedCategory}
                    onSelect={setSelectedCategory}
                    options={FILTER_CATEGORIES.map((cat) => ({
                        id: cat.id,
                        name: cat.name,
                        count: cat.id === 'all' ? cases.length : cases.filter(c => c.category === cat.id).length,
                    }))}
                />
            }
            search={search}
            onSearchChange={setSearch}
            extraActions={
                <SortFieldButton options={QIMEN_SORT_OPTIONS} value={sort} onChange={setSort} />
            }
            onCreate={onOpenDatePicker}
            isLoading={isLoading}
            isEmpty={sortedCases.length === 0}
            emptyText="暂无案例"
            modals={
                <>
                    <QimenCaseLibraryModal
                        isOpen={showLibraryModal}
                        onClose={() => setShowLibraryModal(false)}
                        selectedCaseId={selectedCaseId}
                        paiPanMethod={paiPanMethod}
                        onSelectCase={(id, k) => {
                            if (id && k) onSelectCase(id, k);
                        }}
                    />
                </>
            }
        >
            {sortedCases.map((caseItem) => (
                <QimenCaseCard
                    key={caseItem.id}
                    caseItem={caseItem}
                    isSelected={selectedCaseId === caseItem.id}
                    paiPanMethod={paiPanMethod}
                    onSelectCase={(id) => onSelectCase(id, caseItem)}
                    onEdit={() => onEditCase?.(caseItem)}
                    onDelete={(id) => onDeleteCase?.(id)}
                />
            ))}
        </BaseCaseList>
    );
}
