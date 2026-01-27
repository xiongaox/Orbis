/**
 * 奇门遁甲 AI 提示词生成模态框
 * 左右分栏布局：左侧预览，右侧操作
 * 复用并适配八字模块的 AI Prompt 交互
 */
import { useState, useMemo } from 'react';
import { X, Copy, ExternalLink, Sparkles, Check } from 'lucide-react';
import type { QimenHeader } from '../../../lib/csp-qimen/qimenService';
import type { QimenPalace } from './QimenChart';
import type { GlobalPattern } from '../../../lib/csp-qimen/patternDetector';

interface QimenAiPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    header: QimenHeader;
    palaces: QimenPalace[];
    globalPatterns: GlobalPattern[];
    selectedPalace?: number | null;
    methodLabel?: string;
}

// 辅助计算：根据干支计算空亡
function getKongWang(stem: string, branch: string): string {
    const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    if (!stem || !branch) return '';

    const sIdx = STEMS.indexOf(stem);
    const bIdx = BRANCHES.indexOf(branch);

    if (sIdx === -1 || bIdx === -1) return '';

    // 旬首地支索引 = (地支 - 天干 + 12) % 12
    const xunShouBranchIdx = (bIdx - sIdx + 12) % 12;

    // 空亡为旬首地支的前两位
    // 例：甲子(0) -> 空戌亥(10,11)
    const kw1 = (xunShouBranchIdx - 2 + 12) % 12;
    const kw2 = (xunShouBranchIdx - 1 + 12) % 12;

    return BRANCHES[kw1] + BRANCHES[kw2];
}

// 辅助计算：根据地支计算马星
function getMaXing(branch: string): string {
    const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const bIdx = BRANCHES.indexOf(branch);
    if (bIdx === -1) return '';

    // 申子辰 -> 寅
    if ([8, 0, 4].includes(bIdx)) return '寅';
    // 寅午戌 -> 申
    if ([2, 6, 10].includes(bIdx)) return '申';
    // 巳酉丑 -> 亥
    if ([5, 9, 1].includes(bIdx)) return '亥';
    // 亥卯未 -> 巳
    if ([11, 3, 7].includes(bIdx)) return '巳';

    return '';
}

// 洛书九宫顺序: 巽4 -> 离9 -> 坤2 -> 震3 -> 中5 -> 兑7 -> 艮8 -> 坎1 -> 乾6
const LUOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

