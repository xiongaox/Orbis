/**
 * 奇门遁甲模块 - 案例列表组件
 * 左侧显示案例列表，支持起盘功能
 */
import { useState, useEffect } from 'react';
import { Search, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { qimenCaseService, type QimenCase, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';



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
    onOpenDatePicker,
    onDeleteCase,
    onEditCase,
    refreshTrigger = 0
}: QimenCaseListProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    // Real Data State
    const [cases, setCases] = useState<QimenCase[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch Cases
    useEffect(() => {
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
        fetchCases();
    }, [refreshTrigger]);

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
            {/* Loading Indicator */}
            {isLoading && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 overflow-hidden z-20">
                    <div className="h-full bg-primary animate-progress origin-left"></div>
                </div>
            )}

            {/* 标题栏与操作 */}
            <div className="p-4 border-b border-sidebar-border space-y-3">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        className="font-display text-base font-medium text-foreground hover:text-primary transition-colors"
                    >
                        案例库
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
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
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
                {filteredCases.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        暂无案例
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredCases.map((caseItem) => (
                            <div
                                key={caseItem.id}
                                className={`w-full p-3 rounded-lg transition-all border group relative ${selectedCaseId === caseItem.id
                                    ? 'bg-sidebar-accent border-primary/30'
                                    : 'bg-card border-border/60 hover:border-border hover:shadow-sm dark:bg-sidebar-accent/30 dark:border-sidebar-border/50 dark:hover:bg-sidebar-accent/50'
                                    }`}
                            >
                                <div
                                    className="cursor-pointer"
                                    onClick={() => onSelectCase(caseItem.id, caseItem)}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="text-sm font-medium text-foreground line-clamp-2 flex-1 pr-2">
                                            {caseItem.title}
                                        </div>
                                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium whitespace-nowrap">
                                            {QIMEN_CATEGORIES.find(cat => cat.id === caseItem.category)?.name}
                                        </span>
                                    </div>

                                    <div className="text-xs text-muted-foreground line-clamp-1 mb-2 h-4">
                                        {caseItem.description || ''}
                                    </div>

                                    <div className="flex items-center justify-between text-xs mt-2">
                                        <span className="text-muted-foreground">
                                            {caseItem.test_date ? (() => {
                                                const d = new Date(caseItem.test_date);
                                                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                            })() : ''}
                                        </span>
                                    </div>
                                </div>

                                {/* Edit/Delete Buttons (Bottom Right) */}
                                <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditCase?.(caseItem);
                                        }}
                                        className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                                        title="编辑"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteCase?.(caseItem.id);
                                        }}
                                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                                        title="删除"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
