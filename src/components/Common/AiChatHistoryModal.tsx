/**
 * 模块定位：
 * - 位于应用通用组件层，从头像菜单调起
 * - 提供树形结构组织：术数大类（八字、奇门、六爻、梅花等） -> 具体案例 -> 会话记录
 * - 关键能力：单条会话删除、全部删除/清空、导出 Markdown 文档、星标收藏与全文检索
 
*/

import { useState, useMemo, useEffect, useRef, useSyncExternalStore } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import ConfirmModal from './ConfirmModal';
import {
  Search,
  Star,
  Trash2,
  Download,
  Brain,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Calendar,
  Compass,
  MessageSquare,
  Grid3X3,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import BaseModal from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { drawerMarkdownComponents } from './markdownComponents';
import {
  aiChatHistoryService,
  SUPPORTED_DIVINATION_TYPES,
  type AiChatSession,
} from '../../services/aiChatHistoryService';
import { extractSmartTitleFromQuestion } from '../../services/aiChatService';

const DIVINATION_TYPE_ICONS: Record<string, typeof Compass> = {
  all: Layers,
  bazi: Compass,
  qimen: Grid3X3,
  sanyuan: Star,
};

// 移动端列表卡片空间有限，使用「八字 / 奇门 / 三元」简称
const DIVINATION_TYPE_SHORT_NAMES: Record<string, string> = {
  bazi: '八字',
  qimen: '奇门',
  sanyuan: '三元',
};

/**
 * 列表预览文本需清除 Markdown 标记
 * 会话内容为 AI 生成的 Markdown，直接截断会出现 `#`、`**` 等原始符号
 */
function stripMarkdownForPreview(text: string, maxLength = 90): string {
  if (!text) return '';

  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^[-*_]{3,}\s*$/gm, ' ')
    .replace(/[|#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return plain.length > maxLength ? `${plain.slice(0, maxLength)}…` : plain;
}

/**
 * 会话标题解析
 * 存量数据可能直接把案例名当作标题，案例名为命主姓名，不可作为会话标题展示
 */
function resolveSessionTitle(s: AiChatSession): string {
  if (s.title && s.title !== s.caseName) return s.title;

  const firstUserMsg = s.messages.find((m) => m.role === 'user');
  return firstUserMsg
    ? extractSmartTitleFromQuestion(firstUserMsg.content, s.divinationType)
    : '命理综合研判';
}

/** 移动端会话卡片左滑露出的删除区宽度（单按钮）与展开阈值 */
const SWIPE_REVEAL_PX = 72;
const SWIPE_OPEN_THRESHOLD = 24;

interface MobileSessionCardProps {
  session: AiChatSession;
  onOpen: () => void;
  onDelete: () => void;
}

/**
 * 移动端会话卡片：左滑露出删除。
 * 手势与案例卡片（CaseList/CaseCard）同一范式：6px 死区 + 横纵轴锁
 * （纵向意图交还列表滚动）+ 吞掉真实滑动后浏览器补发的 click。
 */
function MobileSessionCard({ session: s, onOpen, onDelete }: MobileSessionCardProps) {
  const lastMsg = s.messages[s.messages.length - 1];
  const timeDisplay = new Date(s.updatedAt).toLocaleDateString([], {
    month: '2-digit',
    day: '2-digit',
  });
  const preview = stripMarkdownForPreview(lastMsg?.content || '', 62);
  const typeLabel = DIVINATION_TYPE_SHORT_NAMES[s.divinationType] || s.divinationTypeName;

  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const gesture = useRef({ x: 0, y: 0, base: 0, lock: null as null | 'x' | 'y', moved: false });
  const suppressClick = useRef(false);

  const handlePointerDown = (event: ReactPointerEvent) => {
    gesture.current = { x: event.clientX, y: event.clientY, base: swipeX, lock: null, moved: false };
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    const g = gesture.current;
    if (g.lock === null) {
      const dx = event.clientX - g.x;
      const dy = event.clientY - g.y;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      // 纵向意图交还给列表滚动，避免与滚动抢手势
      if (Math.abs(dy) > Math.abs(dx)) { g.lock = 'y'; return; }
      g.lock = 'x';
      setIsSwiping(true);
    }
    if (g.lock !== 'x') return;
    g.moved = true;
    setSwipeX(Math.max(-SWIPE_REVEAL_PX, Math.min(0, g.base + (event.clientX - g.x))));
  };

  const endSwipe = () => {
    const g = gesture.current;
    if (g.lock === 'x' && g.moved) {
      setSwipeX(swipeX < -SWIPE_OPEN_THRESHOLD ? -SWIPE_REVEAL_PX : 0);
      suppressClick.current = true;
    }
    setIsSwiping(false);
    g.lock = null;
  };

  const handleSelect = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    // 已展开时，点卡片本体先收起而非进入详情
    if (swipeX !== 0) { setSwipeX(0); return; }
    onOpen();
  };

  return (
    <div className="relative w-full select-none overflow-hidden rounded-xl border border-border bg-card">
      {/* 左滑露出的删除区：位于卡片底层，靠前景层位移显形 */}
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onDelete(); }}
        className="absolute inset-y-0 right-0 z-[1] flex w-[72px] flex-col items-center justify-center gap-0.5 bg-destructive/15 text-[11px] font-semibold text-destructive"
        aria-label="删除会话"
      >
        <Trash2 className="h-3.5 w-3.5" />
        删除
      </button>

      {/* 前景层：卡片本体 */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSelect();
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
        onPointerLeave={() => { if (gesture.current.lock === 'x') endSwipe(); }}
        style={{
          transform: swipeX ? `translateX(${swipeX}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 180ms cubic-bezier(0.2, 0.8, 0.3, 1)',
          touchAction: 'pan-y',
        }}
        className="relative z-[2] w-full cursor-pointer bg-card px-3.5 py-3 text-left transition-colors active:bg-muted/60 hover:bg-muted/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {s.isFavorite && (
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
              )}
              <span className="text-[15px] font-semibold text-foreground truncate">
                {resolveSessionTitle(s)}
              </span>
            </div>

            <p className="mt-1 text-[13px] leading-snug text-muted-foreground line-clamp-2">
              {preview || '暂无问答'}
            </p>

            <div className="mt-1.5 text-[12px] text-muted-foreground/80 truncate">
              {typeLabel}
              {s.caseName ? ` · ${s.caseName}` : ''}
            </div>
          </div>

          <div className="shrink-0 text-right text-[12px] text-muted-foreground">
            <div className="font-mono">{timeDisplay}</div>
            <div className="mt-0.5 opacity-80">{s.messages.length} 轮</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AiChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiChatHistoryModal({ isOpen, onClose }: AiChatHistoryModalProps) {
  // 端判定：移动端（含 Pad 竖屏）使用全屏两级视图，桌面端保持原有三栏布局
  const isMobile = !useMediaQuery('(min-width: 768px)');

  const sessions = useSyncExternalStore(
    aiChatHistoryService.subscribe,
    aiChatHistoryService.getAllSessions,
    aiChatHistoryService.getAllSessions
  );

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  // 移动端视图层级：列表页 / 详情页
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [activeTypeTab, setActiveTypeTab] = useState<string>('all'); // 'all' | 'bazi' | 'qimen' | ...
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // 展开折叠的案例分组
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  // 思考过程折叠
  const [expandedReasonings, setExpandedReasonings] = useState<Record<string, boolean>>({});

  // 确认操作浮层状态
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showDeleteSessionConfirm, setShowDeleteSessionConfirm] = useState(false);
  // 左滑删除的目标会话（列表卡片滑出删除后经确认弹窗执行）
  const [pendingSwipeDelete, setPendingSwipeDelete] = useState<AiChatSession | null>(null);
  const clearAllRef = useRef<HTMLDivElement>(null);
  const deleteSessionRef = useRef<HTMLDivElement>(null);

  // 各术数大类下的会话数量统计
  const sessionCountsByType = useMemo(() => {
    const counts: Record<string, number> = { all: sessions.length };
    SUPPORTED_DIVINATION_TYPES.forEach((t) => {
      counts[t.id] = sessions.filter((s) => s.divinationType === t.id).length;
    });
    return counts;
  }, [sessions]);

  // 移动端顶部横向分类项（含「全部」）
  const typeNavItems = useMemo(
    () => [
      { id: 'all', shortName: '全部', count: sessionCountsByType.all || 0 },
      ...SUPPORTED_DIVINATION_TYPES.map((t) => ({
        id: t.id as string,
        shortName: DIVINATION_TYPE_SHORT_NAMES[t.id] || t.name,
        count: sessionCountsByType[t.id] || 0,
      })),
    ],
    [sessionCountsByType]
  );

  // 过滤后的会话
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 术数分类过滤
      if (activeTypeTab !== 'all' && s.divinationType !== activeTypeTab) {
        return false;
      }
      // 仅看收藏
      if (onlyFavorites && !s.isFavorite) {
        return false;
      }
      // 搜索关键词
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchCase = s.caseName?.toLowerCase().includes(kw);
        const matchTitle = s.title?.toLowerCase().includes(kw);
        const matchContent = s.messages.some((m) => m.content?.toLowerCase().includes(kw));
        const matchGanZhi = s.meta?.ganZhi?.toLowerCase().includes(kw);
        if (!matchCase && !matchTitle && !matchContent && !matchGanZhi) {
          return false;
        }
      }
      return true;
    });
  }, [sessions, activeTypeTab, onlyFavorites, searchKeyword]);

  // 计算当前有效选中的 Session ID
  const effectiveSelectedId = useMemo(() => {
    if (selectedSessionId && filteredSessions.some((s) => s.id === selectedSessionId)) {
      return selectedSessionId;
    }
    return filteredSessions.length > 0 ? filteredSessions[0].id : null;
  }, [selectedSessionId, filteredSessions]);

  // 点击外侧关闭确认弹框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clearAllRef.current && !clearAllRef.current.contains(e.target as Node)) {
        setShowClearAllConfirm(false);
      }
      if (deleteSessionRef.current && !deleteSessionRef.current.contains(e.target as Node)) {
        setShowDeleteSessionConfirm(false);
      }
    };
    if (showClearAllConfirm || showDeleteSessionConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClearAllConfirm, showDeleteSessionConfirm]);

  // 当前选中的会话
  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === effectiveSelectedId) || null;
  }, [sessions, effectiveSelectedId]);

  // 当选择“全部”时的全术数聚合
  const groupedSessionsForAll = useMemo(() => {
    if (activeTypeTab !== 'all') return [];

    const groups: Array<{
      typeId: string;
      typeName: string;
      cases: Array<{
        caseName: string;
        sessions: AiChatSession[];
      }>;
    }> = [];

    SUPPORTED_DIVINATION_TYPES.forEach((type) => {
      const matched = filteredSessions.filter((s) => s.divinationType === type.id);
      if (matched.length === 0) return;

      const caseMap = new Map<string, AiChatSession[]>();
      matched.forEach((s) => {
        const cName = s.caseName || '未分类案例';
        const list = caseMap.get(cName) || [];
        list.push(s);
        caseMap.set(cName, list);
      });

      const cases = Array.from(caseMap.entries()).map(([caseName, sList]) => ({
        caseName,
        sessions: sList,
      }));

      groups.push({
        typeId: type.id,
        typeName: type.name,
        cases,
      });
    });

    return groups;
  }, [activeTypeTab, filteredSessions]);

  // 当选中具体术数时的案例聚合
  const currentTypeCases = useMemo(() => {
    if (activeTypeTab === 'all') return [];

    const caseMap = new Map<string, AiChatSession[]>();
    filteredSessions.forEach((s) => {
      const cName = s.caseName || '未分类案例';
      const list = caseMap.get(cName) || [];
      list.push(s);
      caseMap.set(cName, list);
    });

    return Array.from(caseMap.entries()).map(([caseName, sList]) => ({
      caseName,
      sessions: sList,
    }));
  }, [activeTypeTab, filteredSessions]);

  // 切换分组折叠
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? true : !prev[key],
    }));
  };

  const isGroupExpanded = (key: string) => {
    return expandedGroups[key] === undefined ? true : expandedGroups[key];
  };

  // 收藏切换
  const handleToggleFavorite = (sessionId: string) => {
    aiChatHistoryService.toggleFavorite(sessionId);
  };

  // 删除单条会话
  const handleDeleteCurrentSession = () => {
    if (!currentSession) return;
    aiChatHistoryService.deleteSession(currentSession.id);
    setShowDeleteSessionConfirm(false);
  };

  // 清空会话（当前分类或全局）
  const handleClearAll = () => {
    aiChatHistoryService.clearSessions(activeTypeTab === 'all' ? undefined : activeTypeTab);
    setShowClearAllConfirm(false);
  };

  // 导出 Markdown
  const [exportState, setExportState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const handleExportMarkdown = async () => {
    if (!currentSession || exportState === 'busy') return;
    try {
      setExportState('busy');
      const md = aiChatHistoryService.exportSessionToMarkdown(currentSession);
      const filename = `${currentSession.caseName}_${currentSession.divinationTypeName}_研判记录.md`;
      const result = await aiChatHistoryService.exportMarkdownFile(filename, md);
      if (result === 'cancelled') {
        setExportState('idle');
        return;
      }
      setExportState('done');
      setTimeout(() => setExportState('idle'), 2000);
    } catch (err) {
      console.error('导出 Markdown 失败:', err);
      setExportState('error');
      setTimeout(() => setExportState('idle'), 2500);
    }
  };

  // 复制单条消息
  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      // 忽略
    }
  };

  // 渲染会话单项
  const renderSessionItem = (s: AiChatSession) => {
    const isSelected = s.id === effectiveSelectedId;
    const lastMsg = s.messages[s.messages.length - 1];
    const timeDisplay = new Date(s.updatedAt).toLocaleDateString([], {
      month: '2-digit',
      day: '2-digit',
    });

    // 严禁使用命主姓名作为会话条目标题
    const displayTitle = resolveSessionTitle(s);

    return (
      <div
        key={s.id}
        onClick={() => setSelectedSessionId(s.id)}
        className={`group px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-between gap-2 border ${
          isSelected
            ? 'bg-primary/15 text-primary font-medium border-primary/30 shadow-2xs'
            : 'border-transparent hover:bg-muted/60 text-foreground/80'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {s.isFavorite && (
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
            )}
            <span className="truncate font-sans font-medium text-foreground">
              {displayTitle}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
            {lastMsg?.content || '暂无问答'}
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground shrink-0 flex flex-col items-end">
          <span>{timeDisplay}</span>
          <span className="opacity-80">{s.messages.length} 轮</span>
        </div>
      </div>
    );
  };

  // 关闭弹窗时重置移动端视图层级，避免下次打开仍停留在详情页
  // 由 BaseModal 统一回调（关闭按钮 / 遮罩 / Esc 均走此处）
  const handleClose = () => {
    setMobileView('list');
    onClose();
  };

  // 会话操作按钮组：桌面详情栏与移动端详情页共用
  const renderSessionActions = (session: AiChatSession) => (
    <div className="flex items-center gap-1.5 shrink-0 pr-0.5">
      {/* 收藏按钮 */}
      <button
        type="button"
        onClick={() => handleToggleFavorite(session.id)}
        title={session.isFavorite ? '取消收藏' : '加入收藏'}
        className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
          session.isFavorite
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
            : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <Star className={`w-4 h-4 ${session.isFavorite ? 'fill-current' : ''}`} />
      </button>

      {/* 导出 Markdown 按钮 */}
      <button
        type="button"
        onClick={handleExportMarkdown}
        disabled={exportState === 'busy'}
        title="导出为 Markdown 文件"
        className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs shrink-0 ${
          exportState === 'error'
            ? 'border-destructive/40 text-destructive'
            : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        {exportState === 'done' ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {exportState === 'busy'
            ? '导出中…'
            : exportState === 'done'
              ? '已导出'
              : exportState === 'error'
                ? '导出失败'
                : '导出 MD'}
        </span>
      </button>

      {/* 删除单条会话按钮 */}
      <div className="relative shrink-0" ref={deleteSessionRef}>
        <button
          type="button"
          onClick={() => setShowDeleteSessionConfirm((prev) => !prev)}
          title="删除此会话记录"
          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {showDeleteSessionConfirm && (
          <div className="absolute right-0 top-full mt-2 z-50 w-52 p-3 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="font-semibold flex items-center gap-1.5 text-foreground">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <span>删除此会话？</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              删除后将无法恢复该案例的本次对话记录。
            </p>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowDeleteSessionConfirm(false)}
                className="px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteCurrentSession}
                className="px-2.5 py-1 rounded text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium cursor-pointer"
              >
                删除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 消息流：桌面与移动端共用，仅外层容器间距不同
  const renderMessageStream = (session: AiChatSession, containerClassName: string) => (
    <div className={containerClassName}>
      {session.messages.map((msg, idx) => {
        const isUser = msg.role === 'user';
        const isCopied = copiedMsgId === msg.id;

        return (
          <div
            key={msg.id || idx}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
          >
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
              <span>{isUser ? '我' : `${session.divinationTypeName} AI 研判`}</span>
              <span>·</span>
              <span>
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div
              className={`relative group max-w-[92%] rounded-xl p-3.5 text-sm md:text-base leading-[1.75] ${
                isUser
                  ? 'bg-card border border-border text-foreground rounded-tr shadow-xs space-y-2'
                  : 'bg-card border border-border text-foreground rounded-tl shadow-xs space-y-2'
              }`}
            >
              {/* 思考过程折叠 */}
              {!isUser && msg.reasoning && (
                <div className="rounded-lg border border-border/60 bg-muted/30 overflow-hidden mb-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedReasonings((prev) => ({
                        ...prev,
                        [msg.id]: !prev[msg.id],
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs text-muted-foreground flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-primary" />
                      思考推导过程
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        expandedReasonings[msg.id] ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedReasonings[msg.id] && (
                    <div className="p-2.5 text-xs text-muted-foreground/90 font-mono bg-background/40 border-t border-border/40 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {msg.reasoning}
                    </div>
                  )}
                </div>
              )}

              {/* 消息正文：用户提问与 AI 回复均全面支持 Markdown 渲染 */}
              <div className="max-w-none break-words font-reading">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={drawerMarkdownComponents}>
                  {msg.content}
                </ReactMarkdown>
              </div>

              {/* 复制按钮：绝对定位不参与排版，放末尾避免 space-y 把正文容器当第二个兄弟加顶边距 */}
              <button
                type="button"
                onClick={() => handleCopyText(msg.id, msg.content)}
                className="absolute right-2 top-2 p-1 rounded-md bg-background/80 hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="复制内容"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // 移动端会话卡片：扁平列表，标题与摘要优先，案例名降为附属信息；左滑露出删除
  const renderMobileSessionCard = (s: AiChatSession) => (
    <MobileSessionCard
      key={s.id}
      session={s}
      onOpen={() => {
        setSelectedSessionId(s.id);
        setMobileView('detail');
      }}
      onDelete={() => setPendingSwipeDelete(s)}
    />
  );

  // 移动端：全屏两级视图（列表页 ⇄ 详情页），不使用桌面三栏结构。
  // 壳走 SubPage（统一页头 + 返回手势）；详情页内部的返回键是页内二级导航，保留原位。
  if (isMobile) {
    const showDetail = mobileView === 'detail' && !!currentSession;

    return (
      <SubPage
        isOpen={isOpen}
        onClose={handleClose}
        title="对话历史"
        bodyClassName="overflow-hidden flex flex-col"
      >
        <div className="flex flex-col h-full w-full min-w-0 min-h-0 bg-background text-foreground">
          {showDetail && currentSession ? (
            <>
              {/* 详情页头部：返回 + 命盘信息 + 操作 */}
              <div className="shrink-0 px-3.5 py-3 border-b border-border bg-card/50">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="p-1 -ml-1 rounded-md text-muted-foreground active:bg-muted transition-colors cursor-pointer shrink-0"
                    aria-label="返回列表"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-foreground truncate">
                      {currentSession.caseName}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {DIVINATION_TYPE_SHORT_NAMES[currentSession.divinationType] ||
                        currentSession.divinationTypeName}
                    </span>
                  </div>

                  {renderSessionActions(currentSession)}
                </div>

                <div className="text-[12px] text-muted-foreground flex items-center gap-x-3 gap-y-1 mt-1.5 pl-6 flex-wrap">
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(currentSession.updatedAt).toLocaleString()}
                  </span>
                  {currentSession.meta?.solarDate && (
                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {currentSession.meta.solarDate}
                    </span>
                  )}
                  {currentSession.meta?.ganZhi && (
                    <span className="truncate">干支：{currentSession.meta.ganZhi}</span>
                  )}
                </div>
              </div>

              {renderMessageStream(currentSession, 'flex-1 overflow-y-auto px-3.5 py-4 space-y-4')}
            </>
          ) : (
            <>
              {/* 列表页：顶部横向术数分类胶囊 */}
              <div className="shrink-0 border-b border-border/60 bg-card/40">
                <div className="flex items-center gap-2 px-3 py-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {typeNavItems.map((t) => {
                    const isActive = activeTypeTab === t.id;
                    const Icon = DIVINATION_TYPE_ICONS[t.id] || Compass;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTypeTab(t.id)}
                        className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 border transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
                            : 'bg-card border-border text-muted-foreground active:bg-muted/60'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.shortName}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isActive
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {t.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 搜索与收藏筛选 */}
              <div className="shrink-0 px-3 py-2.5 border-b border-border/60 bg-muted/15 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="搜索案例、干支、问题..."
                    className="w-full pl-8 pr-7 py-2 text-xs rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/70"
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => setSearchKeyword('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setOnlyFavorites((prev) => !prev)}
                  title={onlyFavorites ? '展示全部会话' : '仅看已收藏会话'}
                  className={`p-2 rounded-md border text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    onlyFavorites
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* 会话列表：移动端不做树形分组，直接按更新时间平铺 */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {filteredSessions.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
                    <Layers className="w-8 h-8 opacity-30" />
                    <div className="text-xs">暂无符合条件的对话历史</div>
                  </div>
                ) : (
                  filteredSessions.map(renderMobileSessionCard)
                )}
              </div>

              {/* 底部操作条 */}
              <div className="shrink-0 px-3.5 py-3 border-t border-border bg-card/60 flex items-center justify-between text-xs text-muted-foreground">
                <span>当前筛选 {filteredSessions.length} 条</span>

                {filteredSessions.length > 0 && (
                  <div className="relative" ref={clearAllRef}>
                    <button
                      type="button"
                      onClick={() => setShowClearAllConfirm((prev) => !prev)}
                      className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>全部清空</span>
                    </button>

                    {showClearAllConfirm && (
                      <div className="absolute right-0 bottom-full mb-2 z-50 w-56 p-3 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="font-semibold flex items-center gap-1.5 text-foreground">
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                          <span>确认全部清空？</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          将彻底删除{activeTypeTab === 'all' ? '所有术数' : '当前分类'}下的 AI
                          对话记录，不可恢复。
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                          <button
                            type="button"
                            onClick={() => setShowClearAllConfirm(false)}
                            className="px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={handleClearAll}
                            className="px-2.5 py-1 rounded text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium cursor-pointer"
                          >
                            确认清空
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 左滑删除会话的确认弹窗 */}
        <ConfirmModal
          isOpen={pendingSwipeDelete !== null}
          onClose={() => setPendingSwipeDelete(null)}
          onConfirm={() => {
            if (!pendingSwipeDelete) return;
            aiChatHistoryService.deleteSession(pendingSwipeDelete.id);
            if (selectedSessionId === pendingSwipeDelete.id) {
              setSelectedSessionId(null);
              setMobileView('list');
            }
            setPendingSwipeDelete(null);
          }}
          title="删除会话"
          description={pendingSwipeDelete ? `确认删除「${resolveSessionTitle(pendingSwipeDelete)}」吗？删除后无法恢复。` : undefined}
          confirmText="删除"
          variant="destructive"
        />
      </SubPage>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="对话历史"
      titleIcon={<MessageSquare className="w-5 h-5" />}
      maxWidth="max-w-6xl"
      bodyClassName="p-0 overflow-hidden flex flex-col min-h-0"
    >
      <div className="flex flex-col md:flex-row h-[620px] max-h-[calc(85vh-4.5rem)] w-full min-w-0 min-h-0 bg-background overflow-hidden text-foreground divide-y md:divide-y-0 md:divide-x divide-border">
        {/* ============================================================ */}
        {/* 第 1 栏（左侧）：术数大类垂直导航栏 (宽 144px~160px)           */}
        {/* ============================================================ */}
        <div className="w-full md:w-36 lg:w-40 shrink-0 bg-card/60 flex flex-col justify-between p-2.5 min-h-0">
          <div className="space-y-1 overflow-y-auto">
            <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-primary" />
              <span>术数分类</span>
            </div>

            {/* 全部选项 */}
            <button
              type="button"
              onClick={() => setActiveTypeTab('all')}
              className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                activeTypeTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>全部</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTypeTab === 'all'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {sessionCountsByType.all || 0}
              </span>
            </button>

            {/* 各术数类型纵向排布，与顶部菜单完全对应一致 */}
            {SUPPORTED_DIVINATION_TYPES.map((t) => {
              const count = sessionCountsByType[t.id] || 0;
              const isActive = activeTypeTab === t.id;
              const Icon = DIVINATION_TYPE_ICONS[t.id] || Compass;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTypeTab(t.id)}
                  className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t.name}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 底部统计信息 */}
          <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground/80 px-2 flex items-center justify-between">
            <span>总计记录</span>
            <span className="font-mono">{sessions.length} 条</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 第 2 栏（中间）：案例与会话检索列表 (宽 256px~288px)           */}
        {/* ============================================================ */}
        <div className="w-full md:w-64 lg:w-72 shrink-0 bg-card/25 flex flex-col min-h-0">
          {/* 顶部搜索与收藏筛选 */}
          <div className="p-2.5 border-b border-border/60 bg-muted/15 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索案例、干支、问题..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/70"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOnlyFavorites((prev) => !prev)}
              title={onlyFavorites ? '展示全部会话' : '仅看已收藏会话'}
              className={`p-1.5 rounded-md border text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                onlyFavorites
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* 会话列表展示区 */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredSessions.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
                <Layers className="w-8 h-8 opacity-30" />
                <div className="text-xs">暂无符合条件的对话历史</div>
              </div>
            ) : activeTypeTab === 'all' ? (
              // 当选择“全部”时：按术数 -> 案例 -> 会话树形展示
              groupedSessionsForAll.map((group) => {
                const groupKey = `type_${group.typeId}`;
                const groupExpanded = isGroupExpanded(groupKey);

                return (
                  <div key={group.typeId} className="space-y-1">
                    <div
                      onClick={() => toggleGroup(groupKey)}
                      className="flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        {groupExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        <span>{group.typeName}</span>
                      </div>
                      <span className="text-[10px] opacity-70">
                        {group.cases.reduce((acc, c) => acc + c.sessions.length, 0)} 条
                      </span>
                    </div>

                    {groupExpanded && (
                      <div className="pl-2 space-y-1 border-l border-border/50 ml-2">
                        {group.cases.map((c) => {
                          const caseKey = `case_${group.typeId}_${c.caseName}`;
                          const caseExpanded = isGroupExpanded(caseKey);

                          return (
                            <div key={c.caseName} className="space-y-0.5">
                              <div
                                onClick={() => toggleGroup(caseKey)}
                                className="flex items-center justify-between px-2 py-1 rounded-md text-xs font-medium text-foreground/90 hover:bg-muted/40 cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-1 truncate">
                                  {caseExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                  )}
                                  <span className="truncate">{c.caseName}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {c.sessions.length}
                                </span>
                              </div>

                              {caseExpanded && (
                                <div className="pl-3 space-y-1">
                                  {c.sessions.map(renderSessionItem)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // 当选中具体分类时：直接按案例分组展示
              currentTypeCases.map((c) => {
                const caseKey = `case_${activeTypeTab}_${c.caseName}`;
                const caseExpanded = isGroupExpanded(caseKey);

                return (
                  <div key={c.caseName} className="space-y-1">
                    <div
                      onClick={() => toggleGroup(caseKey)}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground/90 hover:bg-muted/50 cursor-pointer select-none bg-muted/20"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {caseExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="truncate font-semibold">{c.caseName}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground shrink-0">
                        {c.sessions.length}
                      </span>
                    </div>

                    {caseExpanded && (
                      <div className="pl-2 space-y-1">
                        {c.sessions.map(renderSessionItem)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 中间栏底部操作区 */}
          <div className="p-2 border-t border-border bg-card/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>当前筛选 {filteredSessions.length} 条</span>

            {filteredSessions.length > 0 && (
              <div className="relative" ref={clearAllRef}>
                <button
                  type="button"
                  onClick={() => setShowClearAllConfirm((prev) => !prev)}
                  className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>全部清空</span>
                </button>

                {showClearAllConfirm && (
                  <div className="absolute right-0 bottom-full mb-2 z-50 w-56 p-3 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="font-semibold flex items-center gap-1.5 text-foreground">
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                      <span>确认全部清空？</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      将彻底删除{activeTypeTab === 'all' ? '所有术数' : '当前分类'}下的 AI 对话记录，不可恢复。
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                      <button
                        type="button"
                        onClick={() => setShowClearAllConfirm(false)}
                        className="px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="px-2.5 py-1 rounded text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium cursor-pointer"
                      >
                        确认清空
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：会话详情与操作区 */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
          {currentSession ? (
            <>
              {/* 会话详情头部 */}
              <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 border-b border-border bg-card/50 flex items-center justify-between gap-2.5 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm sm:text-base font-semibold text-foreground truncate">
                      {currentSession.caseName}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {currentSession.divinationTypeName}
                    </span>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center gap-x-3 gap-y-1 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(currentSession.updatedAt).toLocaleString()}
                    </span>
                    {currentSession.meta?.solarDate && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3" />
                        {currentSession.meta.solarDate}
                      </span>
                    )}
                    {currentSession.meta?.ganZhi && (
                      <span className="truncate">干支：{currentSession.meta.ganZhi}</span>
                    )}
                  </div>
                </div>

                {/* 顶部操作按钮 */}
                {renderSessionActions(currentSession)}
              </div>

              {/* 消息历史滚动流 */}
              {renderMessageStream(currentSession, 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-4')}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">请在左侧选择对话历史</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  可查看过往命盘的 AI 深度论证记录，支持导出 Markdown 报告与永久收藏。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
