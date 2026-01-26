/**
 * 八字 AI 提示词生成模态框
 * 左右分栏布局：左侧预览，右侧操作
 */
import { useState, useMemo } from 'react';
import { X, Copy, ExternalLink, Sparkles, Check } from 'lucide-react';
import type { BaziApiResponse } from '../../../types/bazi';

interface AiPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: BaziApiResponse | null;
    selectedLiuNianYear?: number | null;
    selectedDaYunIndex?: number | null;
}

// AI 平台配置
const AI_PLATFORMS = [
    { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/', icon: <img src="/aiicon/deepseek.svg" alt="DeepSeek" className="w-5 h-5" /> },
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com/', icon: <img src="/aiicon/openai.svg" alt="ChatGPT" className="w-5 h-5 dark:invert" /> },
    { id: 'gemini', name: 'Gemini(Gem)', url: 'https://gemini.google.com/gem/0e36572cbe98', icon: <img src="/aiicon/gemini.svg" alt="Gemini" className="w-5 h-5" /> },
    { id: 'tongyi', name: '通义千问', url: 'https://tongyi.aliyun.com/', icon: <img src="/aiicon/qwen.svg" alt="Tongyi" className="w-5 h-5" /> },
    { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn/', icon: <img src="/aiicon/kimi.svg" alt="Kimi" className="w-5 h-5 dark:invert" /> },
    { id: 'doubao', name: '豆包', url: 'https://www.doubao.com/', icon: <img src="/aiicon/doubao.svg" alt="Doubao" className="w-5 h-5" /> },
];

export default function AiPromptModal({ isOpen, onClose, data, selectedLiuNianYear, selectedDaYunIndex }: AiPromptModalProps) {
    // 扩展选项状态
    const [includeDaYun, setIncludeDaYun] = useState(false);
    const [includeLiuNian, setIncludeLiuNian] = useState(false);

    const [userQuestion, setUserQuestion] = useState('');
    const [copied, setCopied] = useState(false);

    // Prompt 生成逻辑
    const promptText = useMemo(() => {
        if (!data) return '';

        const pillars = data.pillars || [];
        const gender = data.gender;
        const solarDate = data.solarDate;
        const lunarDate = data.lunarDate;

        // 基础信息
        let text = `我让玄枢录排出了我的八字，详细信息如下：\n`;
        text += `性别：${gender}\n`;
        text += `公历生日：${solarDate}\n`;
        text += `农历生日：${lunarDate}\n`;
        text += `八字四柱：${pillars.map(p => p.ganZhi).join(' ')} （${pillars.map(p => p.label).join(' ')}）\n`;

        // 起运信息
        if (data.yunInfo) {
            text += `大运起于：出生后${data.yunInfo.startYear}年${data.yunInfo.startMonth}月${data.yunInfo.startDay}天\n`;
        }

        // 大运信息
        if (includeDaYun && data.daYun && data.daYun.length > 0) {
            // 基础大运列表，限制在 100 岁以内
            const validDaYun = data.daYun.filter(d => d.startAge <= 100);
            text += `大运排布：${validDaYun.map(d => `${d.ganZhi}(${d.startAge}岁)`).join(' → ')}\n`;

            // 当前选中大运强调
            if (selectedDaYunIndex !== undefined && selectedDaYunIndex !== null) {
                const targetDaYun = data.daYun.find(dy => dy.index === selectedDaYunIndex);
                if (targetDaYun) {
                    text += `当前分析大运：${targetDaYun.ganZhi} (${targetDaYun.startAge}岁 - ${targetDaYun.endAge}岁)\n`;
                }
            }
        }

        // 流年信息
        if (includeLiuNian && data.liuNian) {
            if (selectedLiuNianYear) {
                // 如果选中了具体流年，只显示这一年
                const targetLiuNian = data.liuNian.find(ln => ln.year === selectedLiuNianYear);
                if (targetLiuNian) {
                    text += `当前分析流年：${targetLiuNian.year}年 (${targetLiuNian.ganZhi}) ${targetLiuNian.age}岁\n`;
                }
            } else if (data.liuNian.length > 0) {
                // 如果没选流年但勾选了包含，显示前5步大运对应的流年或简略列表
                // 为避免过多，只显示最近几年的流年作为参考
                const currentYear = new Date().getFullYear();
                const nearbyLiuNian = data.liuNian.filter(ln => ln.year >= currentYear - 5 && ln.year <= currentYear + 15);
                const liuNianStr = nearbyLiuNian.map(ln => `${ln.year}(${ln.ganZhi})`).join(' ');
                text += `近期流年参考：${liuNianStr} ...\n`;
            }
        }

        // 命令词
        text += `\n请根据以上信息，严格依据传统子平八字理论进行分析。务必做到有理有据，逻辑清晰。\n`;

        // 用户问题
        if (userQuestion.trim()) {
            text += `\n我的问题是：${userQuestion}\n`;
        } else {
            text += `\n请先分析命局强弱与喜用神，然后简要点评婚姻、事业与财运。`;

            const focusParts = [];
            if (includeDaYun && selectedDaYunIndex !== undefined && selectedDaYunIndex !== null) {
                const targetDaYun = data.daYun?.find(dy => dy.index === selectedDaYunIndex);
                if (targetDaYun) focusParts.push(`${targetDaYun.ganZhi}大运`);
            }
            if (includeLiuNian && selectedLiuNianYear) {
                focusParts.push(`${selectedLiuNianYear}流年`);
            }

            if (focusParts.length > 0) {
                text += ` 特别是针对 ${focusParts.join('、')} 的运势分析。`;
            }
        }

        return text;
    }, [data, includeDaYun, includeLiuNian, userQuestion, selectedLiuNianYear, selectedDaYunIndex]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div
                className="w-full max-w-4xl bg-background border border-border rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 左侧：Prompt 预览 (60%) */}
                <div className="w-full md:w-[60%] flex flex-col border-b md:border-b-0 md:border-r border-border bg-muted/30">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            八字信息提示词
                        </div>
                        <div className="text-xs text-muted-foreground">已生成 {promptText.length} 字</div>
                    </div>

                    <div className="p-4 flex flex-col">
                        <div className="h-[388px] bg-muted/50 rounded-lg p-4 border border-border/50 font-serif text-foreground text-sm leading-relaxed whitespace-pre-wrap selection:bg-amber-500/20 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {promptText}
                        </div>
                    </div>

                    {/* 底部输入框 */}
                    <div className="p-4 border-t border-border bg-background/80">
                        <textarea
                            value={userQuestion}
                            onChange={(e) => setUserQuestion(e.target.value)}
                            placeholder="在此输入您关心的问题... (例如：今年适合换工作吗？)"
                            className="w-full h-20 bg-muted/50 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 resize-none transition-colors"
                        />
                    </div>
                </div>

                {/* 右侧：操作与扩展 (40%) */}
                <div className="w-full md:w-[40%] flex flex-col bg-card">
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground">AI 助手</h3>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">

                        {/* 扩展选项 */}
                        <div className="space-y-3">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">扩展数据</div>
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${includeDaYun ? 'bg-amber-500 border-amber-500' : 'border-input group-hover:border-foreground/50'}`}>
                                    {includeDaYun && <Check className="w-3 h-3 text-black" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={includeDaYun}
                                    onChange={(e) => setIncludeDaYun(e.target.checked)}
                                />
                                <span className="text-sm text-foreground">包含大运排盘信息</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${includeLiuNian ? 'bg-amber-500 border-amber-500' : 'border-input group-hover:border-foreground/50'}`}>
                                    {includeLiuNian && <Check className="w-3 h-3 text-black" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={includeLiuNian}
                                    onChange={(e) => setIncludeLiuNian(e.target.checked)}
                                />
                                <span className="text-sm text-foreground">包含流年排盘信息</span>
                            </label>


                        </div>

                        {/* 复制操作 */}
                        <div className="space-y-3">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">操作</div>
                            <button
                                onClick={handleCopy}
                                className="w-full py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold shadow-lg hover:shadow-xl hover:shadow-amber-500/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? '已复制提示词' : '一键复制提示词'}
                            </button>
                            <p className="text-xs text-muted-foreground text-center">
                                复制后发送给 AI 即可开始对话
                            </p>
                        </div>

                        {/* AI 平台跳转 */}
                        <div className="space-y-3 pt-2 border-t border-border/50">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">选择常用 AI</div>
                            <div className="grid grid-cols-2 gap-2">
                                {AI_PLATFORMS.map(platform => (
                                    <button
                                        key={platform.id}
                                        onClick={() => handleOpenAi(platform.url)}
                                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-foreground text-sm font-medium transition-all group"
                                    >
                                        {platform.icon}
                                        {platform.name}
                                        <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Backdrop Close Handler */}
            <div className="fixed inset-0 z-[-1]" onClick={onClose}></div>
        </div>
    );
}
