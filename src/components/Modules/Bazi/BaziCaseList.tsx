/**
 * 案例列表组件
 * 支持 Supabase 云端同步
 */
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Search, LogIn, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';
import { getBaziPillarsFromDateString } from '../../../utils/lunarUtil';
import { useAuth } from '../../../contexts/AuthContext';
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
import CaseSearch from './components/CaseList/CaseSearch';

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
}

export default function CaseList({
  selectedCaseId,
  onSelectCase,
  onLoginClick,
  onOpenLibrary,
  onPreviewCase,
  variant = 'sidebar',
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
    if (!isAuthenticated) {
      return [];
    }

    // 已登录时显示云端案例
    return cases.filter(item => {
      const matchesSearch =
        item.name.includes(search) ||
        item.birth_date.includes(search);
      const matchesTag = !selectedTag || (item.tags && item.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    }).map(c => ({
      id: c.id,
      name: c.name,
      date: new Date(c.birth_date).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      type: 'bazi' as ChartType,
      gender: c.gender === 'male' ? '男' : '女',
      birthDate: c.birth_date,
      tags: c.tags,
    }));
  }, [isAuthenticated, cases, search, selectedTag]);

  const handleDeleteCase = (id: string) => {
    const target = cases.find(c => c.id === id);
    if (target) {
      setCaseToDelete(target);
    }
  };

  const handleEditCase = (id: string) => {
    const target = cases.find(c => c.id === id);
    if (target) {
      setEditingCase(target);
    }
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
    <aside className={variant === 'drawer'
      ? "w-full h-full bg-muted/5 flex flex-col min-h-0"
      : "w-56 bg-muted/5 border-r border-border/50 flex flex-col min-h-0"
    }>
      <div className={variant === 'drawer' ? 'p-3 border-b border-border/40 space-y-2' : 'p-4 border-b border-border/40 space-y-3'}>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onOpenLibrary}
            className="px-2 py-1 -ml-2 rounded-lg font-display text-base font-medium text-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center gap-2 group"
          >
            案例库
            <Search className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
          </button>
          <CaseTagFilter
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            cases={cases}
          />
        </div>
        <CaseSearch
          value={search}
          onChange={setSearch}
        />

        {isAuthenticated ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="flex items-center justify-center px-2.5 py-2 bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border"
              title="导出案例"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center justify-center px-2.5 py-2 bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border"
              title="导入案例"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors border border-primary/30"
              title="新建案例"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              新建
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary/50 hover:bg-secondary text-[hsl(var(--text-secondary-light))] hover:text-[hsl(var(--text-primary-light))] dark:text-muted-foreground dark:hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border"
          >
            <LogIn className="w-4 h-4" />
            登录后可保存案例
          </button>
        )}
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto ${variant === 'drawer' ? 'px-1.5 py-2' : 'px-2 py-3'}`}>
        {loading ? (
          <div className="text-center text-xs text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground py-6">
            加载中...
          </div>
        ) : displayCases.length === 0 ? (
          <div className="text-center text-xs text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground py-6 rounded-lg border border-dashed border-[hsl(var(--border-light))] dark:border-sidebar-border/70 bg-[hsl(var(--muted-hover))] dark:bg-sidebar-accent/40">
            {isAuthenticated ? '暂无案例，点击上方按钮新建' : '登录后查看您的案例'}
          </div>
        ) : (
          <>
            {displayCases.map((item) => (
              <CaseCard
                key={item.id}
                item={item}
                isSelected={selectedCaseId === item.id}
                isAuthenticated={isAuthenticated}
                onSelectCase={(id) => onSelectCase?.(id)}
                onEdit={handleEditCase}
                onDelete={handleDeleteCase}
              />
            ))}
          </>
        )}
      </div>

      {/* 新建案例 Modal */}
      <CreateCaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCaseCreated}
        onPreview={onPreviewCase ? handlePreviewCase : undefined}
      />

      {/* 导入案例 Modal */}
      <ImportCaseModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={handleCaseCreated}
      />

      {/* 导出案例 Modal */}
      <ExportCaseModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="导出八字案例"
        options={CASE_TAGS.map((tag) => ({ id: tag, name: tag }))}
        cases={cases}
        getCaseFilter={(c) => c.tags}
        formatCase={(c) => {
          // 计算天干地支
          const pillars = getBaziPillarsFromDateString(c.birth_date);
          const displayPillars = pillars.length === 8
            ? [pillars[0] + pillars[1], pillars[2] + pillars[3], pillars[4] + pillars[5], pillars[6] + pillars[7]]
            : [];
          const ganZhi = displayPillars.join(' ');

          return {
            '姓名': c.name,
            '性别': c.gender === 'male' ? '男' : '女',
            '出生时间': c.birth_date.replace('T', ' ').slice(0, 16),
            '天干地支': ganZhi,
            '标签': c.tags?.join('、') || '',
            '备注': c.notes || '',
          };
        }}
        filename="bazi_cases"
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
    </aside>
  );
}
