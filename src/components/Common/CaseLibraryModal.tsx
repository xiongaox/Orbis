
import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Search, Plus, Upload, Library } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import BaseModal from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import { useLayoutMode } from '../../hooks/useLayoutMode';

export interface CategorySpec {
    id: string | null;
    name: string;
}

export interface CaseLibraryModalProps<T extends { id: string }> {
    isOpen: boolean;
    onClose: () => void;
    selectedCaseId?: string | null;
    onSelectCase?: (caseId: string | null, caseItem?: T) => void;

    fetchCases: () => Promise<T[]>;
    deleteCase: (id: string) => Promise<void>;
    refreshEventName: string;

    categories: CategorySpec[];
    getCategoryCount: (catId: string | null, cases: T[]) => number;
    filterFn: (item: T, search: string, categoryId: string | null) => boolean;

    renderCard: (props: {
        caseData: T;
        isSelected: boolean;
        onSelect: () => void;
        onEdit: () => void;
        onDelete: () => void;
    }) => ReactNode;

    renderSubModals: (props: {
        showCreateModal: boolean;
        showImportModal: boolean;
        editingCase: T | null;
        closeCreateModal: () => void;
        closeImportModal: () => void;
        closeEditModal: () => void;
        refreshData: () => void;
        /** 弹窗内已加载的全量案例（导出等子弹窗的数据源） */
        cases: T[];
    }) => ReactNode;

    getItemName: (item: T) => string;

    /** 操作栏自定义动作（如导出按钮），渲染在导入之后 */
    extraActions?: ReactNode;
}

