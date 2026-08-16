/**
 * BaziCaseLibraryModal - 应用源码层
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
 * - `default BaziCaseLibraryModal`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `baziCaseService`、内部模块 `caseConstants`、内部模块 `SortableCaseCard` 等 7 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { baziCaseService, CASE_TAGS, type BaziCase, type CaseTag } from '../../../services/baziCaseService';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import SortableCaseCard from './SortableCaseCard';
import CreateCaseModal from './CreateCaseModal';
import ImportCaseModal from './ImportCaseModal';
import EditCaseModal from './EditCaseModal';
import CaseLibraryModal from '../../Common/CaseLibraryModal';

interface BaziCaseLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCaseId?: string | null;
    onSelectCase?: (caseId: string | null) => void;
    onLoginClick?: () => void;
}

export default function BaziCaseLibraryModal({
    isOpen,
    onClose,
    selectedCaseId,
    onSelectCase,
    onLoginClick,
}: BaziCaseLibraryModalProps) {
    const categories = [{ id: null, name: '全部' }, ...CASE_TAGS.map(t => ({ id: t, name: t }))];

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
            onLoginClick={onLoginClick}
            fetchCases={baziCaseService.getCases}
            updateSortOrder={baziCaseService.updateSortOrder}
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
            renderSubModals={({ showCreateModal, showImportModal, editingCase, closeCreateModal, closeImportModal, closeEditModal, refreshData }) => (
                <>
                    <CreateCaseModal isOpen={showCreateModal} onClose={closeCreateModal} onCreated={refreshData} />
                    <ImportCaseModal isOpen={showImportModal} onClose={closeImportModal} onImported={refreshData} />
                    {editingCase && (
                        <EditCaseModal isOpen caseData={editingCase} onClose={closeEditModal} onSaved={closeEditModal} />
                    )}
                </>
            )}
        />
    );
}
