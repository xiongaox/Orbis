/**
 * 案例列表组件
 * 支持 Supabase 云端同步
 */
import { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronRight, Plus, Search, LogIn, Pencil, Trash2 } from 'lucide-react';
import { Solar } from 'lunar-typescript';
import { useAuth } from '../../contexts/AuthContext';
import { baziCaseService, type BaziCase } from '../../services/baziCaseService';
import { TIAN_GAN_WU_XING } from '../../lib/xuan-bazi';
import CreateCaseModal from './CreateCaseModal';
import { BAZI_CASES_CHANGED_EVENT } from '../../data/caseConstants';
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
}

function getBaziPillars(dateStr: string): string[] {
  try {
    // 尝试解析中文日期格式
    const match = dateStr.match(/(\d+)年(\d+)月(\d+)日/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      const solar = Solar.fromYmd(year, month, day);
      const lunar = solar.getLunar();
      const eightChar = lunar.getEightChar();
      return [
        eightChar.getYearGan(), eightChar.getYearZhi(),
        eightChar.getMonthGan(), eightChar.getMonthZhi(),
        eightChar.getDayGan(), eightChar.getDayZhi(),
        eightChar.getTimeGan(), eightChar.getTimeZhi()
      ];
    }

    // 尝试解析 ISO 日期格式
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const solar = Solar.fromYmdHms(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        0
      );
      const lunar = solar.getLunar();
      const eightChar = lunar.getEightChar();
      return [
        eightChar.getYearGan(), eightChar.getYearZhi(),
        eightChar.getMonthGan(), eightChar.getMonthZhi(),
        eightChar.getDayGan(), eightChar.getDayZhi(),
        eightChar.getTimeGan(), eightChar.getTimeZhi()
      ];
    }

    return [];
  } catch (e) {
    console.error('Bazi calculation error:', e);
    return [];
  }
}

function getAgeFromBirth(birthDate?: string): number | null {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age < 0 ? 0 : age;
}

const ELEMENT_BG_10: Record<string, string> = {
  木: 'rgba(34, 197, 94, 0.06)',
  火: 'rgba(239, 68, 68, 0.06)',
  土: 'rgba(205, 133, 63, 0.06)',
  金: 'rgba(212, 175, 55, 0.06)',
  水: 'rgba(59, 130, 246, 0.06)',
};
const ELEMENT_TEXT_COLOR: Record<string, string> = {
  木: 'rgba(34, 197, 94, 0.5)',
  火: 'rgba(239, 68, 68, 0.5)',
  土: 'rgba(205, 133, 63, 0.5)',
  金: 'rgba(212, 175, 55, 0.5)',
  水: 'rgba(59, 130, 246, 0.5)',
};

export default function CaseList({ selectedCaseId, onSelectCase, onLoginClick }: CaseListProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<BaziCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCase, setEditingCase] = useState<BaziCase | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

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
  const handleCaseCreated = () => {
    loadCases();
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
      return matchesSearch;
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
  }, [isAuthenticated, cases, search]);

  const handleDeleteCase = async (caseItem: BaziCase) => {
    if (!isAuthenticated || deletingCaseId) return;
    const confirmed = window.confirm(`确定删除「${caseItem.name}」吗？`);
    if (!confirmed) return;

    setDeletingCaseId(caseItem.id);
    try {
      await baziCaseService.deleteCase(caseItem.id);
      if (selectedCaseId === caseItem.id) {
        onSelectCase?.(null);
      }
      window.dispatchEvent(new CustomEvent(BAZI_CASES_CHANGED_EVENT));
    } catch (error) {
      console.error('删除案例失败:', error);
      alert('删除失败');
    } finally {
      setDeletingCaseId(null);
    }
  };

  return (
    <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col min-h-0">
      <div className="p-4 border-b border-sidebar-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-medium text-foreground">案例库</h2>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            全部 <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索案例..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/12 hover:bg-primary/18 text-primary rounded-lg text-sm font-medium transition-colors border border-primary/40"
          >
            <Plus className="w-4 h-4" />
            新建案例
          </button>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border"
          >
            <LogIn className="w-4 h-4" />
            登录后可保存案例
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
        {loading ? (
          <div className="text-center text-xs text-muted-foreground py-6">
            加载中...
          </div>
        ) : displayCases.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6 rounded-lg border border-dashed border-sidebar-border/70 bg-sidebar-accent/40">
            {isAuthenticated ? '暂无案例，点击上方按钮新建' : '登录后查看您的案例'}
          </div>
        ) : (
          displayCases.map((item) => {
            const pillars = getBaziPillars(item.birthDate ?? item.date);
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
                className={`w-full text-left p-3 rounded-lg mb-1 transition-all cursor-pointer ${selectedCaseId === item.id
                    ? 'bg-sidebar-accent border border-primary/30'
                    : 'bg-sidebar-accent/30 border border-transparent hover:bg-sidebar-accent/50'
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.gender}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{item.date}</div>
                    <div className="grid grid-cols-4 gap-1 w-fit">
                      {displayPillars.map((pillar, index) => (
                        <span
                          key={index}
                          style={index === 2 && (dayGanBg || dayGanColor)
                            ? { backgroundColor: dayGanBg, color: dayGanColor }
                            : undefined}
                          className={`w-6 h-6 flex items-center justify-center text-xs bg-sidebar-accent/80 border rounded text-foreground/80 font-mono ${isSelected ? 'border-border' : 'border-sidebar-border/30'}`}
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
                            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary/80">
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{item.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-col items-end gap-2 mt-auto">
                        {age !== null && (
                          <div className="text-xs text-muted-foreground">今年{age}岁</div>
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
                            className="p-1.5 rounded-md border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
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
                            className="p-1.5 rounded-md border border-border hover:border-destructive/60 text-muted-foreground hover:text-destructive disabled:opacity-60 disabled:cursor-not-allowed"
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
          })
        )}
      </div>

      {/* 新建案例 Modal */}
      <CreateCaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCaseCreated}
      />

      {editingCase && (
        <EditCaseModal
          isOpen
          caseData={editingCase}
          onClose={() => setEditingCase(null)}
          onSaved={() => setEditingCase(null)}
        />
      )}
    </aside>
  );
}
