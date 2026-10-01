import { useState } from 'react';
import { ArrowUpFromLine } from 'lucide-react';
import { baziCaseService, CASE_TAGS, type BaziCase, type CaseTag } from '../../../services/baziCaseService';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import { getBaziPillarsFromDateString } from '../../../utils/lunarUtil';
import SortableCaseCard from './SortableCaseCard';
import CreateCaseModal from './CreateCaseModal';
import ImportCaseModal from './ImportCaseModal';
import EditCaseModal from './EditCaseModal';
import ExportCaseModal from '../../Common/ExportCaseModal';
import CaseLibraryModal from '../../Common/CaseLibraryModal';

interface BaziCaseLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCaseId?: string | null;
    onSelectCase?: (caseId: string | null) => void;
}

export default function BaziCaseLibraryModal({
    isOpen,
    onClose,
    selectedCaseId,
    onSelectCase,
}: BaziCaseLibraryModalProps) {
    const categories = [{ id: null, name: '全部' }, ...CASE_TAGS.map(t => ({ id: t, name: t }))];
    const [showExportModal, setShowExportModal] = useState(false);

    return (
        <CaseLibraryModal<BaziCase>
            isOpen={isOpen}
            onClose={onClose}
            selectedCaseId={selectedCaseId}
            onSelectCase={(caseId) => {
                onSelectCase?.(caseId);
                if (caseId) {
                    onClose();
                }
            }}
            fetchCases={baziCaseService.getCases}
            deleteCase={baziCaseService.deleteCase}
            refreshEventName={BAZI_CASES_CHANGED_EVENT}
            categories={categories}
            getCategoryCount={(catId, cases) => {
                if (catId === null) return cases.length;
                return cases.filter(c => c.tags?.includes(catId as CaseTag)).length;
            }}
            filterFn={(item, search, categoryId) => {
                const matchesSearch = item.name.includes(search) || item.birth_date.includes(search);
                const matchesTag = !categoryId || (item.tags && item.tags.includes(categoryId as CaseTag));
                return matchesSearch && !!matchesTag;
            }}
            getItemName={(item) => item.name}
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
                <SortableCaseCard
                    key={caseData.id}
                    caseData={caseData}
                    isSelected={isSelected}
                    onSelect={onSelect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            )}
            renderSubModals={({ showCreateModal, showImportModal, editingCase, closeCreateModal, closeImportModal, closeEditModal, refreshData, cases }) => (
                <>
                    <CreateCaseModal isOpen={showCreateModal} onClose={closeCreateModal} onCreated={refreshData} />
                    <ImportCaseModal isOpen={showImportModal} onClose={closeImportModal} onImported={refreshData} />
                    {editingCase && (
                        <EditCaseModal isOpen caseData={editingCase} onClose={closeEditModal} onSaved={closeEditModal} />
                    )}
                    <ExportCaseModal
                        isOpen={showExportModal}
                        onClose={() => setShowExportModal(false)}
                        title="导出八字案例"
                        options={CASE_TAGS.map((tag) => ({ id: tag, name: tag }))}
                        cases={cases}
                        getCaseFilter={(c) => c.tags}
                        formatCase={(c) => {
                            const pillars = getBaziPillarsFromDateString(c.birth_date);
                            const displayPillars = pillars.length === 8
                                ? [pillars[0] + pillars[1], pillars[2] + pillars[3], pillars[4] + pillars[5], pillars[6] + pillars[7]]
                                : [];
                            const d = new Date(c.birth_date);
                            const pad = (n: number) => String(n).padStart(2, '0');
                            const localBirthDateStr = isNaN(d.getTime())
                                ? c.birth_date
                                : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                            return {
                                '姓名': c.name,
                                '性别': c.gender === 'male' ? '男' : '女',
                                '出生时间': localBirthDateStr,
                                '天干地支': displayPillars.join(' '),
                                '标签': c.tags?.join('、') || '',
                                '备注': c.notes || '',
                            };
                        }}
                        filename="bazi_cases"
                    />
                </>
            )}
        />
    );
}
