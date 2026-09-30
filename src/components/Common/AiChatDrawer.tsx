/**
 * 模块定位：
 * - 所在层级：应用通用组件层
 * - 主要目标：在桌面端右侧抽屉式滑出（移动端自适应），提供基于排盘上下文的多轮 AI 对话能力
 *
 * 关键职责：
 * - 顶部提供服务商与模型动态切换；未配置时支持一键打开 AI 集成设置
 * - 支持流式多轮对话与 DeepSeek/o1 等模型的深度思考思维链（Reasoning）折叠展示
 * - 本地持久化对话历史，支持一键清空与重置
 * - 内置命理快捷追问胶囊，支持一键发送深度追问
 * - 与左侧排盘互不干扰，支持边看盘面边与 AI 实时研判
 
*/

import { useState, useMemo, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { pushBackHandler, popBackHandler } from '../../utils/androidBackButton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import SubPage from '../UI/SubPage';
import {
  Sparkles,
  Bot,
  Trash2,
  X,
  Send,
  Square,
  Brain,
  ChevronDown,
  Copy,
  Check,
  Settings,
  AlertCircle,
  History,
  Plus,
  UserCog,
  Clock3,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { aiChatService, extractSmartTitleFromQuestion } from '../../services/aiChatService';
import type { AiModelService } from '../../services/aiModelService';
import AiIntegrationModal from './AiIntegrationModal';
import AiRoleSettingsModal from './AiRoleSettingsModal';
import { drawerMarkdownComponents } from './markdownComponents';
import { aiRolePromptService } from '../../services/aiRolePromptService';
import { setAiResearchRunning, setAiResearchUnread, clearAiResearchStatus } from '../../services/aiTaskStatusService';
import {
  aiChatHistoryService,
  type DivinationType,
  type ChatMessageItem,
} from '../../services/aiChatHistoryService';

export type { ChatMessageItem };

export interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName?: string; // 如 "八字", "奇门"
  initialPrompt?: string; // 外部传入的排盘提示词
  sessionId?: string;
  caseId?: string;
  caseName?: string;
  divinationType?: DivinationType;
  meta?: {
    solarDate?: string;
    lunarDate?: string;
    gender?: string;
    ganZhi?: string;
  };
}

interface DropdownOption {
  value: string;
  label: string;
}

function CustomDropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
  icon,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (val: string) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentOption = options.find((opt) => opt.value === value);
  const displayLabel = currentOption?.label || value || '请选择';

  return (
    <div className={`relative inline-block ${isOpen ? 'z-50' : 'z-10'}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-3 h-10 text-[13px] rounded-lg border border-border/80 bg-background/90 hover:bg-muted/70 text-foreground transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-primary ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isOpen ? 'border-primary ring-1 ring-primary/40 bg-muted/50' : ''}`}
      >
        {icon}
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium text-foreground max-w-[100px] sm:max-w-[130px] truncate">
          {displayLabel}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-full w-max max-w-[260px] rounded-xl border border-border/90 bg-popover text-popover-foreground shadow-2xl p-1 text-xs space-y-0.5 max-h-56 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-left ${
                  isSelected
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AiChatDrawer({
  isOpen,
  onClose,
  moduleName = '八字',
  initialPrompt = '',
  sessionId,
  caseId,
  caseName,
  divinationType,
  meta,
}: AiChatDrawerProps) {
  const [services, setServices] = useState<AiModelService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  // 移动端：会话历史底部抽屉 与 服务/模型选择板
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [pickerSheet, setPickerSheet] = useState<'svc' | 'mdl' | null>(null);
  // 移动端整页壳（SubPage）与桌面右侧抽屉共用同一份内容
  const isMobileLayout = !useMediaQuery('(min-width: 768px)');

  // 安卓返回手势/返回键：移动端由 SubPage 统一接入返回栈，抽屉仅在桌面布局下自注册（桌面为 no-op）
  useEffect(() => {
    if (!isOpen || isMobileLayout) return;
    const handler = () => onClose();
    pushBackHandler(handler);
    return () => popBackHandler(handler);
  }, [isOpen, isMobileLayout, onClose]);

  // 安卓返回：底部选择板/历史抽屉打开时先收起浮层（后入栈，盖过 SubPage 的关闭动作）
  useEffect(() => {
    if (!showHistorySheet && !pickerSheet) return;
    const handler = () => {
      setShowHistorySheet(false);
      setPickerSheet(null);
    };
    pushBackHandler(handler);
    return () => popBackHandler(handler);
  }, [showHistorySheet, pickerSheet]);

  // 区分会话 ID 与元信息
  const effectiveDivinationType: DivinationType = divinationType || (moduleName.includes('奇门') ? 'qimen' : 'bazi');
  const effectiveCaseName = caseName || `${moduleName}排盘`;
  const defaultSessionId = useMemo(() => {
    if (sessionId) return sessionId;
    if (caseId) return `${effectiveDivinationType}_case_${caseId}`;
    return `${effectiveDivinationType}_default`;
  }, [sessionId, caseId, effectiveDivinationType]);

  // 当前激活的会话 ID
  const [activeSessionId, setActiveSessionId] = useState<string>(defaultSessionId);

  // 外部排盘或案例切换时同步更新
  useEffect(() => {
    setActiveSessionId(defaultSessionId);
  }, [defaultSessionId]);

  // 订阅会话变更以获取当前命主的历史会话列表
  const allSessions = useSyncExternalStore(
    aiChatHistoryService.subscribe,
    aiChatHistoryService.getAllSessions,
    aiChatHistoryService.getAllSessions
  );

  // 当前命主名下的所有历史会话
  const caseSessions = useMemo(() => {
    return allSessions.filter((s) => {
      if (s.divinationType !== effectiveDivinationType) return false;
      if (caseId && s.caseId) return s.caseId === caseId;
      return s.caseName === effectiveCaseName;
    });
  }, [allSessions, effectiveDivinationType, caseId, effectiveCaseName]);

  // 会话历史下拉浮层状态
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);
  const historyPopoverRef = useRef<HTMLDivElement>(null);

  // 消息与交互状态
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [expandedReasonings, setExpandedReasonings] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const clearConfirmRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 并发研判：一次生成对应一个会话的「运行」，不同会话可同时进行、互不阻塞。
  // 关闭抽屉/切换案例/切换会话都不中止生成；结果靠发送时的会话 ID 落回原会话。
  interface ActiveRun {
    controller: AbortController;
    text: string;
    reasoning: string;
    /** 清空会话等场景主动放弃时置位：中止后不再把部分结果写回 */
    discarded: boolean;
  }
  const [runs, setRuns] = useState<Record<string, ActiveRun>>({});
  const runsRef = useRef(runs);
  runsRef.current = runs;
  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  // 当前查看会话的进行中运行（决定流式气泡与停止按钮）
  const activeRun = runs[activeSessionId];

  // 打开研判抽屉即视为开始阅读：清除该案例的未读/进行中标记
  useEffect(() => {
    if (isOpen && caseId) clearAiResearchStatus(caseId);
  }, [isOpen, caseId]);

  // 点击外部关闭历史浮层与清空确认气泡
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clearConfirmRef.current && !clearConfirmRef.current.contains(e.target as Node)) {
        setShowClearConfirm(false);
      }
      if (historyPopoverRef.current && !historyPopoverRef.current.contains(e.target as Node)) {
        setShowHistoryPopover(false);
      }
    };
    if (showClearConfirm || showHistoryPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClearConfirm, showHistoryPopover]);

  // 读取与持久化当前会话的对话历史
  useEffect(() => {
    if (!isOpen || !activeSessionId) return;
    // 该会话正在生成中：保持内存里的流式视图，不用落盘历史覆盖
    if (runsRef.current[activeSessionId]) return;
    const session = aiChatHistoryService.getSession(activeSessionId);
    if (session && Array.isArray(session.messages)) {
      setMessages(session.messages);
    } else {
      setMessages([]);
    }
  }, [isOpen, activeSessionId, runs]);

  // 开启属于当前命主的全新会话（进行中的运行属于原会话，后台继续）
  const handleCreateNewSession = useCallback(() => {
    const newSessionId = `${effectiveDivinationType}_${caseId ? `case_${caseId}` : 'free'}_${Date.now()}`;
    setActiveSessionId(newSessionId);
    setMessages([]);
    setInputText('');
    setShowHistoryPopover(false);
    setShowClearConfirm(false);
  }, [effectiveDivinationType, caseId]);

  // 切换到当前命主的某条历史会话（继续上次对话；进行中的运行后台继续）
  const handleSelectHistorySession = useCallback((targetSessionId: string) => {
    if (targetSessionId === activeSessionId) {
      setShowHistoryPopover(false);
      return;
    }
    setActiveSessionId(targetSessionId);
    const session = aiChatHistoryService.getSession(targetSessionId);
    if (session && Array.isArray(session.messages)) {
      setMessages(session.messages);
    } else {
      setMessages([]);
    }
    setShowHistoryPopover(false);
    setShowClearConfirm(false);
  }, [activeSessionId]);

  // 删除当前命主的某个历史会话（若其上有生成任务，标记放弃后中止，避免完成后写回已删会话）
  const handleDeleteSessionItem = useCallback((targetSessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const run = runsRef.current[targetSessionId];
    if (run) {
      run.discarded = true;
      run.controller.abort();
    }
    aiChatHistoryService.deleteSession(targetSessionId);
    if (targetSessionId === activeSessionId) {
      const remaining = caseSessions.filter((s) => s.id !== targetSessionId);
      if (remaining.length > 0) {
        handleSelectHistorySession(remaining[0].id);
      } else {
        handleCreateNewSession();
      }
    }
  }, [activeSessionId, caseSessions, handleSelectHistorySession, handleCreateNewSession]);

  // 持久化指定会话的消息（不触碰视图状态）：后台生成期间发送时的会话
  // 与用户当前查看的会话可能分叉，落盘必须回到发送时的会话
  const persistMessages = useCallback(
    (targetSessionId: string, newMessages: ChatMessageItem[]) => {
      // 智能生成会话标题，绝不将命主名称作为标题
      let customTitle: string | undefined;
      const existing = aiChatHistoryService.getSession(targetSessionId);
      if (existing?.title && existing.title !== effectiveCaseName && existing.title !== '命理研判') {
        customTitle = existing.title;
      } else {
        const firstUser = newMessages.find((m) => m.role === 'user');
        if (firstUser) {
          customTitle = extractSmartTitleFromQuestion(firstUser.content, effectiveDivinationType);
        }
      }

      aiChatHistoryService.updateSessionMessages(targetSessionId, newMessages, {
        caseId,
        caseName: effectiveCaseName,
        divinationType: effectiveDivinationType,
        divinationTypeName: moduleName,
        meta,
        title: customTitle,
      });
    },
    [caseId, effectiveCaseName, effectiveDivinationType, moduleName, meta]
  );

  // 加载可用服务
  const loadServices = useCallback(async () => {
    try {
      const list = await aiChatService.getAvailableServices();
      setServices(list);
      if (list.length > 0) {
        if (!selectedServiceId || !list.some((s) => s.id === selectedServiceId)) {
          setSelectedServiceId(list[0].id);
          if (list[0].models && list[0].models.length > 0) {
            setSelectedModel(list[0].models[0]);
          }
        }
      }
    } catch (err) {
      console.warn('获取 AI 服务失败', err);
    }
  }, [selectedServiceId]);

  useEffect(() => {
    if (isOpen) {
      void loadServices();
    }
  }, [isOpen, loadServices]);

  // 当前选中的服务
  const currentService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) || services[0] || null;
  }, [services, selectedServiceId]);

  // 联动模型切换
  useEffect(() => {
    if (currentService?.models && currentService.models.length > 0) {
      if (!currentService.models.includes(selectedModel)) {
        setSelectedModel(currentService.models[0]);
      }
    }
  }, [currentService, selectedModel]);

  const serviceOptions = useMemo(() => {
    return services.map((s) => ({ value: s.id, label: s.name }));
  }, [services]);

  const modelOptions = useMemo(() => {
    if (!currentService?.models) return [];
    return currentService.models.map((m) => ({ value: m, label: m }));
  }, [currentService]);

  // 快捷追问建议
  const quickQuestions = useMemo(() => {
    if (moduleName.includes('奇门')) {
      return ['当前局势吉凶评判', '事业与求财策略', '克应玄机与行动建议', '应期与时空选择'];
    }
    return ['详断事业与职场贵人', '详评正偏财运走向', '婚恋感情与配偶特征', '近期流年吉凶关隘'];
  }, [moduleName]);

  // 滚动到底部
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, runs, scrollToBottom]);

  // 监听 ESC 键关闭（关闭不中止生成，任务转后台继续跑）
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 中止当前查看会话的生成（其他会话的运行不受影响）
  const handleStop = useCallback(() => {
    runsRef.current[activeSessionId]?.controller.abort();
  }, [activeSessionId]);

  // 执行发送消息
  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const content = (textToSend !== undefined ? textToSend : inputText).trim();
      if (!content) return;
      // 同一会话同时只允许一个生成任务；不同会话可并行（多线程研判）
      if (runsRef.current[activeSessionIdRef.current]) return;

      if (!currentService) {
        setIsSettingsOpen(true);
        return;
      }

      // 发送瞬间的会话快照：后台生成期间用户可能切换案例/会话，
      // 落盘与状态登记都必须回到发送时的会话，而不是完成时的视图
      const sentSessionId = activeSessionIdRef.current;
      const sentMessages = messages;

      const userMsg: ChatMessageItem = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      const nextMessages = [...sentMessages, userMsg];
      setMessages(nextMessages);
      persistMessages(sentSessionId, nextMessages);
      setInputText('');

      // 登记运行：同一会话互斥，不同会话并行
      const controller = new AbortController();
      const runEntry: ActiveRun = { controller, text: '', reasoning: '', discarded: false };
      runsRef.current = { ...runsRef.current, [sentSessionId]: runEntry };
      setRuns(runsRef.current);

      // 登记研判中状态（仅案例会话），供首页案例列表状态按钮展示
      if (caseId) setAiResearchRunning(caseId);

      // 构造大模型对话上下文
      const chatPayloadMessages = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const systemPrompt = aiRolePromptService.getSystemPrompt(moduleName);

      let accumulatedText = '';
      let accumulatedReasoning = '';

      // 统一收尾：按「完成时用户是否正停留在该会话」决定未读标记；
      // 关闭抽屉不中止生成，停止（手动）与出错即时清除登记
      const finishRun = (outcome: 'success' | 'stopped' | 'error') => {
        setRuns(prev => {
          if (!(sentSessionId in prev)) return prev;
          const next = { ...prev };
          delete next[sentSessionId];
          return next;
        });
        if (!caseId) return;
        if (outcome === 'success' && !(isOpenRef.current && activeSessionIdRef.current === sentSessionId)) {
          setAiResearchUnread(caseId);
        } else {
          clearAiResearchStatus(caseId);
        }
      };

      let outcome: 'success' | 'stopped' | 'error' = 'success';

      try {
        const { fullText, fullReasoning } = await aiChatService.callChatStream({
          service: currentService,
          model: selectedModel || currentService.models?.[0],
          messages: chatPayloadMessages,
          systemPrompt,
          temperature: 0.3,
          signal: controller.signal,
          onChunk: (chunk) => {
            if (chunk.reasoning) {
              accumulatedReasoning += chunk.reasoning;
              runEntry.reasoning = accumulatedReasoning;
            }
            if (chunk.text) {
              accumulatedText += chunk.text;
              runEntry.text = accumulatedText;
            }
            setRuns(prev => ({ ...prev }));
          },
        });

        const assistantMsg: ChatMessageItem = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: fullText || accumulatedText || '（无回复内容）',
          reasoning: fullReasoning || accumulatedReasoning || undefined,
          timestamp: Date.now(),
        };
        const allNext = [...nextMessages, assistantMsg];
        persistMessages(sentSessionId, allNext);
        if (activeSessionIdRef.current === sentSessionId) {
          setMessages(allNext);
        }

        // 首轮对话完成后，后台异步利用当前模型生成精炼研判标题
        if (sentMessages.length === 0 && currentService) {
          const firstUser = nextMessages.find((m) => m.role === 'user');
          if (firstUser) {
            void aiChatService.generateConversationTitle({
              service: currentService,
              model: selectedModel || currentService.models?.[0],
              question: firstUser.content,
              answer: assistantMsg.content,
              divinationType: effectiveDivinationType,
            }).then((aiTitle) => {
              if (aiTitle) {
                aiChatHistoryService.updateSessionTitle(sentSessionId, aiTitle);
              }
            });
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          outcome = 'stopped';
          if (!runEntry.discarded && accumulatedText.trim()) {
            const partialMsg: ChatMessageItem = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: accumulatedText + ' \n\n*(已手动停止生成)*',
              reasoning: accumulatedReasoning || undefined,
              timestamp: Date.now(),
            };
            persistMessages(sentSessionId, [...nextMessages, partialMsg]);
            if (activeSessionIdRef.current === sentSessionId) {
              setMessages([...nextMessages, partialMsg]);
            }
          }
        } else {
          outcome = 'error';
          const errorMsg: ChatMessageItem = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: `推理过程异常：${err instanceof Error ? err.message : '未知错误'}`,
            timestamp: Date.now(),
            error: true,
          };
          persistMessages(sentSessionId, [...nextMessages, errorMsg]);
          if (activeSessionIdRef.current === sentSessionId) {
            setMessages([...nextMessages, errorMsg]);
          }
        }
      } finally {
        finishRun(outcome);
      }
    },
    [caseId, currentService, effectiveDivinationType, inputText, messages, moduleName, persistMessages, selectedModel]
  );

  // 确认清空当前激活的会话分支（该会话若有生成任务，标记放弃后中止，部分结果不再写回）
  const handleConfirmClear = () => {
    const run = runsRef.current[activeSessionId];
    if (run) {
      run.discarded = true;
      run.controller.abort();
    }
    setMessages([]);
    aiChatHistoryService.deleteSession(activeSessionId);
    setShowClearConfirm(false);
  };

  // 复制单条消息
  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // 忽略
    }
  };

  if (!isOpen) return null;

  // 抽屉内容：页头（研判对象/操作/服务模型条）+ 消息区 + 输入区，移动端整页壳与桌面抽屉共用
  const drawerBody = (
    <>
          {/* 桌面端页头（移动端由 SubPage 页头 + 对象条替代） */}
          {!isMobileLayout && (
          <>
          <div className="p-3 sm:p-4 border-b border-border shrink-0 bg-card/95 backdrop-blur-md space-y-2.5 relative z-30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                  <span className="h-10 w-10 rounded-lg bg-primary/10 text-primary shrink-0 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 text-sm font-semibold text-foreground">
                    {moduleName} AI 研判助手
                  </div>
                </div>

              <div className="flex items-center gap-1.5">
                {/* 会话历史（当前命主名下所有会话切换与继续上次对话） */}
                <div className="relative" ref={historyPopoverRef}>
                  <button
                    type="button"
                    onClick={() => setShowHistoryPopover((prev) => !prev)}
                    title={`查看【${effectiveCaseName}】的会话历史`}
                    className={`h-10 px-3 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-[13px] ${
                      showHistoryPopover
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline font-sans">会话历史</span>
                    {caseSessions.length > 0 && (
                      <span className="text-[10px] px-1.5 rounded-full bg-muted text-muted-foreground font-mono leading-4">
                        {caseSessions.length}
                      </span>
                    )}
                  </button>

                  {showHistoryPopover && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-[400px] max-w-[calc(100vw-3rem)] rounded-xl border border-border/90 bg-popover text-popover-foreground shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                      {/* 标题行：对象名在抽屉对象条已常显，此处不再重复 */}
                      <div className="flex items-center justify-between px-1 pb-2 border-b border-border/50">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <History className="w-4 h-4 text-primary" />
                          会话历史
                        </span>
                        <span className="text-[11px] text-muted-foreground">共 {caseSessions.length} 次研判</span>
                      </div>

                      {/* 历史会话分支列表 */}
                      <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-0.5">
                        {caseSessions.length === 0 ? (
                          <div className="py-8 flex flex-col items-center gap-2 text-center">
                            <div className="w-11 h-11 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center">
                              <History className="w-5 h-5 text-muted-foreground/60" />
                            </div>
                            <div className="text-xs text-foreground/70 font-medium">当前命主暂无历史对话</div>
                            <div className="text-[11px] text-muted-foreground">发送第一条消息后将自动保存会话</div>
                          </div>
                        ) : (
                          caseSessions.map((s) => {
                            const isCurrent = s.id === activeSessionId;
                            const lastMsg = s.messages[s.messages.length - 1];
                            const timeStr = new Date(s.updatedAt).toLocaleDateString([], {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            return (
                              <div
                                key={s.id}
                                onClick={() => handleSelectHistorySession(s.id)}
                                className={`group p-2.5 rounded-lg cursor-pointer transition-all border flex items-center justify-between gap-2 ${
                                  isCurrent
                                    ? 'bg-primary/15 text-primary border-primary/30 font-medium shadow-2xs'
                                    : 'border-transparent hover:bg-muted/70 text-foreground/90'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 text-[13px]">
                                    {isCurrent && (
                                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                    )}
                                    <span className="truncate font-sans font-medium">
                                      {s.title || '命理综合研判'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                                    {lastMsg?.content || '暂无提问'}
                                  </div>
                                </div>

                                <div className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1.5">
                                  <span>{timeStr}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteSessionItem(s.id, e)}
                                    title="删除此会话"
                                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* 快捷新建按钮 */}
                      <div className="pt-2 border-t border-border/50">
                        <button
                          type="button"
                          onClick={handleCreateNewSession}
                          className="w-full h-9 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-primary" />
                          <span>开启新会话</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI 角色设定与系统提示词规范 */}
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(true)}
                  title={`设定 AI 研判角色与提示词规范（${moduleName}）`}
                  className="h-10 px-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer flex items-center gap-1.5 text-[13px]"
                >
                  <UserCog className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline font-sans">角色</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  title="配置 AI 服务"
                  className="h-10 w-10 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 w-10 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer flex items-center justify-center"
                  aria-label="关闭抽屉"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          </>
          )}

          {/* 研判对象条（移动端改版移植：页头正下方独立成条，长名省略；桌面端右端附会话计数） */}
          <div className="flex-shrink-0 flex items-center gap-1.5 min-w-0 px-3.5 py-2 border-b border-border/60 text-xs text-muted-foreground">
            <Clock3 className="w-3.5 h-3.5 shrink-0" />
            <span className="shrink-0">研判对象：</span>
            <span className="truncate font-medium text-foreground">{effectiveCaseName}</span>
            {!isMobileLayout && (
              <span className="ml-auto shrink-0 text-[11px] font-mono">{messages.length} 条对话</span>
            )}
          </div>

          {/* 消息历史滚动区 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-0">
            {messages.length === 0 && !activeRun && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 px-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">开启深度命理研判</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-sm">
                    输入您想要了解的问题（如性格特质、财官格局、吉凶应对），AI 将结合当前排盘为您提供严密详尽的学术论证。
                  </p>
                </div>

                {initialPrompt && (
                  <button
                    type="button"
                    onClick={() => handleSendMessage(initialPrompt)}
                    className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-98 focus-ring"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>发送当前排盘发起初审</span>
                  </button>
                )}

                {/* 快捷追问融入空态作为建议（移动端改版，桌面端同步） */}
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {quickQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={!!activeRun}
                      onClick={() => void handleSendMessage(q)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-foreground transition-colors hover:bg-muted active:bg-muted cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                    <span>{isUser ? '我' : `${moduleName} AI 助手`}</span>
                    <span>·</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`relative group max-w-[92%] rounded-xl p-3.5 text-sm md:text-base leading-[1.75] ${
                      isUser
                        ? 'bg-card border border-border/80 text-foreground rounded-tr shadow-xs space-y-2'
                        : msg.error
                          ? 'bg-destructive/10 text-destructive border border-destructive/30 rounded-tl'
                          : 'bg-card border border-border/80 text-foreground rounded-tl shadow-xs space-y-2'
                    }`}
                  >
                    {/* Assistant 消息的深度思考思维链 */}
                    {!isUser && msg.reasoning && (
                      <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedReasonings((prev) => ({
                              ...prev,
                              [msg.id]: !prev[msg.id],
                            }))
                          }
                          className="w-full flex items-center justify-between px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors bg-muted/40 cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            <Brain className="w-3.5 h-3.5 text-indigo-500" />
                            <span>专家推演思维链 ({msg.reasoning.length} 字)</span>
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              expandedReasonings[msg.id] ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {expandedReasonings[msg.id] && (
                          <div className="p-3 max-h-56 overflow-y-auto font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap border-t border-border/50 bg-background/50">
                            {msg.reasoning}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 正文内容：用户提问与 AI 回答均全面支持 Markdown 渲染 */}
                    <div className="max-w-none break-words font-reading">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={drawerMarkdownComponents}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* 复制按钮 */}
                    {!isUser && !msg.error && (
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground transition-all cursor-pointer"
                        title="复制回复"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 流式生成中的临时气泡（仅当用户停留在生成中的会话） */}
            {activeRun && (
              <div className="flex flex-col items-start space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                  <span>{moduleName} AI 助手</span>
                  <span>·</span>
                  <span className="text-primary font-medium">思考与推演中...</span>
                </div>

                <div className="relative max-w-[92%] rounded-xl rounded-tl p-3.5 text-sm md:text-base leading-[1.75] bg-card border border-border/80 text-foreground shadow-xs space-y-2.5">
                  {/* 流式思维链展示 */}
                  {activeRun.reasoning && (
                    <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden text-xs">
                      <div className="flex items-center justify-between px-3 py-1.5 text-muted-foreground bg-muted/40 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                          <span>正在推演逻辑 ({activeRun.reasoning.length} 字)...</span>
                        </span>
                      </div>
                      <div className="p-3 max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap border-t border-border/50 bg-background/50">
                        {activeRun.reasoning}
                      </div>
                    </div>
                  )}

                  {/* 流式正文 */}
                  {activeRun.text ? (
                    <div className="max-w-none break-words font-reading">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={drawerMarkdownComponents}>
                        {activeRun.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                      <span>正在综合命盘气势与五行格局...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 移动端：服务/模型换挡条（两枚 chips 平分宽度）+ 清空（小占比） */}
          {isMobileLayout && (
            <div ref={clearConfirmRef} className="flex-shrink-0 relative flex items-center gap-2 px-3 pt-3 pb-1.5">
              <button
                type="button"
                onClick={() => setPickerSheet('svc')}
                title="切换服务"
                className="flex-1 min-w-0 h-8 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/60 text-xs transition-colors active:bg-secondary cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-medium text-foreground truncate">{currentService?.name ?? '未配置服务'}</span>
              </button>
              {modelOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPickerSheet('mdl')}
                  title="切换模型"
                  className="flex-1 min-w-0 h-8 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/60 text-xs transition-colors active:bg-secondary cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-medium text-foreground truncate">{selectedModel}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowClearConfirm((prev) => !prev)}
                title="清空当前对话"
                className={`w-11 h-8 shrink-0 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                  showClearConfirm
                    ? 'text-destructive bg-destructive/15 border-destructive/40'
                    : 'text-muted-foreground border-border active:bg-muted'
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* 清空确认气泡：从换挡条向上弹出 */}
              {showClearConfirm && (
                <div className="absolute right-3 bottom-full mb-2 z-30 w-56 p-3 rounded-xl border border-border/90 bg-popover text-popover-foreground shadow-2xl text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <span>清空对话记录？</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    清空后当前模块的对话历史将无法恢复。
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmClear}
                      className="px-2.5 py-1 rounded-md text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium cursor-pointer shadow-xs transition-colors"
                    >
                      确认清空
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 桌面端：服务/模型换挡条（移动端改版移植：置于输入区上方，页头不再放第二行控制条）+ 清空 */}
          {!isMobileLayout && (
            <div ref={clearConfirmRef} className="flex-shrink-0 relative flex items-center gap-2 flex-wrap px-3 sm:px-4 py-2.5 border-t border-border/40 bg-card/50">
              {services.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <CustomDropdown
                    label="服务"
                    value={selectedServiceId}
                    options={serviceOptions}
                    onChange={(val) => setSelectedServiceId(val)}
                    icon={<Bot className="w-3.5 h-3.5 text-primary" />}
                  />
                  {modelOptions.length > 0 && (
                    <CustomDropdown
                      label="模型"
                      value={selectedModel}
                      options={modelOptions}
                      onChange={(val) => setSelectedModel(val)}
                      icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                    />
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-warning" />
                  尚未配置 AI 服务，点击前往配置
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowClearConfirm((prev) => !prev)}
                title="清空当前对话"
                className={`ml-auto w-10 h-10 shrink-0 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                  showClearConfirm
                    ? 'text-destructive bg-destructive/15 border-destructive/40'
                    : 'text-muted-foreground border-border hover:text-destructive hover:bg-destructive/10'
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* 清空确认气泡：从换挡条向上弹出 */}
              {showClearConfirm && (
                <div className="absolute right-3 sm:right-4 bottom-full mb-2 z-30 w-56 p-3 rounded-xl border border-border/90 bg-popover text-popover-foreground shadow-2xl text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <span>清空对话记录？</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    清空后当前模块的对话历史将无法恢复。
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmClear}
                      className="px-2.5 py-1 rounded-md text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium cursor-pointer shadow-xs transition-colors"
                    >
                      确认清空
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 底部输入框 */}
          <div className="p-3 sm:p-4 border-t border-border bg-card/70 shrink-0 space-y-2">
            <div className="relative rounded-lg border border-border bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-colors flex flex-col p-2.5 space-y-2">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder={`询问关于本命盘的任何问题... (Enter 发送，Shift+Enter 换行)`}
                rows={2}
                className="w-full bg-transparent border-0 resize-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 !ring-0 !ring-offset-0 !outline-none leading-relaxed p-0"
              />

              <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
                <div className="text-[11px] text-muted-foreground">
                  已关联当前排盘上下文
                </div>

                <div className="flex items-center gap-2">
                  {activeRun ? (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="px-3 py-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>停止</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!inputText.trim() || !currentService}
                      onClick={() => void handleSendMessage()}
                      className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer focus-ring"
                    >
                      <Send className="w-3 h-3" />
                      <span>发送</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
    </>
  );

  const modals = (
    <>
      {/* AI 服务集成设置弹窗 */}
      {isSettingsOpen && (
        <AiIntegrationModal
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false);
            void loadServices();
          }}
        />
      )}

      {/* AI 角色设定与系统提示词规范弹窗 */}
      {isRoleModalOpen && (
        <AiRoleSettingsModal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          moduleName={moduleName}
        />
      )}
    </>
  );

  // 移动端：SubPage 页头右侧动作组（历史角标 / 角色 / 设置）
  const mobileHeaderActions = (
    <>
      <button
        type="button"
        onClick={() => setShowHistorySheet(true)}
        title="会话历史"
        className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors active:bg-muted cursor-pointer"
      >
        <History className="w-4 h-4" />
        {caseSessions.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {caseSessions.length}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => setIsRoleModalOpen(true)}
        title="AI 角色设定"
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors active:bg-muted cursor-pointer"
      >
        <UserCog className="w-4 h-4 text-primary" />
      </button>
      <button
        type="button"
        onClick={() => setIsSettingsOpen(true)}
        title="AI 服务设置"
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors active:bg-muted cursor-pointer"
      >
        <Settings className="w-4 h-4" />
      </button>
    </>
  );

  // 移动端：会话历史底部抽屉
  const historySheetEl = isMobileLayout ? (
    <>
      <div
        className={`fixed inset-0 z-[110] bg-black/55 transition-opacity duration-200 ${showHistorySheet ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowHistorySheet(false)}
      />
      <div
        className={`fixed left-0 right-0 bottom-0 z-[115] bg-popover border-t border-border rounded-t-2xl flex flex-col max-h-[72vh] transition-transform duration-300 ${showHistorySheet ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'var(--safe-area-inset-bottom, 0px)' }}
      >
        <div className="w-9 h-1 rounded-full bg-border mx-auto mt-2.5 shrink-0" />
        <div className="flex items-center justify-between px-4 pt-2 pb-1 shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">会话历史</span>
            <span className="text-[10px] text-muted-foreground">共 {caseSessions.length} 次研判</span>
          </div>
          <button
            type="button"
            onClick={() => setShowHistorySheet(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          {caseSessions.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">当前命主暂无历史对话</div>
          ) : (
            caseSessions.map((s) => {
              const isCurrent = s.id === activeSessionId;
              const lastMsg = s.messages[s.messages.length - 1];
              const timeStr = new Date(s.updatedAt).toLocaleDateString([], {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    handleSelectHistorySession(s.id);
                    setShowHistorySheet(false);
                  }}
                  className="flex items-center justify-between gap-2 py-3 border-b border-border/50 last:border-b-0 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className={`flex items-center gap-1 text-[13px] font-medium ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                      {isCurrent && <Check className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{s.title || '命理综合研判'}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {lastMsg?.content || '暂无提问'}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeStr}</span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSessionItem(s.id, e)}
                    title="删除此会话"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="p-3 border-t border-border/60 shrink-0">
          <button
            type="button"
            onClick={() => {
              handleCreateNewSession();
              setShowHistorySheet(false);
            }}
            className="w-full h-10 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-colors active:bg-primary/90 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            开启新会话
          </button>
        </div>
      </div>
    </>
  ) : null;

  // 移动端：服务/模型选择板
  const pickerSheetEl = isMobileLayout && pickerSheet ? (
    <>
      <div className="fixed inset-0 z-[110] bg-black/55" onClick={() => setPickerSheet(null)} />
      <div
        className="fixed left-0 right-0 bottom-0 z-[115] bg-popover border-t border-border rounded-t-2xl"
        style={{ paddingBottom: 'calc(10px + var(--safe-area-inset-bottom, 0px))' }}
      >
        <div className="w-9 h-1 rounded-full bg-border mx-auto mt-2.5" />
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <span className="text-sm font-semibold text-foreground">{pickerSheet === 'svc' ? '选择服务' : '选择模型'}</span>
          <button
            type="button"
            onClick={() => setPickerSheet(null)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[46vh] overflow-y-auto px-2">
          {(pickerSheet === 'svc' ? serviceOptions : modelOptions).map((opt) => {
            const isCurrent = pickerSheet === 'svc' ? opt.value === selectedServiceId : opt.value === selectedModel;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (pickerSheet === 'svc') setSelectedServiceId(opt.value);
                  else setSelectedModel(opt.value);
                  setPickerSheet(null);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-3 text-left text-sm border-b border-border/40 last:border-b-0 transition-colors cursor-pointer ${
                  isCurrent ? 'text-primary font-medium' : 'text-foreground hover:bg-muted/50'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isCurrent && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  ) : null;

  // 移动端：统一整页二级界面（返回手势由 SubPage 接管，页面铺满不再露底层内容）
  if (isMobileLayout) {
    return (
      <>
        <SubPage
          isOpen={isOpen}
          onClose={onClose}
          title={`${moduleName} AI 研判助手`}
          actions={mobileHeaderActions}
          bodyClassName="flex flex-col"
        >
          {drawerBody}
        </SubPage>
        {modals}
        {historySheetEl}
        {pickerSheetEl}
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[100] isolate flex items-stretch justify-end p-0 bg-black/20 dark:bg-black/35 transition-colors duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            // 关闭抽屉不中止生成：任务转后台继续跑，完成后在案例列表标记未读
            onClose();
          }
        }}
      >
        <div
          className="w-full sm:w-[520px] md:w-[580px] lg:w-[640px] max-w-[96vw] h-full bg-background border-l border-border shadow-2xl flex flex-col animate-slide-in-right z-10"
          onClick={(e) => e.stopPropagation()}
          // 抽屉贴顶贴底，而浮层定位在视口上、拿不到根节点的安全区留白，头部会被安卓
          // 系统栏盖住（见 MainActivity.kt 注入的 --safe-area-inset-*）。面板自带背景色，
          // 系统栏区域仍铺满，只有内容被顶下来。
          style={{
            paddingTop: 'var(--safe-area-inset-top, 0px)',
            paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
          }}
        >
          {drawerBody}
        </div>
      </div>
      {modals}
    </>
  );
}
