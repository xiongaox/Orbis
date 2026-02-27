/**
 * Pad 横屏左侧信息栏面板
 * 将 QimenHeader 的信息以竖向紧凑布局重排，适配窄面板
 */
import { useState } from 'react';
import type { PaiPanMethod } from '../../../../lib/csp-qimen/qimenService';
import type { GlobalPattern } from '../../../../lib/csp-qimen/patternDetector';

const METHODS: { value: PaiPanMethod; label: string }[] = [
    { value: 'zhirun', label: '置润法' },
    { value: 'yinpan', label: '阴盘法' },
    { value: 'chaibu', label: '拆补法' },
    { value: 'maoshan', label: '茅山法' },
];

interface PadInfoPanelProps {
    header: {
        solarDate: string;
        lunarDate: string;
        time: string;
        ju: string;
        xunShou: string;
        zhiFu: string;
        zhiShi: string;
        maXing: string;
        kongWang: string;
        siZhu: { year: string; month: string; day: string; hour: string };
    };
    method: PaiPanMethod;
    onMethodChange?: (method: PaiPanMethod) => void;
    onResetToNow?: () => void;
    onOpenDatePicker?: () => void;
    onPrevHour?: () => void;
    onNextHour?: () => void;
    onJuClick?: () => void;
    globalPatterns: GlobalPattern[];
    onPatternClick?: (pattern: GlobalPattern) => void;
    onOpenAiModal?: () => void;
}

export default function QimenPadInfoPanel({
    header,
    method,
    onMethodChange,
    onResetToNow,
    onOpenDatePicker,
    onPrevHour,
    onNextHour,
    onJuClick,
    globalPatterns,
    onPatternClick,
    onOpenAiModal,
}: PadInfoPanelProps) {
    const [isMethodOpen, setIsMethodOpen] = useState(false);

    return (
        <div className="flex flex-col h-full p-4 gap-5">
            {/* 日期时间 */}
            <div className="space-y-1.5">
                <div className="font-serif font-bold text-foreground text-xl leading-tight">
                    {header.solarDate}
                </div>
                <div className="font-serif text-muted-foreground text-sm">
                    {header.lunarDate} {header.time}
                </div>
            </div>

            {/* 操作按钮行 */}
            <div className="flex items-center gap-2">
                <button onClick={onResetToNow} className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-serif">
                    现在
                </button>
                <button onClick={onOpenDatePicker} className="px-3 py-1.5 text-sm bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 transition-colors font-serif border border-border">
                    选择
                </button>
                <button onClick={onOpenAiModal} className="px-3 py-1.5 text-sm bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all font-serif flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                    AI
                </button>
                {/* 上一局 / 下一局 */}
                <button type="button" onClick={onPrevHour} className="p-1.5 bg-secondary/80 text-muted-foreground rounded-full hover:bg-secondary transition-colors border border-border" title="上一局">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button type="button" onClick={onNextHour} className="p-1.5 bg-secondary/80 text-muted-foreground rounded-full hover:bg-secondary transition-colors border border-border" title="下一局">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
            </div>

            <div className="h-px bg-border/50" />

            {/* 四柱 - 横向排列 */}
            {header.siZhu?.year && (
                <div className="flex justify-around px-2">
                    {(['year', 'month', 'day', 'hour'] as const).map((key) => {
                        const labels = { year: '年', month: '月', day: '日', hour: '时' };
                        const stem = header.siZhu[key][0];
                        const branch = header.siZhu[key][1];
                        const isDayOrHour = key === 'day' || key === 'hour';
                        const isJia = stem === '甲';
                        return (
                            <div key={key} className="flex flex-col items-center gap-1">
                                <span className={`text-xl font-serif leading-none ${isDayOrHour ? 'text-primary font-bold' : 'text-foreground'}`}>{stem}</span>
                                <span className={`text-xl font-serif leading-none ${isDayOrHour && isJia ? 'text-primary font-bold' : 'text-foreground'}`}>{branch}</span>
                                <span className="text-xs text-muted-foreground/60 font-serif mt-1">{labels[key]}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="h-px bg-border/50" />

            {/* 局信息网格 - 2列 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {[
                    { label: header.ju.substring(0, 2), value: header.ju.substring(2), clickable: true },
                    { label: '旬首', value: header.xunShou, clickable: false },
                    { label: '值符', value: header.zhiFu, clickable: false },
                    { label: '值使', value: header.zhiShi, clickable: false },
                    { label: '马星', value: header.maXing, clickable: false },
                    { label: '空亡', value: header.kongWang, clickable: false },
                ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-light whitespace-nowrap">{item.label}:</span>
                        {item.clickable ? (
                            <button
                                onClick={onJuClick}
                                className="text-primary font-serif font-bold hover:underline underline-offset-2 transition-colors cursor-pointer"
                                title="点击自定义局数"
                            >
                                {item.value}
                            </button>
                        ) : (
                            <span className="text-foreground font-serif truncate">{item.value}</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="h-px bg-border/50" />

            {/* 排盘方法选择 + 格局标签 */}
            <div className="space-y-3">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsMethodOpen(!isMethodOpen)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-muted-foreground text-sm font-serif hover:bg-muted/10 transition-colors w-full justify-between"
                    >
                        <span>{METHODS.find(m => m.value === method)?.label}</span>
                        <svg className={`h-3.5 w-3.5 fill-current text-muted-foreground transition-transform ${isMethodOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </button>
                    {isMethodOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsMethodOpen(false)} />
                            <div className="absolute top-full mt-1 left-0 z-50 w-full bg-card border border-border/80 rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                                {METHODS.map((m) => (
                                    <button
                                        key={m.value}
                                        type="button"
                                        onClick={() => { onMethodChange?.(m.value); setIsMethodOpen(false); }}
                                        className={`block w-full text-left px-4 py-2.5 text-sm font-serif whitespace-nowrap transition-colors ${method === m.value ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* 全局格局标签 */}
                {globalPatterns.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {globalPatterns.map((pattern, idx) => (
                            <button
                                key={idx}
                                onClick={() => onPatternClick?.(pattern)}
                                className="px-2.5 py-1 rounded-full border border-border text-muted-foreground text-sm font-serif hover:bg-muted/10 transition-colors"
                                title={pattern.fullLabel}
                            >
                                {pattern.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
