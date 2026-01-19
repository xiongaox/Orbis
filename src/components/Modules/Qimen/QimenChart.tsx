import { useState } from 'react';
import type { PaiPanMethod } from '../../../lib/csp-qimen/qimenService';
import type { GlobalPattern } from '../../../lib/csp-qimen/patternDetector';

// 九宫数据结构
export interface QimenPalace {
    position: number;           // 1-9 宫位编号（洛书数）
    gongName: string;           // 宫名（坎、坤、震、巽、中、乾、兑、艮、离）
    tianPan: string;            // 天盘干（第三行第三列）
    diPan: string;              // 地盘干（第二行第三列）
    men: string;                // 八门（第三行第二列）
    xing: string;               // 九星（第二行第二列）
    shen: string;               // 八神（第一行第二列）
    anGan?: string;             // 暗干（第一行第一列）
    // 寄宫干支（中宫寄宫时使用）
    jiGongTianPan?: string;     // 寄宫天盘干（第二行第一列）
    jiGongDiPan?: string;       // 寄宫地盘干（第三行第一列）
    // 驿马/空亡
    maKong?: string;            // 驿马/空亡（第一行第三列）
    // 旺相休囚废状态
    shenWang?: string;          // 八神旺相
    xingWang?: string;          // 九星旺相
    menWang?: string;           // 八门旺相
    // 十二长生
    jiGongTianPanCS?: string;   // 寄宫天盘干十二长生
    jiGongDiPanCS?: string;     // 寄宫地盘干十二长生
    anGanShiErCS?: string;      // 暗干十二长生（可能不需要，待确认）
    tianPanShiErCS?: string;    // 天盘干十二长生
    diPanShiErCS?: string;      // 地盘干十二长生
}

interface QimenChartProps {
    palaces: QimenPalace[];
    selectedPalace: number | null;
    onSelectPalace: (position: number) => void;
    onPrevHour?: () => void;  // 上一时辰
    onNextHour?: () => void;  // 下一时辰
    method?: PaiPanMethod;
    onMethodChange?: (method: PaiPanMethod) => void;
    onResetToNow?: () => void;
    onOpenDatePicker?: () => void;
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
        siZhu: {
            year: string;
            month: string;
            day: string;
            hour: string;
        };
    };
    globalPatterns?: GlobalPattern[];  // 全局格局
    onPatternClick?: (pattern: GlobalPattern) => void;  // 格局点击回调
}// 洛书九宫布局顺序（按行从左到右，从上到下）
const LUOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

const METHODS: { value: PaiPanMethod; label: string }[] = [
    { value: 'zhirun', label: '时家转盘置润' },
    { value: 'yinpan', label: '时家转盘阴盘' },
    { value: 'chaibu', label: '时家转盘拆补' },
    { value: 'maoshan', label: '时家茅山' },
];

