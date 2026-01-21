/**
 * 案例学习专用奇门头部 - 精简版
 * 去掉：现在、重新选择、设置、上一局、下一局按钮
 */
import { useState } from 'react';
import type { PaiPanMethod } from '../../../../lib/csp-qimen/qimenService';
import type { GlobalPattern } from '../../../../lib/csp-qimen/patternDetector';

const METHODS: { value: PaiPanMethod; label: string }[] = [
    { value: 'zhirun', label: '时家转盘置润' },
    { value: 'yinpan', label: '时家转盘阴盘' },
    { value: 'chaibu', label: '时家转盘拆补' },
    { value: 'maoshan', label: '时家茅山' },
];

interface CaseStudyQimenHeaderProps {
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
    method?: PaiPanMethod;
    onMethodChange?: (method: PaiPanMethod) => void;
    globalPatterns?: GlobalPattern[];
    onPatternClick?: (pattern: GlobalPattern) => void;
    showChangSheng: boolean;
    onToggleChangSheng: () => void;
}

export default function CaseStudyQimenHeader({
    header,
    method = 'zhirun',
    onMethodChange,
    globalPatterns = [],
    onPatternClick,
    showChangSheng,
    onToggleChangSheng,
}: CaseStudyQimenHeaderProps) {
    const [isMethodOpen, setIsMethodOpen] = useState(false);

    return (
        <div className="w-full p-4 flex flex-col gap-3 bg-card border-b border-border">
            {/* 第一行：日期时间 */}
            <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-serif font-bold text-foreground">
                        {header.solarDate.replace(/年|月|日/g, (match) => ` ${match} `)}
                    </span>
                    <span className="text-base font-serif text-foreground/80">({header.lunarDate})</span>
                    <span className="text-lg font-serif font-bold text-foreground ml-2">{header.time}</span>
                </div>
            </div>

            {/* 第二行：四柱 + 信息 */}
            {header.siZhu?.year && (
                <div className="flex items-center justify-start">
                    <div className="flex gap-4">
                        {(['year', 'month', 'day', 'hour'] as const).map((key) => {
                            const labels = { year: '年', month: '月', day: '日', hour: '时' };
                            const stem = header.siZhu[key][0];
                            const branch = header.siZhu[key][1];
                            const isDayOrHour = key === 'day' || key === 'hour';
                            const isJia = stem === '甲';
                            return (
                                <div key={key} className="flex flex-col items-center relative pr-2.5">
                                    <span className={`text-xl font-serif leading-tight ${isDayOrHour ? 'text-primary font-bold' : 'text-foreground'}`}>{stem}</span>
                                    <span className={`text-xl font-serif leading-tight ${isDayOrHour && isJia ? 'text-primary font-bold' : 'text-foreground'}`}>{branch}</span>
                                    <span className="absolute top-1/2 -translate-y-1/2 -right-1.5 text-xs text-muted-foreground/60 font-serif origin-right">{labels[key]}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="h-8 w-px bg-border/60 ml-6 mr-6" />
                    <div className="grid grid-cols-3 gap-y-1 gap-x-4 text-sm whitespace-nowrap">
                        {[
                            { label: header.ju.substring(0, 2), value: header.ju.substring(2), bold: true },
                            { label: '旬首', value: header.xunShou },
                            { label: '马星', value: header.maXing },
                            { label: '值符', value: header.zhiFu },
                            { label: '值使', value: header.zhiShi },
                            { label: '空亡', value: header.kongWang },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <span className="text-muted-foreground font-light opacity-80 text-xs">{item.label}:</span>
                                <span className={`text-foreground font-serif text-base ${item.bold ? 'font-bold' : ''}`}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 第三行：标签 + 长生状态按钮 */}
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button type="button" onClick={() => setIsMethodOpen(!isMethodOpen)} className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-border text-muted-foreground text-xs font-serif bg-muted/10 hover:bg-muted/20 transition-colors">
                            <span>{METHODS.find(m => m.value === method)?.label}</span>
                            <svg className={`h-3 w-3 fill-current text-muted-foreground transition-transform ${isMethodOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </button>
                        {isMethodOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsMethodOpen(false)} />
                                <div className="absolute top-full mt-1 left-0 z-50 w-full bg-card border border-border/80 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                                    {METHODS.map((m) => (
                                        <button key={m.value} type="button" onClick={() => { onMethodChange?.(m.value); setIsMethodOpen(false); }} className={`block w-full text-left px-2.5 py-2 text-xs font-serif whitespace-nowrap transition-colors ${method === m.value ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>{m.label}</button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    {globalPatterns.map((pattern, idx) => (
                        <button key={idx} onClick={() => onPatternClick?.(pattern)} className="px-2.5 py-0.5 rounded-md border border-border text-muted-foreground text-xs font-serif hover:bg-muted/10 transition-colors" title={pattern.fullLabel}>{pattern.label}</button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onToggleChangSheng} className={`px-3 py-0.5 text-xs rounded-md transition-colors font-serif border border-border ${showChangSheng ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>长生状态</button>
                </div>
            </div>
        </div>
    );
}