export default function CaseLibraryModal<T extends { id: string }>({
    isOpen,
    onClose,
    selectedCaseId,
    onSelectCase,
    fetchCases,
    deleteCase,
    refreshEventName,
    categories,
    getCategoryCount,
    filterFn,
    renderCard,
    renderSubModals,
    getItemName,
    extraActions,
}: CaseLibraryModalProps<T>) {
    const [cases, setCases] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0]?.id ?? null);

    // 子弹窗状态
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingCase, setEditingCase] = useState<T | null>(null);
    const [caseToDelete, setCaseToDelete] = useState<T | null>(null);
    const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

    // 移动端检测：与全应用统一走 useLayoutMode
    const { isMobile } = useLayoutMode();

    // 加载案例（数据源默认序 = 新建顺序，见各 caseService.getCases）
    const loadCases = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchCases();
            setCases(data);
        } catch (error) {
            console.error('Failed to load cases:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchCases]);

    useEffect(() => {
        if (isOpen) {
            loadCases();
        }
    }, [isOpen, loadCases]);

    useEffect(() => {
        const handleCasesChanged = () => {
            if (isOpen) {
                loadCases();
            }
        };
        window.addEventListener(refreshEventName, handleCasesChanged);
        return () => window.removeEventListener(refreshEventName, handleCasesChanged);
    }, [isOpen, loadCases, refreshEventName]);

    // 筛选后的案例（保持数据源顺序，不提供自定义排序）
    const filteredCases = useMemo(() => {
        return cases.filter(item => filterFn(item, search, selectedCategory));
    }, [cases, search, selectedCategory, filterFn]);

    // 删除案例
    const executeDelete = async () => {
        if (!caseToDelete) return;
        setDeletingCaseId(caseToDelete.id);
        try {
            await deleteCase(caseToDelete.id);
            if (selectedCaseId === caseToDelete.id) {
                onSelectCase?.(null);
            }
            window.dispatchEvent(new CustomEvent(refreshEventName));
            setCaseToDelete(null);
            loadCases();
        } catch (error) {
            console.error('删除案例失败:', error);
            alert('删除失败');
        } finally {
            setDeletingCaseId(null);
        }
    };

    const header = (
        <div className="flex w-full items-center gap-2">
            <span>案例库</span>
            <span className="text-sm font-normal text-muted-foreground">
                ({cases.length})
            </span>
        </div>
    );

    // 正文：移动端 SubPage 与桌面端 BaseModal 共用
    const libraryContent = (
        <>
                {/* 搜索和操作栏 */}
                <div className={`flex gap-2 ${isMobile ? 'mb-2' : 'mb-4'} shrink-0`}>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="搜索案例..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-ring title-outline-none focus:outline-none focus:border-primary/50"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground hover:text-foreground/90 rounded-lg text-sm font-medium transition-colors border border-border cursor-pointer shadow-sm focus-ring"
                    >
                        <Upload className="w-4 h-4" />
                        导入
                    </button>
                    {extraActions}
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors border border-primary/20 cursor-pointer focus-ring"
                    >
                        <Plus className="w-4 h-4" />
                        新建
                    </button>
                </div>

                {/* 主体 */}
                <div className={`flex ${isMobile ? 'flex-col' : ''} gap-2 sm:gap-4 flex-1 min-h-0`}>
                    {/* Tab 菜单 */}
                    <div className={isMobile
                        ? 'flex gap-1 overflow-x-auto shrink-0 pb-1 -mx-1 px-1'
                        : 'w-28 shrink-0 flex flex-col gap-0.5 overflow-y-auto pr-1'
                    }>
                        {categories.map((cat) => {
                            const isActive = cat.id === selectedCategory;
                            const count = getCategoryCount(cat.id, cases);
                            return (
                                <button
                                    key={cat.id ?? 'all'}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`${isMobile ? 'whitespace-nowrap px-2.5 py-1.5 text-xs rounded-md' : 'w-full text-left px-3 py-2 text-sm rounded-md'} transition-colors focus-ring ${isActive
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                        }`}
                                >
                                    {cat.name}
                                    {count > 0 && (
                                        <span className="ml-1 text-xs opacity-60">({count})</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* 右侧案例列表 */}
                    <div className="flex-1 min-w-0 overflow-y-auto">
                        {loading ? (
                            <div className="text-center text-muted-foreground py-12">加载中...</div>
                        ) : filteredCases.length === 0 ? (
                            <div className="text-center text-muted-foreground py-12 rounded-lg border border-dashed border-border bg-secondary/20">
                                {search || selectedCategory !== categories[0]?.id ? '没有匹配的案例' : '暂无案例，点击上方按钮新建'}
                            </div>
                        ) : (
                            <div
                                className={`grid select-none ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}
                                onContextMenu={(e) => e.preventDefault()}
                            >
                                {filteredCases.map((caseData) => renderCard({
                                    caseData,
                                    isSelected: selectedCaseId === caseData.id,
                                    onSelect: () => {
                                        onSelectCase?.(caseData.id, caseData);
                                        if (isMobile) onClose();
                                    },
                                    onEdit: () => setEditingCase(caseData),
                                    onDelete: () => setCaseToDelete(caseData),
                                }))}
                            </div>
                        )}
                    </div>
                </div>
        </>
    );

    // 子弹窗节点：两种壳下都渲染
    const subModals = (
        <>
            {/* 子弹窗渲染器 */}
            {renderSubModals({
                showCreateModal,
                showImportModal,
                editingCase,
                closeCreateModal: () => setShowCreateModal(false),
                closeImportModal: () => setShowImportModal(false),
                closeEditModal: () => setEditingCase(null),
                refreshData: loadCases,
                cases
            })}

            <ConfirmModal
                isOpen={!!caseToDelete}
                onClose={() => setCaseToDelete(null)}
                onConfirm={executeDelete}
                title="删除确认"
                description={<>确定要删除案例 <span className="font-medium text-foreground">「{caseToDelete ? getItemName(caseToDelete) : ''}」</span> 吗？此操作无法撤销。</>}
                confirmText="删除"
                variant="destructive"
                loading={!!deletingCaseId}
            />
        </>
    );

    // 移动端：统一二级页面壳（返回手势 + 统一页头）；此前是 max-w-sm 的小弹窗，列表非常局促
    if (isMobile) {
        return (
            <>
                <SubPage
                    isOpen={isOpen}
                    onClose={onClose}
                    title={header}
                    bodyClassName="overflow-hidden select-none flex flex-col p-3"
                >
                    {libraryContent}
                </SubPage>
                {subModals}
            </>
        );
    }

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title={header}
                titleIcon={<Library className="w-5 h-5" />}
                // 桌面端两列网格下单卡约 356px，与移动端手机整宽卡片同档；
                // max-w-2xl 时代单卡仅 ~250px，卡片定稿为整宽设计后会出现姓名截断、日期竖排折行
                maxWidth="max-w-4xl"
                bodyClassName="!flex-none select-none flex flex-col h-[70vh] p-4 sm:p-6 overflow-hidden"
            >
                {libraryContent}
            </BaseModal>
            {subModals}
        </>
    );
}