// AI 平台配置
const AI_PLATFORMS = [
    { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/', icon: <img src="/aiicon/deepseek.svg" alt="DeepSeek" className="w-5 h-5" /> },
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com/', icon: <img src="/aiicon/openai.svg" alt="ChatGPT" className="w-5 h-5 dark:invert" /> },
    { id: 'gemini', name: 'Gemini(Gem)', url: 'https://gemini.google.com/gem/0e36572cbe98', icon: <img src="/aiicon/gemini.svg" alt="Gemini" className="w-5 h-5" /> },
    { id: 'tongyi', name: '通义千问', url: 'https://tongyi.aliyun.com/', icon: <img src="/aiicon/qwen.svg" alt="Tongyi" className="w-5 h-5" /> },
    { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn/', icon: <img src="/aiicon/kimi.svg" alt="Kimi" className="w-5 h-5 dark:invert" /> },
    { id: 'doubao', name: '豆包', url: 'https://www.doubao.com/', icon: <img src="/aiicon/doubao.svg" alt="Doubao" className="w-5 h-5" /> },
];

export default function QimenAiPromptModal({
    isOpen,
    onClose,
    header,
    palaces,
    globalPatterns,
    selectedPalace,
    methodLabel = '时家奇门'
}: QimenAiPromptModalProps) {
    // 扩展选项状态 - 默认勾选全盘信息
    const [includeAllPalaces, setIncludeAllPalaces] = useState(true);
    const [includeGlobalPatterns, setIncludeGlobalPatterns] = useState(true);

    const [userQuestion, setUserQuestion] = useState('');
    const [copied, setCopied] = useState(false);

    // Prompt 生成逻辑
    const promptText = useMemo(() => {
        if (!header) return '';

        // 基础信息
        let text = `我让玄枢录用“${methodLabel}”起了一个奇门局，局排布信息如下：\n`;
        text += `起局时间：${header.solarDate}(${header.lunarDate})${header.time}。\n`;

        const sz = header.siZhu;
        text += `干支四柱：${sz.year} ${sz.month} ${sz.day} ${sz.hour}。\n`;

        text += `${header.ju}。\n`;

        // 确保显示旬首
        text += `${header.jieQi}，旬首:${header.xunShou}。\n`;

        // 值符值使与落宫
        const zhiFuPalace = palaces.find(p => p.xing === header.zhiFu);
        const zhiShiPalace = palaces.find(p => {
            if (!p.men || !header.zhiShi) return false;
            return p.men === header.zhiShi || p.men.includes(header.zhiShi) || header.zhiShi.includes(p.men);
        });

        const zhiFuLoc = zhiFuPalace ? zhiFuPalace.gongName : '';
        const zhiShiLoc = zhiShiPalace ? zhiShiPalace.gongName : '';

        text += `值符:${header.zhiFu}落${zhiFuLoc} 值使:${header.zhiShi}落${zhiShiLoc}。\n`;

        // 空亡 (四柱)
        const kwYear = getKongWang(sz.year[0], sz.year[1]);
        const kwMonth = getKongWang(sz.month[0], sz.month[1]);
        const kwDay = getKongWang(sz.day[0], sz.day[1]);
        const kwHour = getKongWang(sz.hour[0], sz.hour[1]);
        text += `空亡：年${kwYear} 月${kwMonth} 日${kwDay} 时${kwHour}。\n`;

        // 驿马 (四柱)
        const maYear = getMaXing(sz.year[1]);
        const maMonth = getMaXing(sz.month[1]);
        const maDay = getMaXing(sz.day[1]);
        const maHour = getMaXing(sz.hour[1]);
        text += `驿马星：年${maYear} 月${maMonth} 日${maDay} 时${maHour}。\n\n`;

        // 宫位信息 (洛书顺序)
        if (includeAllPalaces) {
            LUOSHU_ORDER.forEach(pos => {
                const p = palaces.find(x => x.position === pos);
                if (!p) return;

                text += `${p.gongName}${pos}宫宫信息开始：`;

                const parts = [];
                if (p.xing) parts.push(`九星：${p.xing}`);
                if (p.shen) parts.push(`八神：${p.shen}`);
                if (p.men) parts.push(`八门：${p.men}`);

                if (p.tianPan) parts.push(`天盘天干：${p.tianPan}`);
                if (p.diPan) parts.push(`地盘天干：${p.diPan}`);

                if (p.jiGongTianPan) parts.push(`天盘寄天干：${p.jiGongTianPan}`);
                if (p.jiGongDiPan) parts.push(`地盘寄天干：${p.jiGongDiPan}`);

                // 马空信息 (检查 p.maKong 字段)
                if (p.maKong?.includes('空')) parts.push(`本宫占空亡`);
                if (p.maKong?.includes('马')) parts.push(`本宫有马星`);

                text += parts.join('；');
                text += `；${p.gongName}${pos}宫宫信息结束。\n\n`;
            });
        }

        // 全局格局 (如果启用)
        if (includeGlobalPatterns && globalPatterns && globalPatterns.length > 0) {
            // 虽然模板没强制要求，但作为补充信息很有用
            text += `全局格局信息：${globalPatterns.map(p => p.label).join('、')}。\n\n`;
        }

        // 命令词
        text += `请记住以上局式信息，后面我问你问题时你要根据这个奇门局式分析。务必做到有根据、有理论支持，分析的详细还要体会我问问题的心理潜在因素，照顾我的心理感受。请问：\n`;

        // 用户问题
        if (userQuestion.trim()) {
            text += `\n${userQuestion}\n`;
        }

        return text;
    }, [header, palaces, globalPatterns, includeAllPalaces, includeGlobalPatterns, userQuestion, selectedPalace, methodLabel]);

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
                            奇门信息提示词
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
                            placeholder="在此输入您关心的问题... (例如：此次出行是否顺利？)"
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
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${includeGlobalPatterns ? 'bg-amber-500 border-amber-500' : 'border-input group-hover:border-foreground/50'}`}>
                                    {includeGlobalPatterns && <Check className="w-3 h-3 text-black" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={includeGlobalPatterns}
                                    onChange={(e) => setIncludeGlobalPatterns(e.target.checked)}
                                />
                                <span className="text-sm text-foreground">包含全局格局信息</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${includeAllPalaces ? 'bg-amber-500 border-amber-500' : 'border-input group-hover:border-foreground/50'}`}>
                                    {includeAllPalaces && <Check className="w-3 h-3 text-black" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={includeAllPalaces}
                                    onChange={(e) => setIncludeAllPalaces(e.target.checked)}
                                />
                                <span className="text-sm text-foreground">包含全盘宫位详情</span>
                            </label>

                            <div className="text-xs text-muted-foreground px-1">
                                * 默认包含起局四柱、节气、局数、值符值使、空亡驿马等核心信息。
                            </div>
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
