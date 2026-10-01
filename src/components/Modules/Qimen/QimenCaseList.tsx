import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { qimenCaseService, type QimenCase, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';
import QimenCaseLibraryModal from './QimenCaseLibraryModal';
import { QIMEN_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import BaseCaseList from '../../Common/BaseCaseList';
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
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
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
            onOpenLibrary={() => setShowLibraryModal(true)}
            renderFilter={
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                        {currentCategoryName}
                        <span className="text-muted-foreground/60">({filteredCases.length})</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCategoryOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-sidebar border border-sidebar-border rounded-lg shadow-lg p-2 z-20">
                            {FILTER_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategory(cat.id);
                                        setIsCategoryOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors ${selectedCategory === cat.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-foreground hover:bg-sidebar-accent/60'
                                        }`}
                                >
                                    <span>{cat.name}</span>
                                    <span className="text-muted-foreground/60">
                                        {cat.id === 'all'
                                            ? cases.length
                                            : cases.filter(c => c.category === cat.id).length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
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