export default function QimenChart({
    palaces,
    selectedPalace,
    onSelectPalace,
    onPrevHour,
    onNextHour,
    method = 'zhirun',
    onMethodChange,
    onResetToNow,
    onOpenDatePicker,
    header,
    globalPatterns = [],
    onPatternClick,
}: QimenChartProps) {
    const orderedPalaces = LUOSHU_ORDER.map(pos => palaces.find(p => p.position === pos)!);
    // 是否显示十二长生和旺相
    const [showChangSheng, setShowChangSheng] = useState(true);
    // 盘式选择器开关
    const [isMethodOpen, setIsMethodOpen] = useState(false);



    return (
        <div className="flex flex-col h-full overflow-hidden items-center p-2">
            {/* 九宫盘高度决定整体宽度的容器 */}
            <div className="flex flex-col flex-1 min-h-0 items-center w-full">
                {/* 内容容器：宽度由九宫盘决定，限制最大宽度 */}
                <div className="flex flex-col h-full items-center max-w-2xl">
                    {/* 顶部信息栏 - 使用 w-full 填满容器宽度 */}
                    <div className="w-full flex-shrink-0 mb-2">
                        <div className="w-full bg-card rounded-xl border border-border p-4 2xl:p-5 flex flex-col gap-3 2xl:gap-4">
                            {/* 第一行：日期时间 + 操作按钮 */}
                            <div className="flex items-center justify-between text-sm 2xl:text-xl">
                                <div className="flex items-baseline gap-1 2xl:gap-2">
                                    <span className="font-serif font-bold text-foreground">
                                        {header.solarDate.replace(/年|月|日/g, (match) => ` ${match} `)}
                                    </span>
                                    <span className="font-serif text-foreground">
                                        ({header.lunarDate})
                                    </span>
                                    <span className="font-serif font-bold text-foreground ml-1 2xl:ml-2">
                                        {header.time}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 2xl:gap-2">
                                    <button
                                        onClick={onResetToNow}
                                        className="px-2 2xl:px-3 py-0.5 2xl:py-1 text-xs 2xl:text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors font-serif"
                                    >
                                        现在
                                    </button>

                                    <button
                                        onClick={onOpenDatePicker}
                                        className="px-2 2xl:px-3 py-0.5 2xl:py-1 text-xs 2xl:text-sm bg-secondary text-muted-foreground rounded-md hover:bg-secondary/80 transition-colors font-serif border border-border"
                                    >
                                        重新选择
                                    </button>
                                </div>
                            </div>

                            {/* 第二行：四柱 + 信息 */}
                            <div className="flex items-center justify-start">
                                {/* 左侧：四柱 */}
                                <div className="flex gap-5 2xl:gap-6">
                                    {([
                                        { key: 'year', label: '年' },
                                        { key: 'month', label: '月' },
                                        { key: 'day', label: '日' },
                                        { key: 'hour', label: '时' }
                                    ] as const).map(({ key, label }) => {
                                        const stem = header.siZhu[key][0];
                                        const branch = header.siZhu[key][1];
                                        const isDayOrHour = key === 'day' || key === 'hour';
                                        // 甲时/甲日：整柱高亮（干+支）
                                        const isJia = stem === '甲';

                                        return (
                                            <div key={key} className="flex flex-col items-center relative pr-3 2xl:pr-4">
                                                <span className={`text-base 2xl:text-2xl font-serif leading-none mb-0.5 2xl:mb-1 ${isDayOrHour ? 'text-primary font-bold' : 'text-foreground'}`}>
                                                    {stem}
                                                </span>
                                                <span className={`text-base 2xl:text-2xl font-serif leading-none ${isDayOrHour && isJia ? 'text-primary font-bold' : 'text-foreground'}`}>
                                                    {branch}
                                                </span>
                                                {/* 标签：绝对定位在右侧中间 */}
                                                <span className="absolute top-1/2 -translate-y-1/2 right-0 text-xs 2xl:text-sm text-muted-foreground/60 font-serif transform scale-90 origin-right">
                                                    {label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 分割线 - 调整间距以配合 justify-start */}
                                <div className="h-6 2xl:h-10 w-px bg-border/60 ml-4 2xl:ml-8 mr-4 2xl:mr-10" />

                                {/* 右侧：局数信息 */}
                                <div className="grid grid-cols-3 gap-y-0.5 2xl:gap-y-1 gap-x-3 2xl:gap-x-8 text-xs 2xl:text-base">
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            {header.ju.substring(0, 2)}:
                                        </span>
                                        <span className="text-foreground font-serif font-bold">
                                            {header.ju.substring(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            旬首:
                                        </span>
                                        <span className="text-foreground font-serif">
                                            {header.xunShou}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            马星:
                                        </span>
                                        <span className="text-foreground font-serif">
                                            {header.maXing}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            值符:
                                        </span>
                                        <span className="text-foreground font-serif">
                                            {header.zhiFu}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            值使:
                                        </span>
                                        <span className="text-foreground font-serif">
                                            {header.zhiShi}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            空亡:
                                        </span>
                                        <span className="text-foreground font-serif">
                                            {header.kongWang}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 第三行：标签 + 操作按钮 */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 2xl:gap-2">

                                    <div className="relative">
                                        {/* Dropdown Trigger Button */}
                                        <button
                                            type="button"
                                            onClick={() => setIsMethodOpen(!isMethodOpen)}
                                            className="flex items-center gap-1 pl-3 pr-2 py-0.5 rounded-full border border-border text-muted-foreground text-xs 2xl:text-sm font-serif hover:bg-muted/10 transition-colors"
                                        >
                                            <span>
                                                {METHODS.find(m => m.value === method)?.label}
                                            </span>
                                            <svg className={`h-3 w-3 fill-current text-muted-foreground transition-transform ${isMethodOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                            </svg>
                                        </button>

                                        {/* Dropdown Menu */}
                                        {isMethodOpen && (
                                            <>
                                                {/* Backdrop to close on click outside */}
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setIsMethodOpen(false)}
                                                />
                                                {/* Menu Content */}
                                                <div className="absolute top-full mt-1 left-0 z-50 w-max bg-card border border-border/80 rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                                                    {METHODS.map((m) => (
                                                        <button
                                                            key={m.value}
                                                            type="button"
                                                            onClick={() => {
                                                                onMethodChange?.(m.value);
                                                                setIsMethodOpen(false);
                                                            }}
                                                            className={`block w-full text-left px-3.5 py-2 text-xs 2xl:text-sm font-serif whitespace-nowrap transition-colors ${method === m.value
                                                                ? 'bg-primary/10 text-primary font-medium'
                                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                                }`}
                                                        >
                                                            {m.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {/* 全局格局按钮 */}
                                    {globalPatterns.map((pattern, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => onPatternClick?.(pattern)}
                                            className="px-2 2xl:px-3.5 py-0.5 rounded-full border border-border text-muted-foreground text-xs 2xl:text-sm font-serif hover:bg-muted/10 transition-colors"
                                            title={pattern.fullLabel}
                                        >
                                            {pattern.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1 2xl:gap-2">
                                    <button
                                        type="button"
                                        onClick={onPrevHour}
                                        className="p-1 2xl:p-1.5 bg-secondary/80 text-muted-foreground rounded-full hover:bg-secondary transition-colors border border-border"
                                        title="上一局"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 2xl:w-3.5 2xl:h-3.5"><path d="m15 18-6-6 6-6" /></svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onNextHour}
                                        className="p-1 2xl:p-1.5 bg-secondary/80 text-muted-foreground rounded-full hover:bg-secondary transition-colors border border-border"
                                        title="下一局"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 2xl:w-3.5 2xl:h-3.5"><path d="m9 18 6-6-6-6" /></svg>
                                    </button>
                                    <button
                                        onClick={() => setShowChangSheng(!showChangSheng)}
                                        className={`px-2 2xl:px-3.5 py-0.5 text-xs 2xl:text-sm rounded-full transition-colors font-serif border border-border ${showChangSheng
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                                            }`}
                                    >
                                        长生
                                    </button>
                                    <button className="px-2 2xl:px-3.5 py-0.5 text-xs 2xl:text-sm bg-secondary/80 text-muted-foreground rounded-full hover:bg-secondary transition-colors font-serif border border-border">
                                        设置
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* 九宫格盘式 - 填满剩余空间 */}
                    <div className="flex-1 min-h-0 w-full">
                        <div className="w-full h-full bg-card rounded-xl border border-border p-2">
                            <div className="grid grid-cols-3 gap-1 h-full">
                                {orderedPalaces.map((palace) => {
                                    // 提取高亮逻辑
                                    const getRealStem = (stem: string, branch: string) => {
                                        if (stem !== '甲') return stem;
                                        // 甲子戊, 甲戌己, 甲申庚, 甲午辛, 甲辰壬, 甲寅癸
                                        const map: Record<string, string> = {
                                            '子': '戊', '戌': '己', '申': '庚',
                                            '午': '辛', '辰': '壬', '寅': '癸'
                                        };
                                        return map[branch] || stem;
                                    };

                                    const dayStemRaw = header.siZhu.day[0];
                                    const dayBranch = header.siZhu.day[1];
                                    const hourStemRaw = header.siZhu.hour[0];
                                    const hourBranch = header.siZhu.hour[1];

                                    const targetDayStem = getRealStem(dayStemRaw, dayBranch);
                                    const targetHourStem = getRealStem(hourStemRaw, hourBranch);

                                    const isZhiFu = palace.xing === header.zhiFu;
                                    const isZhiShi = palace.men === header.zhiShi;
                                    const isDayStem = palace.tianPan === targetDayStem;
                                    const isHourStem = palace.tianPan === targetHourStem;

                                    return (
                                        <button
                                            key={palace.position}
                                            type="button"
                                            onClick={() => onSelectPalace(palace.position)}
                                            className={`relative rounded-lg border transition-all ${selectedPalace === palace.position
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border/50 hover:border-border hover:bg-muted/30'
                                                } ${palace.position === 5 ? 'bg-muted/20' : ''}`}
                                        >
                                            {/* 中宫特殊布局：左上天盘干（暗干），右下地盘干 */}
                                            {palace.position === 5 ? (
                                                <>
                                                    {/* 中宫：显示入中的暗干和地盘干 */}
                                                    <div className={`h-full flex flex-col p-1 2xl:p-1.5 ${showChangSheng ? 'justify-center gap-y-5 2xl:gap-y-6' : 'justify-evenly gap-y-5 2xl:gap-y-6'}`}>
                                                        {/* 第一行：暗干（入中）在左上角 */}
                                                        <div className="grid grid-cols-3 w-full">
                                                            <div className="flex items-center justify-center">
                                                                <span className="text-base 2xl:text-xl font-serif text-muted-foreground">{palace.anGan}</span>
                                                            </div>
                                                            <div className="flex items-center justify-center">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground/60">&nbsp;</span>
                                                            </div>
                                                            <div className="flex items-center justify-center">
                                                                <span className="text-base 2xl:text-xl font-serif text-muted-foreground">&nbsp;</span>
                                                            </div>
                                                        </div>

                                                        {/* 第二行：占位（与左右宫位第二行高度一致） */}
                                                        <div className="grid grid-cols-3 w-full">
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                                                            </div>
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className="text-2xl 2xl:text-3xl font-serif font-bold text-foreground">&nbsp;</span>
                                                            </div>
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                                                            </div>
                                                        </div>

                                                        {/* 第三行：只有地盘干 */}
                                                        <div className="grid grid-cols-3 w-full">
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                                                            </div>
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className="text-lg 2xl:text-2xl font-serif text-foreground">&nbsp;</span>
                                                            </div>
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.diPan}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    {/* 宫位内 3行 布局 */}
                                                    <div className={`h-full flex flex-col p-1 2xl:p-1.5 ${showChangSheng ? 'justify-center gap-y-5 2xl:gap-y-6' : 'justify-evenly gap-y-5 2xl:gap-y-6'}`}>
                                                        {/* 第一行：暗干 + 八神 + 马/空 */}
                                                        <div className="grid grid-cols-3 w-full">
                                                            <div className="flex items-center justify-center">
                                                                <span className="text-base 2xl:text-xl font-serif text-muted-foreground">{palace.anGan}</span>
                                                            </div>
                                                            <div className="flex items-center justify-center">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground/60">{palace.shen}</span>
                                                            </div>
                                                            <div className="flex items-center justify-center">
                                                                <span className="text-base 2xl:text-xl font-serif text-muted-foreground">{palace.maKong}</span>
                                                            </div>
                                                        </div>

                                                        {/* 第二行：寄宫天盘 + 九星 + 天盘干 */}
                                                        <div className="grid grid-cols-3 w-full">
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.jiGongTianPan}</span>
                                                                {showChangSheng && <span className="text-sm 2xl:text-sm text-muted-foreground">{palace.jiGongTianPanCS}</span>}
                                                            </div>
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className={`text-2xl 2xl:text-3xl font-serif font-bold ${isZhiFu ? 'text-primary' : 'text-foreground'}`}>{palace.xing}</span>
                                                                {showChangSheng && <span className="text-sm 2xl:text-sm text-muted-foreground">{palace.xingWang}</span>}
                                                            </div>
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className={`text-base 2xl:text-xl font-serif ${isDayStem || isHourStem ? 'text-primary font-bold' : 'text-foreground'}`}>{palace.tianPan}</span>
                                                                {showChangSheng && <span className="text-sm 2xl:text-sm text-muted-foreground">{palace.tianPanShiErCS}</span>}
                                                            </div>
                                                        </div>

                                                        {/* 第三行：寄宫地盘 + 八门 + 地盘干 */}
                                                        <div className="grid grid-cols-3 w-full">
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.jiGongDiPan}</span>
                                                                {showChangSheng && <span className="text-sm 2xl:text-sm text-muted-foreground">{palace.jiGongDiPanCS}</span>}
                                                            </div>
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className={`text-lg 2xl:text-2xl font-serif ${isZhiShi ? 'text-primary' : 'text-foreground'}`}>{palace.men}</span>
                                                                {showChangSheng && <span className="text-sm 2xl:text-sm text-muted-foreground">{palace.menWang}</span>}
                                                            </div>
                                                            <div className="flex flex-col items-center justify-center leading-tight">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.diPan}</span>
                                                                {showChangSheng && <span className="text-sm 2xl:text-sm text-muted-foreground">{palace.diPanShiErCS}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
