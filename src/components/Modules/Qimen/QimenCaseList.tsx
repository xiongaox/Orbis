/**
 * 奇门遁甲模块 - 案例列表组件
 * 左侧显示案例列表，支持起盘功能
 */
import { useState, useEffect } from 'react';
import { Search, ChevronDown, Pencil, Trash2, Import as ImportIcon } from 'lucide-react';
import { qimenCaseService, type QimenCase, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';
import QimenCaseLibraryModal, { QIMEN_CASES_CHANGED_EVENT } from './QimenCaseLibraryModal';
import QimenImportModal from './QimenImportModal';

interface QimenCaseListProps {
    selectedCaseId: string | null;
    onSelectCase: (id: string, k: QimenCase) => void;
    onLoginClick?: () => void;
    onOpenDatePicker?: () => void;
    onDeleteCase?: (id: string) => void;
    onEditCase?: (caseItem: QimenCase) => void;
    refreshTrigger?: number; // Trigger refresh
}

export default function QimenCaseList({
    selectedCaseId,
    onSelectCase,
    onLoginClick,
    onOpenDatePicker,
    onDeleteCase,
    onEditCase,
    refreshTrigger = 0
}: QimenCaseListProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Real Data State
    const [cases, setCases] = useState<QimenCase[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch Cases
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

    // Listen for case changes (e.g. from Library Modal)
    useEffect(() => {
        const handleCasesChanged = () => {
            fetchCases();
        };
        window.addEventListener(QIMEN_CASES_CHANGED_EVENT, handleCasesChanged);
        return () => window.removeEventListener(QIMEN_CASES_CHANGED_EVENT, handleCasesChanged);
    }, []);

    // 筛选案例
    const filteredCases = cases.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
        // Simple category filtering (need to handle 'all')
        const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Filter Categories (includes "All")
    const FILTER_CATEGORIES = [{ id: 'all', name: '全部' }, ...QIMEN_CATEGORIES];
    const currentCategoryName = FILTER_CATEGORIES.find(c => c.id === selectedCategory)?.name || '未知';

    return (
        <aside className="w-full h-full bg-sidebar border-r border-sidebar-border flex flex-col min-h-0">


            {/* 标题栏与操作 */}
            <div className="p-4 border-b border-sidebar-border space-y-3">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setShowLibraryModal(true)}
                        className="font-display text-base font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                    >
                        案例库
                        <Search className="w-3.5 h-3.5 opacity-0 -ml-1 group-hover:opacity-50 transition-opacity" />
                    </button>

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
                                            {/* Count logic */}
                                            {cat.id === 'all'
                                                ? cases.length
                                                : cases.filter(c => c.category === cat.id).length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 搜索框 */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="搜索案例..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:border-primary/50 focus:outline-none text-foreground placeholder:text-muted-foreground transition-all"
                    />
                </div>

                {/* 操作按钮组 (导入/新建) */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border"
                        title="导入JSON格式案例"
                    >
                        <ImportIcon className="w-3.5 h-3.5" />
                        导入
                    </button>
                    <button
                        type="button"
                        onClick={onOpenDatePicker}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors border border-primary/30"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                        新建
                    </button>
                </div>
            </div>

            {/* 案例列表 */}
            <div className="flex-1 overflow-y-auto p-3">
                {isLoading ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        加载中...
                    </div>
                ) : filteredCases.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        暂无案例
                    </div>
                ) : (
                    <div className="space-y-2">
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
                                        {/* 左侧内容 */}
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
                                        {/* 右侧内容 */}
                                        <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                                            {/* 顶部：分类标签 */}
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary/80">
                                                {categoryName}
                                            </span>
                                            {/* 底部：操作按钮 */}
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
                    </div>
                )}
            </div>

            {/* 案例库弹窗 */}
            <QimenCaseLibraryModal
                isOpen={showLibraryModal}
                onClose={() => setShowLibraryModal(false)}
                selectedCaseId={selectedCaseId}
                onSelectCase={(id, k) => {
                    if (id && k) onSelectCase(id, k);
                }}
                onLoginClick={onLoginClick}
            />

            {/* 导入案例弹窗 */}
            <QimenImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImported={() => {
                    fetchCases(); // Refresh list on import success
                }}
            />
        </aside>
    );
}
