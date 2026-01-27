/**
 * 案例列表组件
 * 支持 Supabase 云端同步
 */
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, Search, LogIn, Pencil, Trash2, Import } from 'lucide-react';
import { getBaziPillarsFromDateString, getAgeFromBirth } from '../../../utils/lunarUtil';
import { useAuth } from '../../../contexts/AuthContext';
import { baziCaseService, CASE_TAGS, type BaziCase, type CaseTag, type CreateCaseInput } from '../../../services/baziCaseService';
import { TIAN_GAN_WU_XING } from '../../../lib/xuan-bazi/maps';
import type { Case } from '../../../types';
import ConfirmModal from '../../Common/ConfirmModal';

import CreateCaseModal from './CreateCaseModal';
import ImportCaseModal from './ImportCaseModal';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import EditCaseModal from './EditCaseModal';

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
}

// 五行背景色常量
const ELEMENT_BG_10: Record<string, string> = {
  木: 'var(--element-wood-bg)',
  火: 'var(--element-fire-bg)',
  土: 'var(--element-earth-bg)',
  金: 'var(--element-metal-bg)',
  水: 'var(--element-water-bg)',
};

// 五行文字色常量
const ELEMENT_TEXT_COLOR: Record<string, string> = {
  木: 'var(--element-wood-text)',
  火: 'var(--element-fire-text)',
  土: 'var(--element-earth-text)',
  金: 'var(--element-metal-text)',
  水: 'var(--element-water-text)',
};

export default function CaseList({ selectedCaseId, onSelectCase, onLoginClick, onOpenLibrary, onPreviewCase }: CaseListProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<BaziCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCase, setEditingCase] = useState<BaziCase | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<BaziCase | null>(null);
  const [selectedTag, setSelectedTag] = useState<CaseTag | null>(null);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const tagMenuRef = useRef<HTMLDivElement | null>(null);
  const allLabel = '\u5168\u90e8';

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

  useEffect(() => {
    if (!isTagMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target as Node)) {
        setIsTagMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTagMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTagMenuOpen]);

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

  const handleDeleteCase = (caseItem: BaziCase) => {
    setCaseToDelete(caseItem);
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
    <aside className="w-56 bg-muted/5 border-r border-border/50 flex flex-col min-h-0">
      <div className="p-4 border-b border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onOpenLibrary}
            className="font-display text-base font-medium text-foreground/80 hover:text-foreground transition-colors tracking-tight"
          >
            案例库
          </button>
          <div className="relative" ref={tagMenuRef}>
            <button
              type="button"
              onClick={() => setIsTagMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isTagMenuOpen}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-muted/50"
            >
              {selectedTag ?? allLabel}
              <span className="text-muted-foreground/60">({selectedTag ? cases.filter(c => c.tags?.includes(selectedTag)).length : cases.length})</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${isTagMenuOpen ? 'rotate-90' : ''}`} />
            </button>
            {isTagMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-popover border border-border shadow-lg rounded-xl p-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag(null);
                    setIsTagMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors ${selectedTag === null
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted'
                    }`}
                >
                  <span>{allLabel}</span>
                  <span className="text-muted-foreground/70">{cases.length}</span>
                </button>
                <div className="mt-1 max-h-56 overflow-y-auto scrollbar-none">
                  {CASE_TAGS.map(tag => {
                    const isActive = tag === selectedTag;
                    const count = cases.filter(c => c.tags?.includes(tag)).length;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedTag(tag);
                          setIsTagMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors ${isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted'
                          }`}
                      >
                        <span>{tag}</span>
                        {count > 0 && <span className="text-muted-foreground/70">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          <input
            type="text"
            placeholder="搜索案例..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-card border border-border/40 hover:border-border/60 rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-light"
          />
        </div>

        {isAuthenticated ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border"
            >
              <Import className="w-3.5 h-3.5" />
              导入
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors border border-primary/30"
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

      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
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
            {displayCases.map((item) => {
              const pillars = getBaziPillarsFromDateString(item.birthDate ?? item.date);
              const displayPillars = pillars.length === 8 ? [
                pillars[0], pillars[2], pillars[4], pillars[6],
                pillars[1], pillars[3], pillars[5], pillars[7]
              ] : pillars;
              const age = getAgeFromBirth(item.birthDate);
              const dayGan = displayPillars.length >= 3 ? displayPillars[2] : '';
              const dayGanElement = TIAN_GAN_WU_XING[dayGan] || '';
              const dayGanBg = ELEMENT_BG_10[dayGanElement];
              const dayGanColor = ELEMENT_TEXT_COLOR[dayGanElement];
              const isSelected = selectedCaseId === item.id;

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectCase?.(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectCase?.(item.id);
                    }
                  }}
                  className={`group relative w-full text-left p-3 rounded-xl mb-2 transition-all cursor-pointer border ${selectedCaseId === item.id
                    ? 'bg-card border-primary/40 ring-1 ring-primary/20 shadow-md z-10'
                    : 'bg-card border-transparent dark:border-border/30 shadow-[0_2px_6px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:z-10 hover:border-border/50'
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                        <span className="text-xs text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground">{item.gender}</span>
                      </div>
                      <div className="text-xs text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground mb-2">{item.date}</div>
                      <div className="grid grid-cols-4 gap-1 w-fit">
                        {displayPillars.map((pillar, index) => (
                          <span
                            key={index}
                            style={index === 2 && (dayGanBg || dayGanColor)
                              ? { backgroundColor: dayGanBg, color: dayGanColor }
                              : undefined}
                            className={`w-6 h-6 flex items-center justify-center text-xs bg-[hsl(var(--muted-hover))] dark:bg-sidebar-accent/80 border rounded text-foreground/80 font-mono ${isSelected ? 'border-border' : 'border-[hsl(var(--border-lighter))] dark:border-sidebar-border/30'}`}
                          >
                            {pillar}
                          </span>
                        ))}
                      </div>
                    </div>
                    {isAuthenticated && (
                      <div className="flex flex-col items-end self-stretch">
                        {'tags' in item && item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap justify-end gap-1 mb-2 max-w-[96px]">
                            {item.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-[hsl(var(--accent-primary)/0.12)] text-[hsl(var(--accent-primary))] dark:bg-primary/10 dark:text-primary/80">
                                {tag}
                              </span>
                            ))}
                            {item.tags.length > 3 && (
                              <span className="text-xs text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground">+{item.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-col items-end gap-2 mt-auto">
                          {age !== null && (
                            <div className="text-xs text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground">今年{age}岁</div>
                          )}
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                const target = cases.find(c => c.id === item.id);
                                if (target) {
                                  setEditingCase(target);
                                }
                              }}
                              className="p-1.5 rounded-md border border-border hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                              aria-label="编辑案例"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                const target = cases.find(c => c.id === item.id);
                                if (target) {
                                  handleDeleteCase(target);
                                }
                              }}
                              disabled={deletingCaseId === item.id}
                              className="p-1.5 rounded-md border border-border hover:border-red-400 hover:bg-red-100 dark:hover:bg-destructive/20 text-muted-foreground hover:text-red-500 dark:hover:text-destructive disabled:opacity-60 disabled:cursor-not-allowed"
                              aria-label="删除案例"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
