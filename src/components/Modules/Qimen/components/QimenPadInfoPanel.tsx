/**
 * QimenPadInfoPanel - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default QimenPadInfoPanel`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `qimenService`、内部模块 `patternDetector`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

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
    showChangSheng?: boolean;
    showShiShen?: boolean;
    showPalaceMeta?: boolean;
    onToggleChangSheng?: () => void;
    onToggleShiShen?: () => void;
    onTogglePalaceMeta?: () => void;
    caseTitle?: string;
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
    showChangSheng = false,
    showShiShen = false,
    showPalaceMeta = false,
    onToggleChangSheng,
    onToggleShiShen,
    onTogglePalaceMeta,
    caseTitle,
}: PadInfoPanelProps) {

    return (
        <div className="flex flex-col h-full p-4 gap-5">
            {/* 案例标题 - 有案例时显示 */}
            {caseTitle && (
                <div className="px-2 py-1.5 rounded-lg bg-primary/8 border border-primary/20 text-xs text-primary/80 font-serif leading-snug line-clamp-2">
                    {caseTitle}
                </div>
            )}

            {/* 日期时间 */}
            <div className="space-y-1.5">
                <div className="font-serif font-bold text-foreground text-xl leading-tight">
                    {header.solarDate}
                </div>
                <div className="font-serif text-muted-foreground text-sm">
                    {header.lunarDate} {header.time}
                </div>
            </div>

            {/* 操作按钮行：现在、选择 + 翻页，四等分 */}
            <div className="grid grid-cols-4 gap-2">
                <button onClick={onResetToNow} className="py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-serif text-center">
                    现在
                </button>
                <button onClick={onOpenDatePicker} className="py-1.5 text-sm bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 transition-colors font-serif border border-border text-center">
                    重选
                </button>
                <button type="button" onClick={onPrevHour} className="py-1.5 text-sm bg-secondary/80 text-muted-foreground rounded-lg hover:bg-secondary transition-colors border border-border font-serif text-center">
                    上局
                </button>
                <button type="button" onClick={onNextHour} className="py-1.5 text-sm bg-secondary/80 text-muted-foreground rounded-lg hover:bg-secondary transition-colors border border-border font-serif text-center">
                    下局
                </button>
            </div>

            {/* AI 提示词 - 独立一行，横向铺满 */}
            <button
                onClick={onOpenAiModal}
                className="w-full px-3 py-2 text-sm bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all font-serif flex items-center justify-center gap-1.5"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                AI 提示词
            </button>

            {/* 宫位显示开关 - 3列高亮按钮 */}
            <div className="h-px bg-border/50" />
            <div className="grid grid-cols-3 gap-2">
                {([
                    { label: '长生', active: showChangSheng, onToggle: onToggleChangSheng },
                    { label: '十神', active: showShiShen, onToggle: onToggleShiShen },
                    { label: '宫位', active: showPalaceMeta, onToggle: onTogglePalaceMeta },
                ] as const).map((item) => (
                    <button
                        key={item.label}
                        type="button"
                        onClick={item.onToggle}
                        className={`py-1.5 rounded-lg text-sm font-serif text-center transition-all border ${item.active
                            ? 'bg-primary/15 text-primary border-primary/40 font-medium'
                            : 'bg-secondary/50 text-muted-foreground border-border hover:bg-muted/30 hover:text-foreground'
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="h-px bg-border/50" />

            {/* 四柱 - 横向排列 */}
            {
                header.siZhu?.year && (
                    <div className="flex justify-around px-2">
                        {(['year', 'month', 'day', 'hour'] as const).map((key) => {
                            const stem = header.siZhu[key][0];
                            const branch = header.siZhu[key][1];
                            const isDayOrHour = key === 'day' || key === 'hour';
                            const isJia = stem === '甲';
                            return (
                                <div key={key} className="flex flex-col items-center gap-3">
                                    <span className={`text-xl font-serif leading-none ${isDayOrHour ? 'text-primary font-bold' : 'text-foreground'}`}>{stem}</span>
                                    <span className={`text-xl font-serif leading-none ${isDayOrHour && isJia ? 'text-primary font-bold' : 'text-foreground'}`}>{branch}</span>
                                </div>
                            );
                        })}
                    </div>
                )
            }

            <div className="h-px bg-border/50" />

            {/* 局信息网格 - 居中显示 */}
            <div className="flex justify-center">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
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
                                <span className="text-foreground font-serif">{item.value}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px bg-border/50" />


            {/* 排盘方法选择 - 2x2 高亮按钮网格 */}
            <div className="grid grid-cols-2 gap-2">
                {METHODS.map((m) => (
                    <button
                        key={m.value}
                        type="button"
                        onClick={() => onMethodChange?.(m.value)}
                        className={`py-1.5 rounded-lg text-sm font-serif text-center transition-all border ${method === m.value
                            ? 'bg-primary/15 text-primary border-primary/40 font-medium'
                            : 'bg-secondary/50 text-muted-foreground border-border hover:bg-muted/30 hover:text-foreground'
                            }`}
                    >
                        {m.label}
                    </button>
                ))}
            </div>


            {/* 全局格局标签 */}
            {
                globalPatterns.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {globalPatterns.map((pattern, idx) => (
                            <button
                                key={idx}
                                onClick={() => onPatternClick?.(pattern)}
                                className="px-2.5 py-1 rounded-lg border border-border text-muted-foreground text-sm font-serif hover:bg-muted/10 transition-colors"
                                title={pattern.fullLabel}
                            >
                                {pattern.label}
                            </button>
                        ))}
                    </div>
                )
            }
        </div >
    );
}
