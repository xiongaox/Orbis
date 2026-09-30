import { useState, useEffect } from 'react';
import { X, Copy, Sparkles, Check, ChevronDown, FileText } from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { openExternalUrl } from '../../utils/browserUtil';
import AiChatDrawer from './AiChatDrawer';
import { OPEN_AI_CHAT_EVENT } from '../../services/aiTaskStatusService';

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
    const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
    // 提示词折叠：移动端默认折叠（上千字全量铺开会挤掉操作区，动线是"扫一眼 → 展开 → 复制"），
    // 桌面端左栏整栏都给提示词，默认展开即所见即复制。首帧由 useMediaQuery 同步判定。
    const isMobile = !useMediaQuery('(min-width: 640px)');
    const [promptExpanded, setPromptExpanded] = useState(!isMobile);

    const handleStartCustomAi = () => {
        setIsChatDrawerOpen(true);
        onClose();
    };

    // 案例列表的研判状态按钮 → 跳过提示词弹窗直接打开本模块的研判抽屉
    useEffect(() => {
        if (!divinationType) return;
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ divinationType?: string }>).detail;
            if (detail?.divinationType && detail.divinationType !== divinationType) return;
            setIsChatDrawerOpen(true);
        };
        window.addEventListener(OPEN_AI_CHAT_EVENT, handler);
        return () => window.removeEventListener(OPEN_AI_CHAT_EVENT, handler);
    }, [divinationType]);

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
                                <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
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
                                <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 font-serif text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap overflow-y-auto max-h-[45vh]">{promptText}</div>
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
                                            {/* 开关样式与 PrivateDataBackupModal 的设置开关保持一致：金色轨道 + 深色旋钮 */}
                                            <span className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${opt.checked ? 'border-primary bg-primary' : 'border-border bg-muted'}`}>
                                                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm transition-transform ${opt.checked ? 'translate-x-6' : 'translate-x-1'}`} />
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

    // 桌面端正文：双栏弹窗（保留双栏信息密度与悬停反馈的桌面气质），
    // 设计语言移植自移动端改版：附件式提示词卡（桌面默认展开）→ 分析模块开关行 → 主 CTA → 常用 AI 宫格
    const desktopContent = (
        <div className="flex flex-col md:flex-row h-full w-full min-h-0">
                    {/* 左栏：附件式提示词卡。桌面端空间充裕，始终展开（无收起按钮），复制跟随卡片 */}
                    <div className="w-full md:w-[60%] flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-border bg-muted/30">
                        <div className="p-4 shrink-0 flex items-center gap-2.5 border-b border-border/60">
                            <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                <FileText className="w-[18px] h-[18px]" />
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-foreground">{titleText}</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">{promptText.length} 字</div>
                            </div>
                            <button
                                type="button"
                                aria-label="复制提示词"
                                onClick={handleCopy}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors focus-ring cursor-pointer ${copied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* 全文 */}
                        <div className="flex-1 min-h-0 p-4">
                            <div className="h-full bg-muted/50 rounded-lg p-4 border border-border/50 font-serif text-foreground text-sm leading-relaxed whitespace-pre-wrap selection:bg-primary/20 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {promptText}
                            </div>
                        </div>

                        {/* 问题输入：追加到提示词末尾 */}
                        <div className="p-4 border-t border-border bg-background/80 shrink-0">
                            <textarea
                                value={userQuestion}
                                onChange={(e) => setUserQuestion(e.target.value)}
                                placeholder={placeholder}
                                className="w-full h-20 bg-muted/50 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus-ring resize-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* 右栏：分析模块开关行 → 主 CTA → 常用 AI 宫格（均为移动端同款样式） */}
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

                        <div className="flex-1 min-h-0 p-5 flex flex-col gap-6 overflow-y-auto">
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
                                                {/* 金色轨道开关：与移动端及 PrivateDataBackupModal 设置开关同一规格 */}
                                                <span className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${opt.checked ? 'border-primary bg-primary' : 'border-border bg-muted'}`}>
                                                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm transition-transform ${opt.checked ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 出口：主 CTA + 说明（移动端同款动线） */}
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={handleStartCustomAi}
                                    className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 active:scale-98 focus-ring cursor-pointer"
                                >
                                    <Sparkles className="w-4 h-4 shrink-0" />
                                    <span>开始 AI 解析</span>
                                </button>
                                <p className="text-[11px] text-muted-foreground text-center">在应用内多轮对话研判，或复制提示词去外部 AI</p>
                            </div>

                            {/* 常用 AI：3 列图标宫格 */}
                            <div className="pt-2 border-t border-border/50">
                                <div className="text-[11px] font-semibold tracking-wider text-muted-foreground mb-2">常用 AI</div>
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
