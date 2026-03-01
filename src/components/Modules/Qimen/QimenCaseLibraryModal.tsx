/**
 * QimenCaseLibraryModal - 应用源码层
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
 * - `default QimenCaseLibraryModal`, `QIMEN_CASES_CHANGED_EVENT`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `qimenCaseService`、内部模块 `QimenSortableCaseCard`、内部模块 `QimenNewCaseModal` 等 5 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { qimenCaseService, type QimenCase, QIMEN_CATEGORIES } from '../../../services/qimenCaseService';
import QimenSortableCaseCard from './QimenSortableCaseCard';
import QimenNewCaseModal from './QimenNewCaseModal';
import QimenImportModal from './QimenImportModal';
import CaseLibraryModal from '../../Common/CaseLibraryModal';

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
    const categories = [{ id: 'all', name: '全部' }, ...QIMEN_CATEGORIES];

    return (
        <CaseLibraryModal<QimenCase>
            isOpen={isOpen}
            onClose={onClose}
            selectedCaseId={selectedCaseId}
            onSelectCase={onSelectCase}
            onLoginClick={onLoginClick}
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
