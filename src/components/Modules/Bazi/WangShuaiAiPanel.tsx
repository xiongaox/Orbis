/**
 * 模块定位：
 * - 所在层级：业务组件层
 * - 主要目标：为用户提供正统子平学术级的 AI 深度命理推演与学术论证
 * - 核心优化：轻量控制栏、微缩折叠思考链、表格与排版全面美化、一键复制
 
*/

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Bot,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Brain,
  AlertCircle,
  Sparkles,
  Square,
  Cpu,
  BookOpen,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { AiModelService } from '../../../services/aiModelService';
import type { BaziApiResponse } from '../../../types/bazi';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import {
  getGodsByVerdict,
  parseAiVerdict,
} from '../../../lib/xuan-bazi/skills/yueyuanWangShuaiSkill';

/**
 * 桌面端高级下拉选择菜单（移动端不走此组件，改用底部选择板 pickerSheetEl）
 * 深浅色主题兼容，彻底消除 macOS / Windows 原生 select 弹出的白底刺眼菜单
 */
interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (val: string) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

function CustomDropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
  icon,
}: CustomDropdownProps) {
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
    <div className="relative w-full sm:flex-1 sm:min-w-0" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-xs sm:text-sm rounded-xl border border-border/80 bg-background/90 hover:bg-muted/70 text-foreground transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-primary ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isOpen ? 'border-primary ring-1 ring-primary/40 bg-muted/50' : ''}`}
      >
        {icon}
        <span className="text-muted-foreground shrink-0">{label}</span>
        <span className="flex-1 min-w-0 text-left font-medium text-foreground truncate">
          {displayLabel}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-border/80 bg-popover/95 text-popover-foreground backdrop-blur-md p-1 shadow-xl text-xs space-y-0.5 max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors text-left ${
                  isSelected
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'hover:bg-muted/80 text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 健壮规范化大模型输出的 Markdown
 * 逐行处理表格语法：
 * 1. 消除大模型可能在表格行之间输出的多余空行（确保 GFM 表格语法连续合规）
 * 2. 拆解偶发粘连在单行的伪表格（| | 单元格拆分）
 * 3. 确保表格块与前后普通文本之间有且仅有一个标准空行
 */
/**
 * 防御性语言过滤：历史缓存或模型失控时，推演可能在 JSON 结论卡之后、中文正文之前
 * 夹带整段英文推导（甚至夹带 "(坤造)" 等零星汉字）。按行统计中文字符数，
 * 丢弃第一个「含 ≥5 个汉字」正文行之前的所有英文行（JSON 块保留，交给 normalizeMarkdown 剥离）；
 * 新版提示词已从源头禁止英文输出，此过滤对合规输出为无操作。
 */
function stripEnglishLead(text: string): string {
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  const cjkCount = (s: string) => (s.match(/[\u4e00-\u9fff]/g) || []).length;
  const isFence = (s: string) => s.trimStart().startsWith('```');

  // 第一遍：找锚点——围栏外第一个含 ≥5 个汉字的行（JSON 块内部不算）
  let anchor = -1;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (isFence(lines[i])) { inFence = !inFence; continue; }
    if (!inFence && cjkCount(lines[i]) >= 5) { anchor = i; break; }
  }
  if (anchor === -1) return text;

  // 第二遍：丢弃锚点前的英文行；JSON 围栏块整块保留（供 normalizeMarkdown 剥离结论卡）
  inFence = false;
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (isFence(l)) { inFence = !inFence; kept.push(l); continue; }
    if (i >= anchor || inFence) kept.push(l);
  }
  return kept.join('\n');
}

