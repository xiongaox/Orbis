/**
 * BaziCaseList - 应用源码层
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
 * - `default CaseList`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `lunarUtil`、内部模块 `useAuth` 等 14 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useMemo, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { getBaziPillarsFromDateString } from '../../../utils/lunarUtil';
import { useAuth } from '../../../contexts/useAuth';
import { baziCaseService, CASE_TAGS, type BaziCase, type CaseTag, type CreateCaseInput } from '../../../services/baziCaseService';
import type { Case } from '../../../types';
import ConfirmModal from '../../Common/ConfirmModal';
import CreateCaseModal from './CreateCaseModal';
import ImportCaseModal from './ImportCaseModal';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import EditCaseModal from './EditCaseModal';
import ExportCaseModal from '../../Common/ExportCaseModal';
import CaseCard from './components/CaseList/CaseCard';
import CaseTagFilter from './components/CaseList/CaseTagFilter';
import BaseCaseList from '../../Common/BaseCaseList';
import {
  OPEN_AI_CHAT_EVENT,
  getAiResearchStatuses,
  subscribeAiResearchStatus,
} from '../../../services/aiTaskStatusService';

type ChartType =
  | 'bazi'
  | 'liuyao'
  | 'ziwei'
  | 'daliuren'
  | 'xiaoliuren'
  | 'meihua'
  | 'wannianli'
  | 'sanyuan';

interface CaseListProps {
  selectedCaseId?: string | null;
  onSelectCase?: (caseId: string | null) => void;
  onLoginClick?: () => void;
  onOpenLibrary?: () => void;
  onPreviewCase?: (caseData: Case) => void;
  variant?: 'sidebar' | 'drawer';
  /** drawer 模式下选中案例后关闭抽屉 */
  onDrawerClose?: () => void;
}

export default function CaseList({
  selectedCaseId,
  onSelectCase,
  onLoginClick,
  onOpenLibrary,
  onPreviewCase,
  variant = 'sidebar',
  onDrawerClose,
}: CaseListProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<BaziCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingCase, setEditingCase] = useState<BaziCase | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<BaziCase | null>(null);
  const [selectedTag, setSelectedTag] = useState<CaseTag | null>(null);

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
    if (!authLoading) {
      loadCases();
    }
  }, [authLoading, loadCases]);

  useEffect(() => {
    const handleCasesChanged = () => {
      if (isAuthenticated) {
        loadCases();
      }
    };

    window.addEventListener(BAZI_CASES_CHANGED_EVENT, handleCasesChanged);
    return () => {
      window.removeEventListener(BAZI_CASES_CHANGED_EVENT, handleCasesChanged);
    };
  }, [isAuthenticated, loadCases]);

  // 处理案例创建成功
  const handleCaseCreated = (newCase?: BaziCase) => {
    loadCases();
    if (newCase) {
      onSelectCase?.(newCase.id);
      onDrawerClose?.();
    }
  };

  const handlePreviewCase = (input: CreateCaseInput) => {
    // Map input to Case
    const tempCase: Case = {
      id: 'temp',
      name: input.name,
      gender: input.gender,
      birth_date: input.birth_date,
      created_at: new Date().toISOString(),
    };
    onPreviewCase?.(tempCase);
    setShowCreateModal(false);
  };

  // 转换为显示格式
  const displayCases = useMemo(() => {
    if (!isAuthenticated) return [];

    return cases.filter(item => {
      const matchesSearch =
        item.name.includes(search) ||
        item.birth_date.includes(search);
      const matchesTag = !selectedTag || (item.tags && item.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    }).map(c => {
      // 出生日期带时辰：时柱本身由时辰决定，列表里必须可见
      const birth = new Date(c.birth_date);
      const hasBirth = !Number.isNaN(birth.getTime());
      const pad = (n: number) => String(n).padStart(2, '0');
      return {
        id: c.id,
        name: c.name,
        date: hasBirth
          ? `${birth.getFullYear()}年${birth.getMonth() + 1}月${birth.getDate()}日 ${pad(birth.getHours())}:${pad(birth.getMinutes())}`
          : c.birth_date,
        type: 'bazi' as ChartType,
        gender: c.gender === 'male' ? '男' : '女',
        birthDate: c.birth_date,
        tags: c.tags,
      };
    });
  }, [isAuthenticated, cases, search, selectedTag]);

  const handleDeleteCase = (id: string) => {
    const target = cases.find(c => c.id === id);
    if (target) setCaseToDelete(target);
  };

  // AI 研判任务状态：研判中 / 未读研判（跨组件登记，见 aiTaskStatusService）
  const aiStatuses = useSyncExternalStore(
    subscribeAiResearchStatus,
    getAiResearchStatuses,
    getAiResearchStatuses
  );

  // 状态按钮点击：先切到该案例（让研判抽屉的会话与排盘上下文对齐），再直接打开研判抽屉
  const handleOpenAiResearch = useCallback((id: string) => {
    onSelectCase?.(id);
    window.dispatchEvent(new CustomEvent(OPEN_AI_CHAT_EVENT, { detail: { divinationType: 'bazi' } }));
  }, [onSelectCase]);

  const handleEditCase = (id: string) => {
    const target = cases.find(c => c.id === id);
    if (target) setEditingCase(target);
  };

  const executeDelete = async () => {
    if (!isAuthenticated || !caseToDelete) return; // double check

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

  return (
    <BaseCaseList
      variant={variant}
      isAuthenticated={isAuthenticated}
      onLoginClick={onLoginClick}
      onOpenLibrary={onOpenLibrary}
      renderFilter={
        <CaseTagFilter
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          cases={cases}
        />
      }
      search={search}
      onSearchChange={setSearch}
      onExport={() => setShowExportModal(true)}
      onImport={() => setShowImportModal(true)}
      onCreate={() => setShowCreateModal(true)}
      isLoading={loading}
      isEmpty={displayCases.length === 0}
      emptyText={isAuthenticated ? '暂无案例，点击上方按钮新建' : '登录后查看您的案例'}
      modals={
        <>
          <CreateCaseModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleCaseCreated} onPreview={onPreviewCase ? handlePreviewCase : undefined} />
          <ImportCaseModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImported={handleCaseCreated} />
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
          {editingCase && <EditCaseModal isOpen caseData={editingCase} onClose={() => setEditingCase(null)} onSaved={() => setEditingCase(null)} />}
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
      }
    >
      {displayCases.map((item) => (
        <CaseCard
          key={item.id}
          item={item}
          isSelected={selectedCaseId === item.id}
          isAuthenticated={isAuthenticated}
          aiStatus={aiStatuses[item.id]?.status ?? null}
          onOpenAiResearch={handleOpenAiResearch}
          onSelectCase={(id) => {
            onSelectCase?.(id);
            onDrawerClose?.();
          }}
          onEdit={handleEditCase}
          onDelete={handleDeleteCase}
        />
      ))}
    </BaseCaseList>
  );
}
