/**
 * 奇门案例库弹窗组件
 * 支持 Tab 分类、搜索、新建、编辑、删除
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useAuth } from '../../../contexts/AuthContext';
import { qimenCaseService, type QimenCase, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';
import QimenSortableCaseCard from './QimenSortableCaseCard';
import QimenNewCaseModal from './QimenNewCaseModal'; // Reusing the existing modal for create/edit
import QimenImportModal from './QimenImportModal';
import ConfirmModal from '../../Common/ConfirmModal';
import BaseModal from '../../UI/BaseModal';

export const QIMEN_CASES_CHANGED_EVENT = 'qimen_cases_changed';

interface QimenCaseLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCaseId?: string | null;
    onSelectCase?: (caseId: string | null, caseItem?: QimenCase) => void;
    onLoginClick?: () => void;
}

export default function QimenCaseLibraryModal({
    isOpen,
    onClose,
    selectedCaseId,
    onSelectCase,
    onLoginClick,
}: QimenCaseLibraryModalProps) {
    const { isAuthenticated } = useAuth();
    const [cases, setCases] = useState<QimenCase[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Sub-modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingCase, setEditingCase] = useState<QimenCase | null>(null);
    const [caseToDelete, setCaseToDelete] = useState<QimenCase | null>(null);
    const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

    // Dnd sensors
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

    // Load cases
    const loadCases = useCallback(async () => {
        setLoading(true);
        try {
            const data = await qimenCaseService.getCases();
            setCases(data);
        } catch (error) {
            console.error('Failed to load qimen cases:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadCases();
        }
    }, [isOpen, loadCases]);

    // Listen for external updates
    useEffect(() => {
        const handleCasesChanged = () => {
            if (isOpen) {
                loadCases();
            }
        };
        window.addEventListener(QIMEN_CASES_CHANGED_EVENT, handleCasesChanged);
        return () => window.removeEventListener(QIMEN_CASES_CHANGED_EVENT, handleCasesChanged);
    }, [isOpen, loadCases]);

    // Filtering
    const filteredCases = useMemo(() => {
        return cases.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [cases, search, selectedCategory]);

    // Drag End (Local reorder only for now)
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = cases.findIndex(c => c.id === active.id);
        const newIndex = cases.findIndex(c => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newCases = arrayMove(cases, oldIndex, newIndex);
            setCases(newCases);
            // TODO: Persist sort order when backend supports it
        }
    };

    // Delete Case
    const executeDelete = async () => {
        if (!caseToDelete) return;
        setDeletingCaseId(caseToDelete.id);
        try {
            await qimenCaseService.deleteCase(caseToDelete.id);
            if (selectedCaseId === caseToDelete.id) {
                onSelectCase?.(null);
            }
            window.dispatchEvent(new CustomEvent(QIMEN_CASES_CHANGED_EVENT));
            setCaseToDelete(null);
            loadCases(); // Refresh list
        } catch (error) {
            console.error('Failed to delete case:', error);
            alert('删除失败');
        } finally {
            setDeletingCaseId(null);
        }
    };

    // Prepare Categories for Tab
    const allCategories = [{ id: 'all', name: '全部' }, ...QIMEN_CATEGORIES];

    const getCategoryCount = (catId: string) => {
        if (catId === 'all') return cases.length;
        return cases.filter(c => c.category === catId).length;
    };

    if (!isOpen) return null;

    return (
        <>
            return (
            <>
                <BaseModal
                    isOpen={isOpen}
                    onClose={onClose}
                    title={
                        <div className="flex items-center gap-2">
                            <span>案例库</span>
                            <span className="text-sm font-normal text-muted-foreground">
                                ({cases.length})
                            </span>
                        </div>
                    }
                    titleIcon={<Library className="w-5 h-5" />}
                    maxWidth="max-w-2xl"
                    bodyClassName="flex flex-col h-[70vh] p-4 sm:p-6 overflow-hidden"
                >
                    {/* Search & Actions */}
                    <div className="flex gap-2 mb-4 shrink-0">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="搜索案例..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus-ring"
                            />
                        </div>

                        {!isAuthenticated ? (
                            <button
                                type="button"
                                onClick={onLoginClick}
                                className="flex items-center gap-2 px-4 py-2 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border focus-ring"
                            >
                                <LogIn className="w-4 h-4" />
                                登录
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setShowImportModal(true); }}
                                    className="relative z-50 flex items-center gap-1.5 px-3 py-2 bg-secondary active:bg-secondary/70 hover:bg-secondary/90 text-foreground rounded-lg text-sm font-medium transition-all border border-border cursor-pointer shadow-sm hover:shadow focus-ring"
                                >
                                    <Upload className="w-4 h-4" />
                                    导入
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-primary/12 hover:bg-primary/18 text-primary rounded-lg text-sm font-medium transition-colors border border-primary/40 focus-ring"
                                >
                                    <Plus className="w-4 h-4" />
                                    新建
                                </button>
                            </>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="flex gap-4 flex-1 min-h-0">
                        {/* Sidebar Categories */}
                        <div className="w-28 shrink-0 flex flex-col gap-0.5 overflow-y-auto pr-1">
                            {allCategories.map((cat) => {
                                const isActive = cat.id === selectedCategory;
                                const count = getCategoryCount(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors focus-ring ${isActive
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

                        {/* Case Grid */}
                        <div className="flex-1 min-w-0 overflow-y-auto">
                            {loading ? (
                                <div className="text-center text-muted-foreground py-12">加载中...</div>
                            ) : filteredCases.length === 0 ? (
                                <div className="text-center text-muted-foreground py-12 rounded-lg border border-dashed border-border bg-secondary/20">
                                    {search || selectedCategory !== 'all' ? '没有匹配的案例' : '暂无案例，点击上方按钮新建'}
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
                                        <div className="grid grid-cols-1 gap-2">
                                            {filteredCases.map((caseData) => (
                                                <QimenSortableCaseCard
                                                    key={caseData.id}
                                                    caseData={caseData}
                                                    isSelected={selectedCaseId === caseData.id}
                                                    onSelect={() => {
                                                        onSelectCase?.(caseData.id, caseData);
                                                        onClose();
                                                    }}
                                                    onEdit={() => setEditingCase(caseData)}
                                                    onDelete={() => setCaseToDelete(caseData)}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}
                        </div>
                    </div>
                </BaseModal>

                {/* Create/Edit Modal */}
                <QimenNewCaseModal
                    isOpen={showCreateModal || !!editingCase}
                    initialData={editingCase}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingCase(null);
                    }}
                    onConfirm={() => {
                        setShowCreateModal(false);
                        setEditingCase(null);
                        window.dispatchEvent(new CustomEvent(QIMEN_CASES_CHANGED_EVENT));
                        loadCases(); // Refresh
                    }}
                />

                {/* Import Modal */}
                <QimenImportModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onImported={loadCases}
                />

                {/* Delete Confirmation */}
                <ConfirmModal
                    isOpen={!!caseToDelete}
                    onClose={() => setCaseToDelete(null)}
                    onConfirm={executeDelete}
                    title="删除确认"
                    description={<>确定要删除案例 <span className="font-medium text-foreground">「{caseToDelete?.title}」</span> 吗？此操作无法撤销。</>}
                    confirmText="删除"
                    variant="destructive"
                    loading={!!deletingCaseId}
                />
            </>
            );

            {/* Create/Edit Modal */}
            <QimenNewCaseModal
                isOpen={showCreateModal || !!editingCase}
                initialData={editingCase}
                onClose={() => {
                    setShowCreateModal(false);
                    setEditingCase(null);
                }}
                onConfirm={() => {
                    setShowCreateModal(false);
                    setEditingCase(null);
                    window.dispatchEvent(new CustomEvent(QIMEN_CASES_CHANGED_EVENT));
                    loadCases(); // Refresh
                }}
            />

            {/* Import Modal */}
            <QimenImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImported={loadCases}
            />

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!caseToDelete}
                onClose={() => setCaseToDelete(null)}
                onConfirm={executeDelete}
                title="删除确认"
                description={<>确定要删除案例 <span className="font-medium text-foreground">「{caseToDelete?.title}」</span> 吗？此操作无法撤销。</>}
                confirmText="删除"
                variant="destructive"
                loading={!!deletingCaseId}
            />
        </>
    );
}
