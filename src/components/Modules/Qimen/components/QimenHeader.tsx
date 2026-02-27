/**
 * 奇门盘头部信息栏
 * 从 QimenChart.tsx 提取的顶部信息区域
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

interface QimenHeaderProps {
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
    onJuClick?: () => void;  // 新增：点击局数打开自定义弹窗
    globalPatterns: GlobalPattern[];
    onPatternClick?: (pattern: GlobalPattern) => void;
    onOpenAiModal?: () => void;
    isSettingsOpen: boolean;
    onToggleSettings: () => void;
    isMobileLayout?: boolean;
}

export default function QimenHeader({
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
    isSettingsOpen,
    onToggleSettings,
    isMobileLayout = false,
}: QimenHeaderProps) {
    const [isMethodOpen, setIsMethodOpen] = useState(false);
    // isSettingsOpen 状态已提升到父组件

    return (
        <div className={`w-full bg-card flex flex-col ${isMobileLayout ? 'p-4 gap-3' : 'rounded-xl border border-border p-3 2xl:p-5 gap-2 2xl:gap-4'}`}>
            {/* 第一行：日期时间 + 操作按钮 */}
            <div className="flex items-center justify-between text-sm 2xl:text-xl">
                <div className="flex items-baseline gap-1 2xl:gap-2">
                    <span className="font-serif font-bold text-foreground">
                        {header.solarDate.replace(/年|月|日/g, (match) => ` ${match} `)}
                    </span>
                    <span className="font-serif text-foreground">({header.lunarDate})</span>
                    <span className="font-serif font-bold text-foreground ml-1 2xl:ml-2">{header.time}</span>
                </div>
                <div className="flex items-center gap-1 2xl:gap-2">
                    <button onClick={onResetToNow} className="px-2 2xl:px-3 py-0.5 2xl:py-1 text-xs 2xl:text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors font-serif">现在</button>
                    <button onClick={onOpenDatePicker} className="px-2 2xl:px-3 py-0.5 2xl:py-1 text-xs 2xl:text-sm bg-secondary text-muted-foreground rounded-md hover:bg-secondary/80 transition-colors font-serif border border-border">重新选择</button>
                    {!isMobileLayout && (
                        <button onClick={onOpenAiModal} className="px-2 2xl:px-3 py-0.5 2xl:py-1 text-xs 2xl:text-sm bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-all font-serif flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                            <span>AI 提示</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 第二行：四柱 + 信息 */}
            {header.siZhu?.year && (
                <div className="flex items-center justify-between">
                    <div className="flex gap-5 2xl:gap-6">
                        {(['year', 'month', 'day', 'hour'] as const).map((key) => {
                            const labels = { year: '年', month: '月', day: '日', hour: '时' };
                            const stem = header.siZhu[key][0];
                            const branch = header.siZhu[key][1];
                            const isDayOrHour = key === 'day' || key === 'hour';
                            const isJia = stem === '甲';
                            return (
                                <div key={key} className={`flex flex-col items-center relative ${isMobileLayout ? 'pr-4' : 'pr-3 2xl:pr-4'}`}>
                                    <span className={`text-base 2xl:text-2xl font-serif leading-none ${isMobileLayout ? 'mb-1' : 'mb-0.5 2xl:mb-1'} ${isDayOrHour ? 'text-primary font-bold' : 'text-foreground'}`}>{stem}</span>
                                    <span className={`text-base 2xl:text-2xl font-serif leading-none ${isDayOrHour && isJia ? 'text-primary font-bold' : 'text-foreground'}`}>{branch}</span>
                                    <span className="absolute top-1/2 -translate-y-1/2 right-0 text-xs 2xl:text-sm text-muted-foreground/60 font-serif transform scale-90 origin-right">{labels[key]}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="h-6 2xl:h-10 w-px bg-border/60 ml-4 2xl:ml-8 mr-4 2xl:mr-10" />
                    <div className={`grid ${isMobileLayout ? 'grid-cols-2 gap-y-1 gap-x-3' : 'grid-cols-3 gap-y-0.5 2xl:gap-y-1 gap-x-3 2xl:gap-x-8'} text-xs 2xl:text-base flex-1`}>
                        {(isMobileLayout ? [
                            { label: header.ju.substring(0, 2), value: header.ju.substring(2), bold: true, clickable: true },
                            { label: '旬首', value: header.xunShou, bold: false, clickable: false },
                            { label: '值符', value: header.zhiFu, bold: false, clickable: false },
                            { label: '值使', value: header.zhiShi, bold: false, clickable: false },
                        ] : [
                            { label: header.ju.substring(0, 2), value: header.ju.substring(2), bold: true, clickable: true },
                            { label: '旬首', value: header.xunShou, bold: false, clickable: false },
                            { label: '马星', value: header.maXing, bold: false, clickable: false },
                            { label: '值符', value: header.zhiFu, bold: false, clickable: false },
                            { label: '值使', value: header.zhiShi, bold: false, clickable: false },
                            { label: '空亡', value: header.kongWang, bold: false, clickable: false },
                        ]).map((item, i) => (
                            <div key={i} className="flex items-center gap-1 2xl:gap-2">
                                <span className="text-muted-foreground font-light">{item.label}:</span>
                                {item.clickable ? (
                                    <button
                                        onClick={onJuClick}
                                        className="text-primary font-serif font-bold hover:underline underline-offset-2 transition-colors cursor-pointer"
                                        title="点击自定义局数"
                                    >
                                        {item.value}
                                    </button>
                                ) : (
                                    <span className={`text-foreground font-serif ${item.bold ? 'font-bold' : ''}`}>{item.value}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 第三行：标签 + 操作按钮 */}
            <div className={`flex ${isMobileLayout ? 'items-stretch' : 'items-center'} justify-between`}>
                <div className="flex items-center gap-1 2xl:gap-2">
                    <div className="relative">
                        <button type="button" onClick={() => setIsMethodOpen(!isMethodOpen)} className="flex items-center gap-1 pl-3 pr-2 py-0.5 rounded-full border border-border text-muted-foreground text-xs 2xl:text-sm font-serif hover:bg-muted/10 transition-colors">
                            <span>{METHODS.find(m => m.value === method)?.label}</span>
                            <svg className={`h-3 w-3 fill-current text-muted-foreground transition-transform ${isMethodOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </button>
                        {isMethodOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsMethodOpen(false)} />
                                <div className="absolute top-full mt-1 left-0 z-50 w-max bg-card border border-border/80 rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                                    {METHODS.map((m) => (
                                        <button key={m.value} type="button" onClick={() => { onMethodChange?.(m.value); setIsMethodOpen(false); }} className={`block w-full text-left px-3.5 py-2 text-xs 2xl:text-sm font-serif whitespace-nowrap transition-colors ${method === m.value ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>{m.label}</button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    {globalPatterns.map((pattern, idx) => (
                        <button key={idx} onClick={() => onPatternClick?.(pattern)} className="px-2 2xl:px-3.5 py-0.5 rounded-full border border-border text-muted-foreground text-xs 2xl:text-sm font-serif hover:bg-muted/10 transition-colors" title={pattern.fullLabel}>{pattern.label}</button>
                    ))}
                </div>
                <div className={`flex ${isMobileLayout ? 'items-stretch' : 'items-center'} gap-1 2xl:gap-2`}>
                    <button type="button" onClick={onPrevHour} className={`${isMobileLayout ? 'px-3 flex items-center' : 'p-1 2xl:p-1.5'} bg-secondary/80 text-muted-foreground rounded-full hover:bg-secondary transition-colors border border-border`} title="上一局">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isMobileLayout ? 'w-4 h-4' : 'w-3 h-3 2xl:w-3.5 2xl:h-3.5'}><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <button type="button" onClick={onNextHour} className={`${isMobileLayout ? 'px-3 flex items-center' : 'p-1 2xl:p-1.5'} bg-secondary/80 text-muted-foreground rounded-full hover:bg-secondary transition-colors border border-border`} title="下一局">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isMobileLayout ? 'w-4 h-4' : 'w-3 h-3 2xl:w-3.5 2xl:h-3.5'}><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                    {!isMobileLayout && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={onToggleSettings}
                                className={`flex items-center gap-1 px-1.5 2xl:px-2.5 py-0.5 text-xs 2xl:text-sm rounded-full transition-colors font-serif border border-border ${isSettingsOpen ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 2xl:w-3.5 2xl:h-3.5">
                                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                <span>高级设置</span>
                                <svg className={`h-3 w-3 fill-current transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </button>
                            {/* 弹窗渲染已移至 QimenChart 层级 */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