function normalizeMarkdown(text: string): string {
  if (!text) return '';

  // 步骤 0：剥离大模型在推演开头自主输出的 json:verdict 卡片块，避免在正文中重复展示原始JSON
  const stripped = text.replace(/```(?:json:verdict|json)?\s*\{[\s\S]*?(?:\}\s*```|\}\s*$)/g, '').trim();

  // 步骤 1：若大模型将多行表格粘连在单行（以 | | 分隔），还原为换行
  const raw = stripped.replace(/\|\s*\|\s*/g, '|\n| ');

  // 步骤 2：逐行规范化，确保表格行紧密连续，杜绝表格行间空行
  const lines = raw.split(/\r?\n/);
  const result: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1;

    if (isTableRow) {
      if (!inTable) {
        // 表格块起始：确保表格上方有且仅有一个空行
        if (result.length > 0 && result[result.length - 1].trim() !== '') {
          result.push('');
        }
        inTable = true;
      }
      // 表格内部：必须连续紧密，直接推入当前行
      result.push(trimmed);
    } else {
      if (inTable) {
        // 检查后续是否紧接着还是表格行（处理大模型在表格各行之间误打空行的情况）
        let nextIsTable = false;
        for (let j = i + 1; j < lines.length; j++) {
          const nextTrim = lines[j].trim();
          if (nextTrim === '') continue;
          if (nextTrim.startsWith('|') && nextTrim.endsWith('|')) {
            nextIsTable = true;
          }
          break;
        }

        if (nextIsTable) {
          // 跳过表格内部的空行，保持表格连贯性
          continue;
        } else {
          // 表格块正式结束
          inTable = false;
          if (result.length > 0 && result[result.length - 1].trim() !== '') {
            result.push('');
          }
          if (trimmed !== '') {
            result.push(lines[i]);
          }
        }
      } else {
        result.push(lines[i]);
      }
    }
  }

  return result.join('\n');
}

interface WangShuaiAiPanelProps {
  services: AiModelService[];
  selectedServiceId: string;
  onSelectServiceId: (id: string) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  isLoading: boolean;
  onRunAnalysis: (force?: boolean) => void;
  onStopAnalysis?: () => void;
  analysisResult: string;
  reasoningContent: string;
  error: string;
  baziData?: BaziApiResponse | null;
}

