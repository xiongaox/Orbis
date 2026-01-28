/**
 * 案例库弹窗组件
 * 支持 Tab 分类、搜索、拖拽排序
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
import { baziCaseService, CASE_TAGS, type BaziCase, type CaseTag } from '../../../services/baziCaseService';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import SortableCaseCard from './SortableCaseCard';
import CreateCaseModal from './CreateCaseModal';
import ImportCaseModal from './ImportCaseModal';
import EditCaseModal from './EditCaseModal';
import ConfirmModal from '../../Common/ConfirmModal';
import BaseModal from '../../UI/BaseModal';

interface CaseLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCaseId?: string | null;
    onSelectCase?: (caseId: string | null) => void;
    onLoginClick?: () => void;
}

export default function CaseLibraryModal({
    isOpen,
    onClose,
    selectedCaseId,
    onSelectCase,
    onLoginClick,
}: CaseLibraryModalProps) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [cases, setCases] = useState<BaziCase[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedTag, setSelectedTag] = useState<CaseTag | null>(null);

    // 子弹窗状态
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingCase, setEditingCase] = useState<BaziCase | null>(null);
    const [caseToDelete, setCaseToDelete] = useState<BaziCase | null>(null);
    const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

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
            const data = await baziCaseService.getCases();
            setCases(data);
        } catch (error) {
            console.error('Failed to load cases:', error);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

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
        window.addEventListener(BAZI_CASES_CHANGED_EVENT, handleCasesChanged);
        return () => window.removeEventListener(BAZI_CASES_CHANGED_EVENT, handleCasesChanged);
    }, [isAuthenticated, isOpen, loadCases]);

    // 筛选后的案例
    const filteredCases = useMemo(() => {
        return cases.filter(item => {
            const matchesSearch =
                item.name.includes(search) ||
                item.birth_date.includes(search);
            const matchesTag = !selectedTag || (item.tags && item.tags.includes(selectedTag));
            return matchesSearch && matchesTag;
        });
    }, [cases, search, selectedTag]);

    // 拖拽结束处理
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = cases.findIndex(c => c.id === active.id);
        const newIndex = cases.findIndex(c => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newCases = arrayMove(cases, oldIndex, newIndex);
            setCases(newCases);

            // 持久化排序到数据库
            try {
                await baziCaseService.updateSortOrder(newCases.map(c => c.id));
                // 通知侧边栏刷新
                window.dispatchEvent(new CustomEvent(BAZI_CASES_CHANGED_EVENT));
            } catch (error) {
                console.error('保存排序失败:', error);
            }
        }
    };

    // 删除案例
    const executeDelete = async () => {
        if (!isAuthenticated || !caseToDelete) return;
        setDeletingCaseId(caseToDelete.id);
        try {
            await baziCaseService.deleteCase(caseToDelete.id);
            if (selectedCaseId === caseToDelete.id) {
                onSelectCase?.(null);
            }
            window.dispatchEvent(new CustomEvent(BAZI_CASES_CHANGED_EVENT));
            setCaseToDelete(null);
        } catch (error) {
            console.error('删除案例失败:', error);
            alert('删除失败');
        } finally {
            setDeletingCaseId(null);
        }
    };

    // 选择案例并关闭弹窗
    const handleSelectCase = (caseId: string) => {
        onSelectCase?.(caseId);
        onClose();
    };

    // Tab 菜单项
    const allTabs: (CaseTag | null)[] = [null, ...CASE_TAGS];
    const getTabCount = (tag: CaseTag | null) => {
        if (tag === null) return cases.length;
        return cases.filter(c => c.tags?.includes(tag)).length;
    };

    const header = (
        <div className="flex items-center gap-2">
            <span>案例库</span>
            <span className="text-sm font-normal text-muted-foreground">
                ({cases.length})
            </span>
        </div>
    );

    const headerIcon = <Library className="w-5 h-5" />;

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title={header}
                titleIcon={headerIcon}
                maxWidth="max-w-2xl"
                bodyClassName="flex flex-col h-[70vh] p-4 sm:p-6 overflow-hidden"
            >
                {/* 搜索和操作栏 */}
                <div className="flex gap-2 mb-4 shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="搜索案例..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-ring"
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

                {/* 主体：左侧Tab + 右侧内容 */}
                <div className="flex gap-4 flex-1 min-h-0">
                    {/* 左侧 Tab 菜单 */}
                    <div className="w-28 shrink-0 flex flex-col gap-0.5 overflow-y-auto pr-1">
                        {allTabs.map((tag) => {
                            const isActive = tag === selectedTag;
                            const count = getTabCount(tag);
                            return (
                                <button
                                    key={tag ?? 'all'}
                                    type="button"
                                    onClick={() => setSelectedTag(tag)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors focus-ring ${isActive
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                        }`}
                                >
                                    {tag ?? '全部'}
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
                                {search || selectedTag ? '没有匹配的案例' : '暂无案例，点击上方按钮新建'}
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
                                    <div className="grid grid-cols-2 gap-2">
                                        {filteredCases.map((caseData) => (
                                            <SortableCaseCard
                                                key={caseData.id}
                                                caseData={caseData}
                                                isSelected={selectedCaseId === caseData.id}
                                                onSelect={() => handleSelectCase(caseData.id)}
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

                {/* 底部提示 */}
                {isAuthenticated && filteredCases.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground text-center shrink-0">
                        拖拽卡片左侧手柄可调整顺序
                    </div>
                )}
            </BaseModal>

            {/* 子弹窗 */}
            <CreateCaseModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={loadCases}
            />

            <ImportCaseModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImported={loadCases}
            />

            {editingCase && (
                <EditCaseModal
                    isOpen
                    caseData={editingCase}
                    onClose={() => setEditingCase(null)}
                    onSaved={() => setEditingCase(null)}
                />
            )}

            <ConfirmModal
                isOpen={!!caseToDelete}
                onClose={() => setCaseToDelete(null)}
                onConfirm={executeDelete}
                title="删除确认"
                description={<>确定要删除案例 <span className="font-medium text-foreground">「{caseToDelete?.name}」</span> 吗？此操作无法撤销。</>}
                confirmText="删除"
                variant="destructive"
                loading={!!deletingCaseId}
            />
        </>
    );
}
