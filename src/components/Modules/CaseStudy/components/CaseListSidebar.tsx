/**
 * 案例列表侧边栏 - 包含日主筛选、搜索、列表、分页
 */
import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { DAY_MASTER_CATEGORIES } from '../../../../lib/caseStudy/types';

interface CaseItem {
    id: string;
    title: string;
    bazi: string;
    content: string;
    dayMaster: string;
    author: string;
}

interface CaseListSidebarProps {
    allCases: CaseItem[];
    displayCases: CaseItem[];
    selectedCaseId: string | null;
    selectedDayMaster: string;
    searchTerm: string;
    currentPage: number;
    totalPages: number;
    onSelectCase: (id: string) => void;
    onSelectDayMaster: (id: string) => void;
    onSearchChange: (term: string) => void;
    onPageChange: (page: number) => void;
    onSelectAuthor: (author: string) => void;
}

export default function CaseListSidebar({
    allCases,
    displayCases,
    selectedCaseId,
    selectedDayMaster,
    searchTerm,
    currentPage,
    totalPages,
    onSelectCase,
    onSelectDayMaster,
    onSearchChange,
    onPageChange,
    onSelectAuthor,
}: CaseListSidebarProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <div className="w-[15%] border-r border-border bg-card flex flex-col min-w-[200px]">
            <div className="p-3 border-b border-border space-y-2">
                <h3 className="font-medium text-sm">案例列表</h3>

                {/* 日主分类下拉菜单 */}
                <div className="relative group">
                    {isDropdownOpen && (
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsDropdownOpen(false)}
                        />
                    )}

                    <div
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full px-3 py-2 text-sm bg-muted/40 border border-border/60 rounded-lg cursor-pointer hover:bg-muted/60 flex items-center justify-between transition-all"
                    >
                        <span className="truncate flex items-center gap-2">
                            <span className={selectedDayMaster === 'all' ? 'font-medium' : ''}>
                                {DAY_MASTER_CATEGORIES.find(c => c.id === selectedDayMaster)?.label || '全部'}
                            </span>
                            <span className="text-muted-foreground/60 text-xs">
                                {selectedDayMaster === 'all'
                                    ? allCases.length
                                    : allCases.filter(c => c.dayMaster === selectedDayMaster).length}
                            </span>
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/70 transition-transform duration-200 group-hover:text-foreground ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border shadow-md rounded-lg z-20 max-h-[300px] overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                            {DAY_MASTER_CATEGORIES.map(cat => {
                                const count = cat.id === 'all'
                                    ? allCases.length
                                    : allCases.filter(c => c.dayMaster === cat.id).length;
                                const isSelected = selectedDayMaster === cat.id;

                                return (
                                    <div
                                        key={cat.id}
                                        onClick={() => {
                                            onSelectDayMaster(cat.id);
                                            onPageChange(1);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`
                                            px-3 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors
                                            ${isSelected ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}
                                        `}
                                    >
                                        <span>{cat.label}</span>
                                        <span className={`text-xs ${isSelected ? 'text-foreground/80' : 'text-muted-foreground/50'}`}>
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="搜索案例..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-muted/40 border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all hover:bg-muted/60"
                    />
                </div>
            </div>

            {/* Case List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {displayCases.length > 0 ? (
                    displayCases.map((item) => (
                        <div
                            key={item.id}
                            className={`p-2 rounded text-sm cursor-pointer transition-all border ${selectedCaseId === item.id
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                                }`}
                            onClick={() => onSelectCase(item.id)}
                        >
                            <div className="truncate font-medium text-foreground">{item.title}</div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-xs opacity-70 truncate font-mono">{item.bazi}</span>
                                <span
                                    className="text-xs text-muted-foreground/70 hover:text-primary flex-shrink-0 ml-2 cursor-pointer hover:underline transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectAuthor(item.author);
                                    }}
                                >
                                    作者：{item.author}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-xs text-muted-foreground py-8">
                        无匹配案例
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-2 border-t border-border flex items-center justify-center gap-2 bg-card/50">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-muted-foreground font-mono">
                        {currentPage}/{totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