export default function WangShuaiAiPanel({
  services,
  selectedServiceId,
  onSelectServiceId,
  selectedModel,
  onSelectModel,
  isLoading,
  onRunAnalysis,
  onStopAnalysis,
  analysisResult,
  reasoningContent,
  error,
  baziData = null,
}: WangShuaiAiPanelProps) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  // 推演全文「专注阅读模式」开关：默认关闭、全文常驻展开（内容超高才能保证弹窗可滚动）。
  // 开启后隐藏全文只留结论卡 + 两行摘要。点「开始/重新推演」时自动退出该模式。
  const [reportCollapsed, setReportCollapsed] = useState(false);
  // 移动端服务/模型底部选择板：'svc' | 'model' | null
  const [pickerSheet, setPickerSheet] = useState<'svc' | 'model' | null>(null);
  const { isMobile } = useLayoutMode();

  const currentService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) || services[0] || null;
  }, [services, selectedServiceId]);

  // 下拉菜单数据源
  const serviceOptions = useMemo(() => {
    return services.map((s) => ({
      value: s.id,
      label: s.name,
    }));
  }, [services]);

  const modelOptions = useMemo(() => {
    if (!currentService?.models) return [];
    return currentService.models.map((m) => ({
      value: m,
      label: m,
    }));
  }, [currentService]);

  // 复制结果
  const handleCopy = async () => {
    if (!analysisResult) return;
    try {
      await navigator.clipboard.writeText(analysisResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // 提取思考链最后一行，用于微缩预览
  const reasoningSnippet = useMemo(() => {
    if (!reasoningContent) return '子平命理条件变量深度推导中...';
    const lines = reasoningContent.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines[lines.length - 1] || '命理推演进行中...';
  }, [reasoningContent]);

  // 智能提炼 AI 研判结论
  const parsedVerdict = useMemo(() => {
    return parseAiVerdict(analysisResult);
  }, [analysisResult]);

  // 专注模式摘要：过滤英文推导后取第一句完整断语（在句号处收），绝不产生"截断悬空"的假滚动暗示
  const reportDigest = useMemo(() => {
    const plain = normalizeMarkdown(stripEnglishLead(analysisResult)).replace(/[#>*`\-[\]]/g, '').trim();
    if (plain.length <= 90) return plain;
    const m = plain.match(/^[\s\S]*?[。！？]/);
    return m && m[0].length <= 160 ? m[0] : `${plain.slice(0, 90)}……`;
  }, [analysisResult]);

  // 计算展示的喜用神与忌神
  const { displayJoyGods, displayJiGods } = useMemo(() => {
    if (!parsedVerdict) return { displayJoyGods: [], displayJiGods: [] };

    const riGan = baziData?.pillars?.[2]?.tiangan || '辛';
    const fallback = getGodsByVerdict(riGan, parsedVerdict.verdict);

    let joys = parsedVerdict.joyGods || [];
    let jis = parsedVerdict.jiGods || [];

    // 若大模型尚未输出到用神章节，或提取到的五行数量不合理（>3个），则结合排盘日干与定调倾向提供精准五行计算保底
    if (joys.length === 0 || joys.length > 3) {
      joys = fallback.joyGods;
    }
    if (jis.length === 0 || jis.length > 3) {
      jis = fallback.jiGods;
    }

    // 命理绝对互斥法则：忌仇神严禁包含喜用神
    jis = jis.filter((g) => !joys.includes(g));

    // 若互斥后忌神为空，使用算法推算的忌神
    if (jis.length === 0) {
      jis = fallback.jiGods.filter((g) => !joys.includes(g));
    }

    return { displayJoyGods: joys, displayJiGods: jis };
  }, [parsedVerdict, baziData]);

  const verdictStyle = useMemo(() => {
    if (!parsedVerdict) return null;
    switch (parsedVerdict.verdictType) {
      case 'strong':
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-950/25',
          border: 'border-emerald-500/30 dark:border-emerald-500/30',
          iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          statusBadge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
          verdictBadge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
        };
      case 'weak':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-950/25',
          border: 'border-amber-500/30 dark:border-amber-500/30',
          iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
          statusBadge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
          verdictBadge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40',
        };
      case 'special':
        return {
          bg: 'bg-purple-500/10 dark:bg-purple-950/25',
          border: 'border-purple-500/30 dark:border-purple-500/30',
          iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
          statusBadge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30',
          verdictBadge: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40',
        };
      case 'neutral':
      default:
        return {
          bg: 'bg-indigo-500/10 dark:bg-indigo-950/25',
          border: 'border-indigo-500/30 dark:border-indigo-500/30',
          iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
          statusBadge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30',
          verdictBadge: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40',
        };
    }
  }, [parsedVerdict]);

  // 移动端：服务/模型底部选择板（与 AI 助手页同款交互，选项行加大到 48px 触控目标）
  const pickerSheetEl = isMobile && pickerSheet ? (
    <>
      <div className="fixed inset-0 z-[110] bg-black/55" onClick={() => setPickerSheet(null)} />
      <div
        className="fixed left-0 right-0 bottom-0 z-[115] bg-popover border-t border-border rounded-t-2xl"
        style={{ paddingBottom: 'calc(10px + var(--safe-area-inset-bottom, 0px))' }}
      >
        <div className="w-9 h-1 rounded-full bg-border mx-auto mt-2.5" />
        <div className="max-h-[46vh] overflow-y-auto px-2 pt-2 pb-1">
          {(pickerSheet === 'svc' ? serviceOptions : modelOptions).map((opt) => {
            const isCurrent = pickerSheet === 'svc' ? opt.value === selectedServiceId : opt.value === selectedModel;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (pickerSheet === 'svc') onSelectServiceId(opt.value);
                  else onSelectModel(opt.value);
                  setPickerSheet(null);
                }}
                className={`w-full flex items-center justify-between gap-2 min-h-12 px-3.5 text-left text-base border-b border-border/40 last:border-b-0 transition-colors cursor-pointer ${
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

  return (
    <>
      <div className="space-y-3 text-xs sm:text-sm">
      {/* 1. 模型配置区：移动端为 44px 触控选择行，点按唤起底部选择板（与 AI 助手页同款交互）；
          桌面端维持双列下拉，悬停弹出更适合鼠标操作 */}
      <div className="p-3 rounded-xl border border-border/80 bg-card/70 shadow-xs space-y-2.5">
        {services.length > 0 ? (
          <>
            {isMobile ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setPickerSheet('svc')}
                  className="w-full min-h-11 flex items-center gap-2.5 px-3.5 rounded-xl border border-border/80 bg-background/90 hover:bg-muted/70 text-sm transition-colors disabled:opacity-50 cursor-pointer select-none focus-ring"
                >
                  <Bot className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-muted-foreground shrink-0">服务</span>
                  <span className="flex-1 min-w-0 text-left font-medium text-foreground truncate">
                    {currentService?.name || '请选择'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>

                {modelOptions.length > 0 && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setPickerSheet('model')}
                    className="w-full min-h-11 flex items-center gap-2.5 px-3.5 rounded-xl border border-border/80 bg-background/90 hover:bg-muted/70 text-sm transition-colors disabled:opacity-50 cursor-pointer select-none focus-ring"
                  >
                    <Cpu className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-muted-foreground shrink-0">模型</span>
                    <span className="flex-1 min-w-0 text-left font-medium text-foreground truncate">
                      {selectedModel || '请选择'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <CustomDropdown
                  label="服务"
                  value={selectedServiceId}
                  options={serviceOptions}
                  onChange={onSelectServiceId}
                  disabled={isLoading}
                  icon={<Bot className="w-4 h-4 text-indigo-500 shrink-0" />}
                />

                {modelOptions.length > 0 && (
                  <CustomDropdown
                    label="模型"
                    value={selectedModel}
                    options={modelOptions}
                    onChange={onSelectModel}
                    disabled={isLoading}
                    icon={<Cpu className="w-4 h-4 text-primary shrink-0" />}
                  />
                )}
              </div>
            )}

            {isLoading ? (
              <button
                type="button"
                onClick={() => {
                  setReportCollapsed(false);
                  onStopAnalysis?.();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-destructive/15 text-destructive border border-destructive/30 rounded-xl text-sm font-medium hover:bg-destructive/25 transition-colors shadow-xs cursor-pointer"
                title="停止当前推演"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>停止推演</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setReportCollapsed(false);
                  onRunAnalysis(Boolean(analysisResult));
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer active:scale-[0.99]"
              >
                {analysisResult ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>重新推演</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>开始推演</span>
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>尚未配置可用 AI 服务</span>
          </div>
        )}
      </div>

      {/* 2. 异常提示 */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold">推演中断</div>
            <div className="text-muted-foreground leading-relaxed">{error}</div>
          </div>
        </div>
      )}

      {/* 3. 微缩折叠思考链 (极简胶囊，避免喧宾夺主) */}
      {(isLoading || reasoningContent) && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 overflow-hidden transition-all text-xs">
          <div
            onClick={() => setIsReasoningExpanded((v) => !v)}
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-indigo-500/10 transition-colors select-none"
          >
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium truncate pr-2">
              <Brain className={`w-3.5 h-3.5 shrink-0 ${isLoading ? 'animate-pulse text-indigo-500' : ''}`} />
              <span className="truncate">
                {isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <span>思考中:</span>
                    <span className="text-muted-foreground truncate font-normal font-mono">{reasoningSnippet}</span>
                  </span>
                ) : (
                  <span>专家推演思维链 ({reasoningContent.length}字)</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
              <span>{isReasoningExpanded ? '收起' : '展开'}</span>
              {isReasoningExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </div>
          </div>

          {isReasoningExpanded && (
            <div className="p-3 border-t border-indigo-500/20 bg-background/50 font-mono text-xs max-h-52 overflow-y-auto space-y-1 text-muted-foreground leading-relaxed">
              {reasoningContent.split('\n').map((line, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-indigo-500/40 select-none">›</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. AI 核心研判结论卡片 (专业命理排版重构，消除左右挤压) */}
      {parsedVerdict && verdictStyle && (
        <div className={`p-4 rounded-xl border ${verdictStyle.border} ${verdictStyle.bg} shadow-xs space-y-3 transition-all`}>
          {/* 顶栏：核心定调主标题与状态徽章 */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${verdictStyle.iconBg}`}>
                <Sparkles className="w-4 h-4" />
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  AI 命局定调:
                </span>
                <span className={`text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-lg border shadow-xs tracking-wide ${verdictStyle.verdictBadge}`}>
                  {parsedVerdict.verdict}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${verdictStyle.statusBadge}`}>
                {isLoading ? '实时提炼中' : '学术定调'}
              </span>
            </div>
          </div>

          {/* 中间：核心论据独立展示区，文字通透、行距舒适、不局促 */}
          <div className="bg-background/60 border border-border/50 rounded-lg p-3 sm:p-3.5 space-y-1.5 shadow-2xs">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <span>研判核心断语</span>
            </div>
            <p className="text-[13px] sm:text-sm text-foreground/90 leading-[1.8] font-normal tracking-wide">
              {parsedVerdict.reason}
            </p>
          </div>

          {/* 底栏：喜用神、忌仇神与命理流通特征 */}
          {(displayJoyGods.length > 0 || displayJiGods.length > 0 || parsedVerdict.tags.length > 0) && (
            <div className="flex items-center justify-between gap-2.5 flex-wrap pt-1 border-t border-border/40">
              <div className="flex items-center gap-3 flex-wrap">
                {/* 喜用神 */}
                {displayJoyGods.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">喜用:</span>
                    <div className="flex items-center gap-1">
                      {displayJoyGods.map((god) => (
                        <span
                          key={god}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                        >
                          {god}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 忌仇神 */}
                {displayJiGods.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">忌仇:</span>
                    <div className="flex items-center gap-1">
                      {displayJiGods.map((god) => (
                        <span
                          key={god}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-semibold"
                        >
                          {god}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 命理特征标签 */}
              {parsedVerdict.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">特征:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {parsedVerdict.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-background/80 border border-border/60 text-foreground/80 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. 推演正文 Markdown 渲染 (全文常驻保证弹窗可滚；「专注模式」可隐藏全文只看结论) */}
      {analysisResult ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground px-1 pt-1">
            <button
              type="button"
              onClick={() => setReportCollapsed((v) => !v)}
              className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors cursor-pointer select-none"
              title={reportCollapsed ? '展开完整推演过程' : '进入专注模式，只看结论'}
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>{reportCollapsed ? '专注模式 (仅结论)' : '条件变量深度推导演绎'}</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                ({analysisResult.length}字)
              </span>
              {reportCollapsed
                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              title="复制推演结论"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? '已复制' : '复制'}</span>
            </button>
          </div>

          {reportCollapsed ? (
            /* 专注模式：只放完整内容（结论卡 + 完整首句 + 明确的展开按钮），不做文本截断，
               避免"看似还有内容却滚不动"的矛盾——此视图本就矮于弹窗视口，没有可滚余量 */
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2.5">
              <p className="text-[13px] text-foreground/85 leading-[1.8]">
                {reportDigest}
              </p>
              <button
                type="button"
                onClick={() => setReportCollapsed(false)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>展开完整推演 ({analysisResult.length}字)</span>
              </button>
            </div>
          ) : (
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 leading-relaxed space-y-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                h1: ({ ...props }) => (
                  <h1 className="text-base sm:text-lg font-bold text-foreground border-b border-border/60 pb-1.5 mt-3 mb-2 flex items-center gap-1.5" {...props} />
                ),
                h2: ({ ...props }) => (
                  <h2 className="text-sm sm:text-base font-bold text-primary mt-3.5 mb-2 flex items-center gap-1.5" {...props} />
                ),
                h3: ({ ...props }) => (
                  <h3 className="text-[13px] sm:text-sm font-semibold text-foreground mt-3 mb-1.5 flex items-center gap-1" {...props} />
                ),
                p: ({ ...props }) => <p className="text-foreground/85 text-[13px] sm:text-sm leading-[1.8] my-2" {...props} />,
                ul: ({ ...props }) => <ul className="list-disc pl-5 space-y-1.5 my-2 text-foreground/85 text-[13px] sm:text-sm" {...props} />,
                li: ({ ...props }) => <li className="leading-[1.8] marker:text-primary/60" {...props} />,
                strong: ({ ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                blockquote: ({ ...props }) => (
                  <blockquote className="border-l-2 border-primary/70 bg-primary/5 pl-3 py-1.5 rounded-r-md my-2.5 text-[13px] sm:text-sm text-muted-foreground italic leading-[1.8]" {...props} />
                ),
                // 美化表格
                table: ({ ...props }) => (
                  <div className="my-3 overflow-x-auto rounded-lg border border-border/80 shadow-xs">
                    <table className="w-full border-collapse text-[13px] sm:text-sm text-left" {...props} />
                  </div>
                ),
                thead: ({ ...props }) => (
                  <thead className="bg-muted/70 text-foreground font-semibold border-b border-border" {...props} />
                ),
                th: ({ ...props }) => (
                  <th className="px-3 py-2 font-semibold text-foreground border-r border-border/40 last:border-r-0 whitespace-nowrap bg-muted/50" {...props} />
                ),
                td: ({ ...props }) => (
                  <td className="px-3 py-2 text-foreground/85 border-t border-border/40 border-r border-border/40 last:border-r-0 leading-[1.7]" {...props} />
                ),
                tr: ({ ...props }) => (
                  <tr className="hover:bg-muted/40 even:bg-muted/15 transition-colors" {...props} />
                ),
              }}
            >
              {normalizeMarkdown(stripEnglishLead(analysisResult))}
            </ReactMarkdown>

            {isLoading && (
              <div className="flex items-center gap-2 pt-2 text-xs text-primary font-medium animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>推演生成中...</span>
              </div>
            )}
          </div>
          )}
        </div>
      ) : (
        !isLoading && services.length > 0 && !error && (
          <div className="py-10 px-6 text-center rounded-xl border border-dashed border-border/80 text-muted-foreground space-y-2.5 bg-card/30">
            <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary/70">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-foreground">子平学术级深度命理推演</div>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                基于《渊海子平》《滴天髓》真传条件变量体系，对原局四柱干支、通根纯度与合局克泄进行全息拆解。请确认上方服务与模型配置，点击【开始推演】；生成后默认只展示结论，可随时展开细读完整推演。
              </p>
            </div>
          </div>
        )
      )}
      </div>
      {pickerSheetEl}
    </>
  );
}
