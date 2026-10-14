import { useMemo, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { baziCaseService, type BaziCase, type CaseTag, type CreateCaseInput } from '../../../services/baziCaseService';
import type { Case } from '../../../types';
import CreateCaseModal from './CreateCaseModal';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import EditCaseModal from './EditCaseModal';
import CaseCard from './components/CaseList/CaseCard';
import CaseTagFilter from './components/CaseList/CaseTagFilter';
import BaseCaseList from '../../Common/BaseCaseList';
import SortFieldButton, { type SortState } from '../../Common/SortFieldButton';
import { useToast } from '../../../hooks/useToast';
import { BAZI_SORT_OPTIONS, compareBaziCase } from './caseSort';
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
  onOpenLibrary?: () => void;
  onPreviewCase?: (caseData: Case) => void;
  variant?: 'sidebar' | 'drawer';
  /** drawer 模式下选中案例后关闭抽屉 */
  onDrawerClose?: () => void;
}

export default function CaseList({
  selectedCaseId,
  onSelectCase,
  onOpenLibrary,
  onPreviewCase,
  variant = 'sidebar',
  onDrawerClose,
}: CaseListProps) {
  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<BaziCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCase, setEditingCase] = useState<BaziCase | null>(null);
  const [selectedTag, setSelectedTag] = useState<CaseTag | null>(null);
  // 字段排序（年龄/分组/性别）：field 为 null 表示默认
  const [sort, setSort] = useState<SortState>({ field: null, dir: 'desc' });
  const { toast, showToast } = useToast();

  // 加载案例
  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await baziCaseService.getCases();
      setCases(data);
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  useEffect(() => {
    const handleCasesChanged = () => {
      loadCases();
    };

    window.addEventListener(BAZI_CASES_CHANGED_EVENT, handleCasesChanged);
    return () => {
      window.removeEventListener(BAZI_CASES_CHANGED_EVENT, handleCasesChanged);
    };
  }, [loadCases]);

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

  // 转换为显示格式（筛选 → 字段排序 → 映射显示）
  const displayCases = useMemo(() => {
    const filtered = cases.filter(item => {
      const matchesSearch =
        item.name.includes(search) ||
        item.birth_date.includes(search);
      const matchesTag = !selectedTag || (item.tags && item.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    });
    const sorted = sort.field
      ? [...filtered].sort((a, b) => compareBaziCase(a, b, sort.field as string) * (sort.dir === 'asc' ? 1 : -1))
      : filtered;
    return sorted.map(c => {
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
  }, [cases, search, selectedTag, sort]);

  // 删除案例：左滑即删，无二次确认（可批量连删，跳过确认弹窗以免每次重新定位）
  const handleDeleteCase = async (id: string) => {
    try {
      await baziCaseService.deleteCase(id);
      if (selectedCaseId === id) {
        onSelectCase?.(null);
      }
      window.dispatchEvent(new CustomEvent(BAZI_CASES_CHANGED_EVENT));
    } catch (error) {
      console.error('删除案例失败:', error);
      showToast('删除失败，请重试', 'error');
    }
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

  return (
    <BaseCaseList
      variant={variant}
      scrollKey="bazi"
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
      extraActions={
        <SortFieldButton options={BAZI_SORT_OPTIONS} value={sort} onChange={setSort} />
      }
      onCreate={() => setShowCreateModal(true)}
      isLoading={loading}
      isEmpty={displayCases.length === 0}
      emptyText="暂无案例，点击上方按钮新建"
      feedback={toast}
      modals={
        <>
          <CreateCaseModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleCaseCreated} onPreview={onPreviewCase ? handlePreviewCase : undefined} />
          {editingCase && <EditCaseModal isOpen caseData={editingCase} onClose={() => setEditingCase(null)} onSaved={() => setEditingCase(null)} />}
        </>
      }
    >
      {displayCases.map((item) => (
        <CaseCard
          key={item.id}
          item={item}
          isSelected={selectedCaseId === item.id}
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
