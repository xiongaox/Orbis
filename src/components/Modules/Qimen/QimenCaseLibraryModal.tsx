import { qimenCaseService, type QimenCase, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';
import { QIMEN_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import QimenSortableCaseCard from './QimenSortableCaseCard';
import QimenNewCaseModal from './QimenNewCaseModal';
import QimenImportModal from './QimenImportModal';
import CaseLibraryModal from '../../Common/CaseLibraryModal';

interface QimenCaseLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCaseId?: string | null;
    onSelectCase?: (caseId: string | null, caseItem?: QimenCase) => void;
}

export default function QimenCaseLibraryModal({
    isOpen,
    onClose,
    selectedCaseId,
    onSelectCase,
}: QimenCaseLibraryModalProps) {
    const categories = [{ id: 'all', name: '全部' }, ...QIMEN_CATEGORIES];

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
            renderCard={({ caseData, isSelected, onSelect, onEdit, onDelete }) => (
                <QimenSortableCaseCard
                    key={caseData.id}
                    caseData={caseData}
                    isSelected={isSelected}
                    onSelect={() => { onSelect(); onClose(); }}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            )}
            renderSubModals={({ showCreateModal, showImportModal, editingCase, closeCreateModal, closeImportModal, closeEditModal, refreshData }) => (
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
                </>
            )}
        />
    );
}
