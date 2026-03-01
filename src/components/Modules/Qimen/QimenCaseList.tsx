/**
 * QimenCaseList - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default QimenCaseList`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `qimenCaseService` 等 7 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState, useEffect } from 'react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { qimenCaseService, type QimenCase, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';
import QimenCaseLibraryModal, { QIMEN_CASES_CHANGED_EVENT } from './QimenCaseLibraryModal';
import QimenImportModal from './QimenImportModal';
import ExportCaseModal from '../../Common/ExportCaseModal';
import BaseCaseList from '../../Common/BaseCaseList';

interface QimenCaseListProps {
    selectedCaseId: string | null;
    onSelectCase: (id: string, k: QimenCase) => void;
    onLoginClick?: () => void;
    onOpenDatePicker?: () => void;
    onDeleteCase?: (id: string) => void;
    onEditCase?: (caseItem: QimenCase) => void;
    refreshTrigger?: number; // Trigger refresh
    variant?: 'sidebar' | 'drawer';
}

export default function QimenCaseList({
    selectedCaseId,
    onSelectCase,
    onLoginClick,
    onOpenDatePicker,
    onDeleteCase,
    onEditCase,
    refreshTrigger = 0,
    variant = 'sidebar'
}: QimenCaseListProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

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

    const filteredCases = cases.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const FILTER_CATEGORIES = [{ id: 'all', name: '全部' }, ...QIMEN_CATEGORIES];
    const currentCategoryName = FILTER_CATEGORIES.find(c => c.id === selectedCategory)?.name || '未知';

    return (
        <BaseCaseList
            variant={variant}
            isAuthenticated={true} // QimenCaseService 内部处理 Auth
            onLoginClick={onLoginClick}
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
            onExport={() => setShowExportModal(true)}
            onImport={() => setShowImportModal(true)}
            onCreate={onOpenDatePicker}
            isLoading={isLoading}
            isEmpty={filteredCases.length === 0}
            emptyText="暂无案例"
            modals={
                <>
                    <QimenCaseLibraryModal
                        isOpen={showLibraryModal}
                        onClose={() => setShowLibraryModal(false)}
                        selectedCaseId={selectedCaseId}
                        onSelectCase={(id, k) => {
                            if (id && k) onSelectCase(id, k);
                        }}
                        onLoginClick={onLoginClick}
                    />
                    <QimenImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImported={fetchCases} />
                    <ExportCaseModal
                        isOpen={showExportModal}
                        onClose={() => setShowExportModal(false)}
                        title="导出奇门案例"
                        options={QIMEN_CATEGORIES.map((cat) => ({ id: cat.id, name: cat.name }))}
                        cases={cases}
                        getCaseFilter={(c) => c.category}
                        formatCase={(c) => {
                            const categoryName = QIMEN_CATEGORIES.find(cat => cat.id === c.category)?.name || c.category;
                            return {
                                '标题': c.title,
                                '占测时间': c.test_date ? c.test_date.replace('T', ' ').slice(0, 16) : '',
                                '分类': categoryName,
                                '事情描述': c.description || '',
                                '事件反馈': c.feedback || '',
                                '案例断法': c.analysis || '',
                            };
                        }}
                        filename="qimen_cases"
                    />
                </>
            }
        >
            {filteredCases.map((caseItem) => {
                const isSelected = selectedCaseId === caseItem.id;
                const categoryName = QIMEN_CATEGORIES.find(cat => cat.id === caseItem.category)?.name;

                return (
                    <div
                        key={caseItem.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectCase(caseItem.id, caseItem)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onSelectCase(caseItem.id, caseItem);
                            }
                        }}
                        className={`group relative w-full text-left p-3 rounded-xl transition-[box-shadow,transform] duration-300 cursor-pointer border ${isSelected
                            ? 'bg-card border-primary/40 ring-1 ring-primary/20 shadow-md z-10'
                            : 'bg-card border-border/40 dark:border-border/30 shadow-[0_2px_6px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:z-10 hover:border-border/60'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-foreground truncate">{caseItem.title}</span>
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-1 mb-2 h-4">
                                    {caseItem.description || ''}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {caseItem.test_date ? (() => {
                                        const d = new Date(caseItem.test_date);
                                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                    })() : ''}
                                </div>
                            </div>
                            <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary/80">
                                    {categoryName}
                                </span>
                                <div className="flex gap-1.5 mt-auto">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onEditCase?.(caseItem); }}
                                        className="p-1.5 rounded-md border border-border hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                        aria-label="编辑"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onDeleteCase?.(caseItem.id); }}
                                        className="p-1.5 rounded-md border border-border hover:border-red-400 hover:bg-red-100 dark:hover:bg-destructive/20 text-muted-foreground hover:text-red-500"
                                        aria-label="删除"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </BaseCaseList>
    );
}
