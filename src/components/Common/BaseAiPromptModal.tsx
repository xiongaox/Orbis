/**
 * BaseAiPromptModal - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：提供跨模块的通用 UI 组件
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default BaseAiPromptModal`, `PromptOption`, `BaseAiPromptModalProps`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `BaseModal` 等 4 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Sparkles, Check, ChevronDown, FileText } from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { openExternalUrl } from '../../utils/browserUtil';
import AiChatDrawer from './AiChatDrawer';

// AI 平台配置
const AI_PLATFORMS = [
    { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/', icon: <img src="/aiicon/deepseek.svg" alt="DeepSeek" className="w-5 h-5" /> },
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com/', icon: <img src="/aiicon/openai.svg" alt="ChatGPT" className="w-5 h-5 dark:invert" /> },
    { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', icon: <img src="/aiicon/gemini.svg" alt="Gemini" className="w-5 h-5" /> },
    { id: 'tongyi', name: '通义千问', url: 'https://tongyi.aliyun.com/', icon: <img src="/aiicon/qwen.svg" alt="Tongyi" className="w-5 h-5" /> },
    { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn/', icon: <img src="/aiicon/kimi.svg" alt="Kimi" className="w-5 h-5 dark:invert" /> },
    { id: 'doubao', name: '豆包', url: 'https://www.doubao.com/', icon: <img src="/aiicon/doubao.svg" alt="Doubao" className="w-5 h-5" /> },
];

export interface PromptOption {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

import type { DivinationType } from '../../services/aiChatHistoryService';

export interface BaseAiPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    moduleName: string; // e.g., '八字', '奇门'
    promptText: string;
    userQuestion: string;
    setUserQuestion: (q: string) => void;
    options: PromptOption[];
    placeholder?: string;
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

export default function BaseAiPromptModal({
    isOpen,
    onClose,
    moduleName,
    promptText,
    userQuestion,
    setUserQuestion,
    options,
    placeholder = "在此输入您关心的问题... (例如：今年适合换工作吗？)",
    sessionId,
    caseId,
    caseName,
    divinationType,
    meta,
}: BaseAiPromptModalProps) {
    const [copied, setCopied] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
    // 移动端提示词默认折叠：上千字的提示词全量铺开会挤掉操作区，折叠后动线是"扫一眼 → 展开 → 复制"。
    const [promptExpanded, setPromptExpanded] = useState(false);
    const { isPadLandscape } = useLayoutMode();

    const handleStartCustomAi = () => {
        setIsChatDrawerOpen(true);
        onClose();
    };

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(promptText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    const handleOpenAi = (url: string) => {
        void openExternalUrl(url);
    };

    const titleText = `${moduleName}信息提示词`;

    // 抽屉节点：移动端/桌面端两种壳下都渲染
    const chatDrawer = (
        <AiChatDrawer
            isOpen={isChatDrawerOpen}
            onClose={() => setIsChatDrawerOpen(false)}
            moduleName={moduleName}
            initialPrompt={promptText}
            sessionId={sessionId}
            caseId={caseId}
            caseName={caseName}
            divinationType={divinationType}
            meta={meta}
        />
    );

    // 移动端正文（定稿：方案 C 附件卡 + 方案 A 单列开关行）
    // 动线：附件式提示词卡（默认折叠，复制跟随卡片）→ 问题输入 → 分析模块 → 主 CTA + 常用 AI 宫格。
    // 壳由 SubPage 提供（统一页头 + 安全区 + 侧滑返回），这里只写内容。
    const mobileContent = (
        <div className="flex flex-col min-h-full">
                    <div className="px-4 pt-4 flex flex-col gap-3.5">
                        {/* 附件式提示词卡 */}
                        <div>
                            <div
                                className="flex items-center gap-2.5 p-3 rounded-xl border border-border/60 bg-muted/30 cursor-pointer active:border-primary/40 transition-colors"
                                onClick={() => setPromptExpanded(v => !v)}
                            >
                                <span className="w-10 h-10 rounded-[10px] bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                    <FileText className="w-[18px] h-[18px]" />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-foreground">命盘提示词</div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5">{promptText.length} 字 · {promptExpanded ? '点按收起' : '点按展开预览'}</div>
                                </div>
                                <button
                                    type="button"
                                    aria-label="复制提示词"
                                    onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors focus-ring cursor-pointer ${copied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/70'}`}
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${promptExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            <div className={`overflow-hidden transition-all duration-200 ${promptExpanded ? 'max-h-[45vh] mt-2' : 'max-h-0'}`}>
                                <div className="rounded-[10px] border border-border/60 bg-muted/30 px-3 py-2.5 font-serif text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap overflow-y-auto max-h-[45vh]">{promptText}</div>
                            </div>
                        </div>

                        {/* 问题输入 */}
                        <div className="rounded-xl border border-border/60 bg-muted/30 focus-within:border-primary/50 transition-colors">
                            <textarea
                                value={userQuestion}
                                onChange={(e) => setUserQuestion(e.target.value)}
                                placeholder={placeholder}
                                className="w-full min-h-[84px] resize-none bg-transparent border-none outline-none p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-ring"
                            />
                        </div>

                        {/* 分析模块：单列开关行 */}
                        {options.length > 0 && (
                            <div>
                                <div className="text-[11px] font-semibold tracking-wider text-muted-foreground mb-2">分析模块</div>
                                <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
                                    {options.map((opt, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            role="switch"
                                            aria-checked={opt.checked}
                                            onClick={() => opt.onChange(!opt.checked)}
                                            className={`flex w-full items-center gap-3 px-3.5 py-3 text-left text-sm cursor-pointer transition-colors hover:bg-muted/60 focus-ring ${i > 0 ? 'border-t border-border/40' : ''}`}
                                        >
                                            <span className="flex-1 text-foreground/90">{opt.label}</span>
                                            {/* 开关样式与 PrivateDataBackupModal 的设置开关保持一致：金色轨道 + 深色旋钮带 ✓ */}
                                            <span className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${opt.checked ? 'border-primary bg-primary' : 'border-border bg-muted'}`}>
                                                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm transition-transform ${opt.checked ? 'translate-x-6 text-primary' : 'translate-x-1 text-muted-foreground'}`}>
                                                    {opt.checked && <Check className="h-3.5 w-3.5" />}
                                                </span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 出口 */}
                    <div className="mt-auto px-4 pt-4 pb-5">
                        <button
                            type="button"
                            onClick={handleStartCustomAi}
                            className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-[15px] shadow-xs transition-colors flex items-center justify-center gap-1.5 active:scale-98 focus-ring cursor-pointer"
                        >
                            <Sparkles className="w-4 h-4 shrink-0" />
                            <span>开始 AI 解析</span>
                        </button>
                        <p className="text-[11px] text-muted-foreground text-center mt-2">在应用内多轮对话研判，或复制提示词去外部 AI</p>
                        <div className="text-[11px] font-semibold tracking-wider text-muted-foreground mt-4 mb-2">常用 AI</div>
                        <div className="grid grid-cols-3 gap-2">
                            {AI_PLATFORMS.map(platform => (
                                <button
                                    key={platform.id}
                                    onClick={() => handleOpenAi(platform.url)}
                                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors focus-ring cursor-pointer"
                                >
                                    {platform.icon}
                                    <span className="text-[11px] font-medium truncate max-w-full px-1">{platform.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
        </div>
    );

    // 桌面端正文：双栏布局，挂在 BaseModal 下
    const desktopContent = (
        <div className="flex flex-col md:flex-row h-full w-full min-h-0">
                    <div className="w-full md:w-[60%] flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-border bg-muted/30">
                        <div className="p-4 h-14 border-b border-border flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 text-foreground font-medium">
                                <Sparkles className="w-4 h-4 text-primary" />
                                {titleText}
                            </div>
                            <div className="text-xs text-muted-foreground">已生成 {promptText.length} 字</div>
                        </div>

                        <div className="p-4 flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="h-full bg-muted/50 rounded-lg p-4 border border-border/50 font-serif text-foreground text-sm leading-relaxed whitespace-pre-wrap selection:bg-primary/20 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {promptText}
                            </div>
                        </div>

                        <div className="p-4 border-t border-border bg-background/80 shrink-0">
                            <textarea
                                value={userQuestion}
                                onChange={(e) => setUserQuestion(e.target.value)}
                                placeholder={placeholder}
                                className="w-full h-20 bg-muted/50 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus-ring resize-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="w-full md:w-[40%] flex flex-col min-h-0 bg-card">
                        <div className="p-4 h-14 border-b border-border flex items-center justify-between shrink-0">
                            <h3 className="text-sm font-medium text-foreground">AI 助手</h3>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 p-6 flex flex-col gap-6 overflow-y-auto">
                            {options.length > 0 && (
                                <div className="space-y-3">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">扩展数据</div>
                                    <div className={isPadLandscape ? "grid grid-cols-2 gap-3" : "space-y-3"}>
                                        {options.map((opt, i) => (
                                            <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors group has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${opt.checked ? 'bg-primary border-primary' : 'border-input group-hover:border-foreground/50'}`}>
                                                    {opt.checked && <Check className="w-3 h-3 text-primary-foreground" />}
                                                </div>
                                                <input type="checkbox" className="sr-only" checked={opt.checked} onChange={(e) => opt.onChange(e.target.checked)} />
                                                <span className="text-sm text-foreground">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">操作</div>
                                <div className="flex items-center gap-2 w-full">
                                    <button
                                        type="button"
                                        onClick={handleStartCustomAi}
                                        className="flex-[1.4] h-10 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 active:scale-98 focus-ring cursor-pointer"
                                    >
                                        <Sparkles className="w-4 h-4 shrink-0" />
                                        <span>AI 解析</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="flex-1 h-10 px-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-foreground font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 focus-ring cursor-pointer"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Copy className="w-4 h-4 text-muted-foreground shrink-0" />}
                                        <span className="truncate">{copied ? '已复制' : '复制提示词'}</span>
                                    </button>
                                </div>
                                <p className="text-[11px] text-muted-foreground text-center">直接发起多轮对话研判，或复制后发送至外部 AI</p>
                            </div>
                            <div className="space-y-3 pt-2 border-t border-border/50">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">选择常用 AI</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {AI_PLATFORMS.map(platform => (
                                        <button
                                            key={platform.id}
                                            onClick={() => handleOpenAi(platform.url)}
                                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-foreground text-sm font-medium transition-all group focus-ring"
                                        >
                                            {platform.icon}
                                            <span className="truncate">{platform.name}</span>
                                            <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    );

    // 移动端：统一二级页面壳（返回手势 + 统一页头）；桌面端：保留双栏弹窗
    if (isMobile) {
        return (
            <>
                <SubPage
                    isOpen={isOpen}
                    onClose={onClose}
                    title={titleText}
                    actions={<span className="text-[11px] text-muted-foreground">{promptText.length} 字</span>}
                >
                    {mobileContent}
                </SubPage>
                {chatDrawer}
            </>
        );
    }

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title={null}
                showCloseButton={false}
                maxWidth="max-w-4xl"
                className="flex-row p-0 overflow-hidden"
                bodyClassName="p-0 min-h-0 !flex-none !h-[70vh] !max-h-[570px] overflow-x-hidden overflow-y-auto md:overflow-hidden"
            >
                {desktopContent}
            </BaseModal>
            {chatDrawer}
        </>
    );
}
