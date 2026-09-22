/**
 * CaseListSidebar - 应用源码层
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
 * - `default CaseListSidebar`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `constants`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, KeyRound, Lock } from 'lucide-react';
import { DAY_MASTER_CATEGORIES, QIMEN_CATEGORIES } from '../../../../lib/caseStudy/constants';
import type { CaseItem } from '../hooks/useCaseStudy';

interface CaseListSidebarProps {
    allCases: CaseItem[];
    displayCases: CaseItem[];
    selectedCaseId: string | null;
    selectedDayMaster: string;
    searchTerm: string;
    currentPage: number;
    totalPages: number;
    selectedCategory: string;
    onSelectCase: (id: string) => void;
    onSelectDayMaster: (id: string) => void;
    onSearchChange: (term: string) => void;
    onPageChange: (page: number) => void;
    onSelectAuthor: (author: string) => void;
    variant?: 'sidebar' | 'drawer';
    hidePagination?: boolean;
    /** 试读态：列表仅含试读样章，作者生平不可点开 */
    isPreviewMode?: boolean;
    /** 试读态下的激活入口 */
    onRequestActivate?: () => void;
    /** 各分类在全库中的真实篇数（键为 `域/分类`），试读态用于展示真实规模 */
    libraryGroupTotals?: Record<string, number>;
    /** 全库篇数 */
    libraryTotal?: number;
    /** 每个分类开放的试读篇数 */
    previewsPerGroup?: number;
}

export default function CaseListSidebar({
    allCases,
    displayCases,
    selectedCaseId,
    selectedDayMaster,
    searchTerm,
    currentPage,
    totalPages,
    selectedCategory,
    onSelectCase,
    onSelectDayMaster,
    onSearchChange,
    onPageChange,
    onSelectAuthor,
    variant = 'sidebar',
    hidePagination = false,
    isPreviewMode = false,
    onRequestActivate,
    libraryGroupTotals,
    libraryTotal = 0,
    previewsPerGroup = 0,
}: CaseListSidebarProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // 根据选中的术数类别决定显示的筛选列表
    const categories = selectedCategory === 'qimen' ? QIMEN_CATEGORIES : DAY_MASTER_CATEGORIES;

    // 试读态下列表只有样章，分类篇数仍按全库真实规模展示
    const countOfGroup = (groupId: string) => {
        if (!libraryGroupTotals) {
            return allCases.filter(c => c.category === selectedCategory && (groupId === 'all' || c.dayMaster === groupId)).length;
        }
        if (groupId !== 'all') return libraryGroupTotals[`${selectedCategory}/${groupId}`] ?? 0;
        // 全部 = 该术数域下所有分类之和（含不参与试读挑篇的栏目）
        const prefix = `${selectedCategory}/`;
        return Object.entries(libraryGroupTotals).reduce((sum, [key, count]) => key.startsWith(prefix) ? sum + count : sum, 0);
    };

    // 试读态列表底部说明：当前筛选的可试读篇数 vs 全库篇数
    const previewCountInScope = allCases.filter(c => c.category === selectedCategory && (selectedDayMaster === 'all' || c.dayMaster === selectedDayMaster)).length;
    const scopeTotalInLibrary = countOfGroup(selectedDayMaster);

    const containerClassName = variant === 'drawer'
        ? 'w-full h-full bg-transparent flex flex-col'
        : 'w-[15%] h-full border-r border-border bg-card flex flex-col min-w-[200px]';

    return (
        <div className={containerClassName}>
            <div className="p-3 border-b border-border space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{isPreviewMode ? '案例试读' : '案例列表'}</h3>
                    {/* 分页控件 */}
                    {!hidePagination && totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs text-muted-foreground font-mono min-w-[36px] text-center">
                                {currentPage}/{totalPages}
                            </span>
                            <button
                                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* 试读态说明与激活入口 */}
                {isPreviewMode && (
                    <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 space-y-2">
                        <div className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-medium text-foreground">试读模式</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                            全库 {libraryTotal} 篇，每个分类开放 {previewsPerGroup} 篇试读
                        </p>
                        <button
                            type="button"
                            onClick={onRequestActivate}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-xs font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            <KeyRound className="w-3.5 h-3.5" />
                            激活解锁全文
                        </button>
                    </div>
                )}

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
                                {categories.find(c => c.id === selectedDayMaster)?.label || '全部'}
                            </span>
                            <span className="text-muted-foreground/60 text-xs">
                                {countOfGroup(selectedDayMaster)}
                            </span>
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/70 transition-transform duration-200 group-hover:text-foreground ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border shadow-md rounded-lg z-20 max-h-[300px] overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                            {categories.map(cat => {
                                const count = countOfGroup(cat.id);
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
                        className="w-full pl-9 pr-3 py-2 text-sm bg-muted/40 border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all hover:bg-muted/60 placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>

            {/* Case List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {displayCases.length > 0 ? (
                    displayCases.map((item) => (
                        <div
                            key={item.id}
                            className={`p-2.5 rounded-lg text-sm cursor-pointer transition-[box-shadow,transform,background-color,border-color] duration-300 border ${selectedCaseId === item.id
                                ? 'bg-primary/10 border-primary/30 text-primary shadow-md shadow-primary/10'
                                : 'border-border/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5'
                                }`}
                            onClick={() => onSelectCase(item.id)}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="truncate font-medium text-foreground">{item.title}</span>
                                {item.isPreview && (
                                    <span className="shrink-0 text-[10px] leading-none px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">
                                        试读
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-xs opacity-70 truncate font-mono">{item.bazi}</span>
                                <span
                                    className={`text-xs text-muted-foreground/70 flex-shrink-0 ml-2 transition-colors ${isPreviewMode
                                        ? ''
                                        : 'cursor-pointer hover:text-primary hover:underline'
                                        }`}
                                    onClick={isPreviewMode ? undefined : (e) => {
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

            {/* 试读态：说明当前筛选的可读范围 */}
            {isPreviewMode && (
                <div className="p-2.5 border-t border-border text-[11px] leading-relaxed text-muted-foreground text-center">
                    当前筛选共 {scopeTotalInLibrary} 篇 · 可试读 {previewCountInScope} 篇
                </div>
            )}

        </div>
    );
}
