import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Search, Plus, Upload, LogIn, Library } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';
import BaseModal from '../UI/BaseModal';

export interface CategorySpec {
    id: string | null;
    name: string;
}

export interface CaseLibraryModalProps<T extends { id: string }> {
    isOpen: boolean;
    onClose: () => void;
    selectedCaseId?: string | null;
    onSelectCase?: (caseId: string | null, caseItem?: T) => void;
    onLoginClick?: () => void;

    fetchCases: () => Promise<T[]>;
    updateSortOrder?: (ids: string[]) => Promise<void>;
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
    }) => ReactNode;

    getItemName: (item: T) => string;
}

export default function CaseLibraryModal<T extends { id: string }>({
    isOpen,
    onClose,
    selectedCaseId,
    onSelectCase,
    onLoginClick,
    fetchCases,
    updateSortOrder,
    deleteCase,
    refreshEventName,
    categories,
    getCategoryCount,
    filterFn,
    renderCard,
    renderSubModals,
    getItemName,
}: CaseLibraryModalProps<T>) {
    const { isAuthenticated, loading: authLoading } = useAuth();
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

    // 移动端检测
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // 拖拽 sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // 加载案例
    const loadCases = useCallback(async () => {
        if (!isAuthenticated) {
            setCases([]);
            return;
        }
        setLoading(true);
        try {
            const data = await fetchCases();
            setCases(data);
        } catch (error) {
            console.error('Failed to load cases:', error);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, fetchCases]);

    useEffect(() => {
        if (isOpen && !authLoading) {
            loadCases();
        }
    }, [isOpen, authLoading, loadCases]);

    useEffect(() => {
        const handleCasesChanged = () => {
            if (isAuthenticated && isOpen) {
                loadCases();
            }
        };
        window.addEventListener(refreshEventName, handleCasesChanged);
        return () => window.removeEventListener(refreshEventName, handleCasesChanged);
    }, [isAuthenticated, isOpen, loadCases, refreshEventName]);

    // 筛选后的案例
    const filteredCases = useMemo(() => {
        return cases.filter(item => filterFn(item, search, selectedCategory));
    }, [cases, search, selectedCategory, filterFn]);

    // 拖拽结束处理
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = cases.findIndex(c => c.id === active.id);
        const newIndex = cases.findIndex(c => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newCases = arrayMove(cases, oldIndex, newIndex);
            setCases(newCases);

            if (updateSortOrder) {
                try {
                    await updateSortOrder(newCases.map(c => c.id));
                    window.dispatchEvent(new CustomEvent(refreshEventName));
                } catch (error) {
                    console.error('保存排序失败:', error);
                }
            }
        }
    };

    // 删除案例
    const executeDelete = async () => {
        if (!isAuthenticated || !caseToDelete) return;
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
        <div className="flex items-center gap-2">
            <span>案例库</span>
            <span className="text-sm font-normal text-muted-foreground">
                ({cases.length})
            </span>
        </div>
    );

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title={header}
                titleIcon={<Library className="w-5 h-5" />}
                maxWidth={isMobile ? 'max-w-sm' : 'max-w-2xl'}
                bodyClassName={`flex flex-col ${isMobile ? 'h-[60vh] p-3' : 'h-[70vh] p-4 sm:p-6'} overflow-hidden`}
            >
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
                    {isAuthenticated ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground hover:text-foreground/90 rounded-lg text-sm font-medium transition-colors border border-border cursor-pointer shadow-sm focus-ring"
                            >
                                <Upload className="w-4 h-4" />
                                导入
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors border border-primary/20 cursor-pointer focus-ring"
                            >
                                <Plus className="w-4 h-4" />
                                新建
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={onLoginClick}
                            className="flex items-center gap-2 px-4 py-2 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border focus-ring"
                        >
                            <LogIn className="w-4 h-4" />
                            登录
                        </button>
                    )}
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
                                    className={`${isMobile ? 'whitespace-nowrap px-2.5 py-1.5 text-xs rounded-full' : 'w-full text-left px-3 py-2 text-sm rounded-md'} transition-colors focus-ring ${isActive
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
                        ) : !isAuthenticated ? (
                            <div className="text-center text-muted-foreground py-12 rounded-lg border border-dashed border-border bg-secondary/20">
                                登录后查看您的案例
                            </div>
                        ) : filteredCases.length === 0 ? (
                            <div className="text-center text-muted-foreground py-12 rounded-lg border border-dashed border-border bg-secondary/20">
                                {search || selectedCategory !== categories[0]?.id ? '没有匹配的案例' : '暂无案例，点击上方按钮新建'}
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={filteredCases.map(c => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                                        {filteredCases.map((caseData) => renderCard({
                                            caseData,
                                            isSelected: selectedCaseId === caseData.id,
                                            onSelect: () => onSelectCase?.(caseData.id, caseData),
                                            onEdit: () => setEditingCase(caseData),
                                            onDelete: () => setCaseToDelete(caseData)
                                        }))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </div>

                {/* 底部提示 */}
                {isAuthenticated && filteredCases.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground text-center shrink-0">
                        拖拽卡片左侧手柄可调整顺序
                    </div>
                )}
            </BaseModal>

            {/* 子弹窗渲染器 */}
            {renderSubModals({
                showCreateModal,
                showImportModal,
                editingCase,
                closeCreateModal: () => setShowCreateModal(false),
                closeImportModal: () => setShowImportModal(false),
                closeEditModal: () => setEditingCase(null),
                refreshData: loadCases
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
}
