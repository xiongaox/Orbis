/**
 * 基础 AI 提示词生成模态框
 * 提取了通用布局（左右分栏 / 移动端流式布局），以及 AI 平台跳转等逻辑
 */
import { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Sparkles, Check } from 'lucide-react';
import BaseModal from '../UI/BaseModal';

// AI 平台配置
const AI_PLATFORMS = [
    { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/', icon: <img src="/aiicon/deepseek.svg" alt="DeepSeek" className="w-5 h-5" /> },
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com/', icon: <img src="/aiicon/openai.svg" alt="ChatGPT" className="w-5 h-5 dark:invert" /> },
    { id: 'gemini', name: 'Gemini(Gem)', url: 'https://gemini.google.com/gem/0e36572cbe98', icon: <img src="/aiicon/gemini.svg" alt="Gemini" className="w-5 h-5" /> },
    { id: 'tongyi', name: '通义千问', url: 'https://tongyi.aliyun.com/', icon: <img src="/aiicon/qwen.svg" alt="Tongyi" className="w-5 h-5" /> },
    { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn/', icon: <img src="/aiicon/kimi.svg" alt="Kimi" className="w-5 h-5 dark:invert" /> },
    { id: 'doubao', name: '豆包', url: 'https://www.doubao.com/', icon: <img src="/aiicon/doubao.svg" alt="Doubao" className="w-5 h-5" /> },
];

export interface PromptOption {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export interface BaseAiPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    moduleName: string; // e.g., '八字', '奇门'
    promptText: string;
    userQuestion: string;
    setUserQuestion: (q: string) => void;
    options: PromptOption[];
    placeholder?: string;
}

export default function BaseAiPromptModal({
    isOpen,
    onClose,
    moduleName,
    promptText,
    userQuestion,
    setUserQuestion,
    options,
    placeholder = "在此输入您关心的问题... (例如：今年适合换工作吗？)"
}: BaseAiPromptModalProps) {
    const [copied, setCopied] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

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
        window.open(url, '_blank');
    };

    const titleText = `${moduleName}信息提示词`;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isMobile ? (
                <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-foreground">{titleText}</span>
                    <span className="text-xs text-muted-foreground font-normal">{promptText.length} 字</span>
                </div>
            ) : null}
            titleIcon={isMobile ? <Sparkles className="w-5 h-5" /> : undefined}
            showCloseButton={isMobile}
            maxWidth={isMobile ? 'max-w-none' : 'max-w-4xl'}
            className={`flex-row p-0 overflow-hidden ${isMobile ? '!fixed !inset-0 !w-auto !h-auto !max-w-none !max-h-none !rounded-none !m-0 !border-0' : ''}`}
            bodyClassName={`p-0 ${isMobile ? '!overflow-hidden' : 'min-h-0 !flex-none !h-[70vh] !max-h-[570px] overflow-x-hidden overflow-y-auto md:overflow-hidden'}`}
        >
            {isMobile ? (
                /* ===== 移动端布局 ===== */
                <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        <div className="bg-muted/50 rounded-lg p-3 border border-border/50 font-serif text-foreground text-[14px] leading-relaxed whitespace-pre-wrap max-h-[45vh] overflow-y-auto">
                            {promptText}
                        </div>

                        <textarea
                            value={userQuestion}
                            onChange={(e) => setUserQuestion(e.target.value)}
                            placeholder={placeholder}
                            className="w-full h-20 bg-muted/50 border border-border rounded-lg p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 resize-none transition-colors"
                        />

                        {/* 扩展选项与复制按钮（多选项自适应，或者通过 grid 控制） */}
                        <div className={`grid grid-cols-${Math.min(options.length + 1, 3)} gap-2`}>
                            {options.map((opt, i) => (
                                <label key={i} className="flex items-center gap-2 px-2 py-2.5 rounded-lg border border-border bg-muted/30 cursor-pointer text-xs">
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${opt.checked ? 'bg-amber-500 border-amber-500' : 'border-input'}`}>
                                        {opt.checked && <Check className="w-2.5 h-2.5 text-black" />}
                                    </div>
                                    <input type="checkbox" className="sr-only" checked={opt.checked} onChange={(e) => opt.onChange(e.target.checked)} />
                                    {opt.label}
                                </label>
                            ))}
                            <button
                                onClick={handleCopy}
                                className="py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95 text-sm"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? '已复制' : '复制'}
                            </button>
                        </div>

                        <div className="pt-2 border-t border-border/50">
                            <div className="text-xs text-muted-foreground mb-2">选择常用 AI</div>
                            <div className="grid grid-cols-3 gap-1.5">
                                {AI_PLATFORMS.map(platform => (
                                    <button
                                        key={platform.id}
                                        onClick={() => handleOpenAi(platform.url)}
                                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-foreground text-xs font-medium transition-all"
                                    >
                                        {platform.icon}
                                        <span className="truncate">{platform.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ===== 桌面端布局 ===== */
                <div className="flex flex-col md:flex-row h-full w-full min-h-0">
                    <div className="w-full md:w-[60%] flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-border bg-muted/30">
                        <div className="p-4 h-14 border-b border-border flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 text-foreground font-medium">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                {titleText}
                            </div>
                            <div className="text-xs text-muted-foreground">已生成 {promptText.length} 字</div>
                        </div>

                        <div className="p-4 flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="h-full bg-muted/50 rounded-lg p-4 border border-border/50 font-serif text-foreground text-sm leading-relaxed whitespace-pre-wrap selection:bg-amber-500/20 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {promptText}
                            </div>
                        </div>

                        <div className="p-4 border-t border-border bg-background/80 shrink-0">
                            <textarea
                                value={userQuestion}
                                onChange={(e) => setUserQuestion(e.target.value)}
                                placeholder={placeholder}
                                className="w-full h-20 bg-muted/50 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 focus-ring resize-none transition-colors"
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
                                    {options.map((opt, i) => (
                                        <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors group has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${opt.checked ? 'bg-amber-500 border-amber-500' : 'border-input group-hover:border-foreground/50'}`}>
                                                {opt.checked && <Check className="w-3 h-3 text-black" />}
                                            </div>
                                            <input type="checkbox" className="sr-only" checked={opt.checked} onChange={(e) => opt.onChange(e.target.checked)} />
                                            <span className="text-sm text-foreground">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            <div className="space-y-3">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">操作</div>
                                <button
                                    onClick={handleCopy}
                                    className="w-full py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold shadow-lg hover:shadow-xl hover:shadow-amber-500/10 transition-all flex items-center justify-center gap-2 active:scale-95 focus-ring"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? '已复制提示词' : '一键复制提示词'}
                                </button>
                                <p className="text-xs text-muted-foreground text-center">复制后发送给 AI 即可开始对话</p>
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
            )}
        </BaseModal>
    );
}
