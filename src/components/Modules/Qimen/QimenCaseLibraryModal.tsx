import { useState } from 'react';
import { ArrowUpFromLine } from 'lucide-react';
import { qimenCaseService, type QimenCase, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';
import { QIMEN_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import QimenCaseCard from './QimenCaseCard';
import QimenNewCaseModal from './QimenNewCaseModal';
import QimenImportModal from './QimenImportModal';
import CaseLibraryModal from '../../Common/CaseLibraryModal';
import ExportCaseModal from '../../Common/ExportCaseModal';
import type { PaiPanMethod } from '../../../lib/csp-qimen/qimenService';

interface QimenCaseLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCaseId?: string | null;
    onSelectCase?: (caseId: string | null, caseItem?: QimenCase) => void;
    /** 当前页面排盘方法：旧案例盘状态的兜底计算依据 */
    paiPanMethod?: PaiPanMethod;
}

export default function QimenCaseLibraryModal({
    isOpen,
    onClose,
    selectedCaseId,
    onSelectCase,
    paiPanMethod,
}: QimenCaseLibraryModalProps) {
    const categories = [{ id: 'all', name: '全部' }, ...QIMEN_CATEGORIES];
    const [showExportModal, setShowExportModal] = useState(false);

    return (
        <CaseLibraryModal<QimenCase>
            isOpen={isOpen}
            onClose={onClose}
            selectedCaseId={selectedCaseId}
            onSelectCase={onSelectCase}
            fetchCases={qimenCaseService.getCases}
            deleteCase={qimenCaseService.deleteCase}
            refreshEventName={QIMEN_CASES_CHANGED_EVENT}
            categories={categories}
            getCategoryCount={(catId, cases) => {
                if (catId === 'all') return cases.length;
                return cases.filter(c => c.category === catId).length;
            }}
            filterFn={(item, search, categoryId) => {
                const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
                const matchesCategory = categoryId === 'all' || item.category === categoryId;
                return matchesSearch && matchesCategory;
            }}
            getItemName={(item) => item.title}
            extraActions={
                <button
                    type="button"
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground hover:text-foreground/90 rounded-lg text-sm font-medium transition-colors border border-border cursor-pointer shadow-sm focus-ring"
                >
                    <ArrowUpFromLine className="w-4 h-4" />
                    导出
                </button>
            }
            renderCard={({ caseData, isSelected, onSelect, onEdit, onDelete }) => (
                <QimenCaseCard
                    key={caseData.id}
                    caseItem={caseData}
                    isSelected={isSelected}
                    paiPanMethod={paiPanMethod}
                    onSelectCase={() => { onSelect(); onClose(); }}
                    onEdit={() => onEdit()}
                    onDelete={() => onDelete()}
                />
            )}
            renderSubModals={({ showCreateModal, showImportModal, editingCase, closeCreateModal, closeImportModal, closeEditModal, refreshData, cases }) => (
                <>
                    <QimenNewCaseModal
                        isOpen={showCreateModal || !!editingCase}
                        initialData={editingCase}
                        onClose={() => { closeCreateModal(); closeEditModal(); }}
                        onConfirm={() => {
                            closeCreateModal();
                            closeEditModal();
                            window.dispatchEvent(new CustomEvent(QIMEN_CASES_CHANGED_EVENT));
                            refreshData();
                        }}
                    />
                    <QimenImportModal
                        isOpen={showImportModal}
                        onClose={closeImportModal}
                        onImported={refreshData}
                    />
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
            )}
        />
    );
}
