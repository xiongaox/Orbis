/**
 * QimenChart - 应用源码层
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
 * - `default QimenChart`, `QimenPalace`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `qimenService`、内部模块 `patternDetector` 等 5 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState } from 'react';
import type { PaiPanMethod } from '../../../lib/csp-qimen/qimenService';
import type { GlobalPattern } from '../../../lib/csp-qimen/patternDetector';

// 导入子组件
import QimenHeader from './components/QimenHeader';
import PalaceCell from './components/PalaceCell';

// 九宫数据结构
export interface QimenPalace {
    position: number;
    gongName: string;
    tianPan: string;
    diPan: string;
    men: string;
    xing: string;
    shen: string;
    anGan?: string;
    jiGongTianPan?: string;
    jiGongDiPan?: string;
    maKong?: string;
    shenWang?: string;
    xingWang?: string;
    menWang?: string;
    jiGongTianPanCS?: string;
    jiGongDiPanCS?: string;
    anGanShiErCS?: string;
    tianPanShiErCS?: string;
    diPanShiErCS?: string;
    // 十神字段
    tianPanShiShen?: string;
    diPanShiShen?: string;
    xingShiShen?: string;
    menShiShen?: string;
    jiGongTianPanShiShen?: string;
    jiGongDiPanShiShen?: string;
    // 门迫路径 (原宫 → 所在宫 → 后天方位)
    menPoPath?: {
        from: string;   // 原宫 (如 "兑")
        to: string;     // 所在宫 (如 "巽")
        final: string;  // 后天方位 (如 "坤")
    };
    // 底部元数据
    palaceMeta?: {
        number: string;       // 序号 (如 "4538")
        wangShuai: string;    // 宫位旺衰 (如 "囚")
        panType: string;      // 盘类型 (如 "内盘")
    };
}

interface QimenChartProps {
    palaces: QimenPalace[];
    selectedPalace: number | null;
    onSelectPalace: (position: number) => void;
    onPrevHour?: () => void;
    onNextHour?: () => void;
    method?: PaiPanMethod;
    onMethodChange?: (method: PaiPanMethod) => void;
    onResetToNow?: () => void;
    onOpenDatePicker?: () => void;
    onJuClick?: () => void;  // 新增：点击局数打开自定义弹窗
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
    globalPatterns?: GlobalPattern[];
    onPatternClick?: (pattern: GlobalPattern) => void;
    onOpenAiModal?: () => void;
    dynamicMaKong?: { kongPositions: number[]; maPosition: number };
    /** Pad 横屏时传入 true，去掉 max-w 限制让盘面更宽 */
    fullWidth?: boolean;
    /** Pad 横屏时隐藏顶部信息栏（移至右侧面板） */
    hideHeader?: boolean;
    /** 移动端布局 */
    isMobileLayout?: boolean;
    /** 外部受控的显示状态（移动端使用） */
    controlledShowChangSheng?: boolean;
    controlledShowShiShen?: boolean;
    controlledShowPalaceMeta?: boolean;
    onToggleChangSheng?: () => void;
    onToggleShiShen?: () => void;
    onTogglePalaceMeta?: () => void;
    onLongPressPalace?: (position: number) => void;
}

// 洛书九宫布局顺序
const LUOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

// 获取真实天干（甲遁六仪）
function getRealStem(stem: string, branch: string): string {
    if (stem !== '甲') return stem;
    const map: Record<string, string> = { '子': '戊', '戌': '己', '申': '庚', '午': '辛', '辰': '壬', '寅': '癸' };
    return map[branch] || stem;
}

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
    onJuClick,
    header,
    globalPatterns = [],
    onPatternClick,
    onOpenAiModal,
    dynamicMaKong,
    fullWidth = false,
    hideHeader = false,
    isMobileLayout = false,
    controlledShowChangSheng,
    controlledShowShiShen,
    controlledShowPalaceMeta,
    onToggleChangSheng,
    onToggleShiShen,
    onTogglePalaceMeta,
    onLongPressPalace,
}: QimenChartProps) {
    const orderedPalaces = LUOSHU_ORDER.map(pos => palaces.find(p => p.position === pos)!);
    // 内部状态（桌面端使用）
    const [internalShowChangSheng, setInternalShowChangSheng] = useState(false);
    const [internalShowShiShen, setInternalShowShiShen] = useState(false);
    const [internalShowPalaceMeta, setInternalShowPalaceMeta] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // 根据是否有外部受控状态决定使用哪个
    const showChangSheng = controlledShowChangSheng ?? internalShowChangSheng;
    const showShiShen = controlledShowShiShen ?? internalShowShiShen;
    const showPalaceMeta = controlledShowPalaceMeta ?? internalShowPalaceMeta;

    // 互斥切换逻辑：开启长生则关闭十神，开启十神则关闭长生
    const handleToggleChangSheng = onToggleChangSheng ?? (() => {
        if (!internalShowChangSheng) {
            setInternalShowChangSheng(true);
            setInternalShowShiShen(false);
        } else {
            setInternalShowChangSheng(false);
        }
    });

    const handleToggleShiShen = onToggleShiShen ?? (() => {
        if (!internalShowShiShen) {
            setInternalShowShiShen(true);
            setInternalShowChangSheng(false);
        } else {
            setInternalShowShiShen(false);
        }
    });

    const handleTogglePalaceMeta = onTogglePalaceMeta ?? (() => setInternalShowPalaceMeta(!internalShowPalaceMeta));

    // 高亮计算
    const targetDayStem = getRealStem(header.siZhu.day[0], header.siZhu.day[1]);
    const targetHourStem = getRealStem(header.siZhu.hour[0], header.siZhu.hour[1]);

    return (
        <div className={`flex flex-col h-full overflow-hidden items-center ${isMobileLayout ? 'p-0' : 'p-2'} relative`}>
            <div className="flex flex-col flex-1 min-h-0 items-center w-full">
                {/* 九宫盘主体 */}
                <div className={`flex flex-col h-full items-center w-full ${isMobileLayout ? '' : fullWidth ? 'max-w-[560px]' : 'max-w-2xl'}`}>
                    {/* 顶部信息栏 - Pad 端由右侧面板渲染 */}
                    {!hideHeader && (
                        <div className={`w-full flex-shrink-0 ${isMobileLayout ? 'mb-0' : 'mb-2'}`}>
                            <QimenHeader
                                header={header}
                                method={method}
                                onMethodChange={onMethodChange}
                                onResetToNow={onResetToNow}
                                onOpenDatePicker={onOpenDatePicker}
                                onPrevHour={onPrevHour}
                                onNextHour={onNextHour}
                                onJuClick={onJuClick}
                                globalPatterns={globalPatterns}
                                onPatternClick={onPatternClick}
                                onOpenAiModal={onOpenAiModal}
                                isSettingsOpen={isSettingsOpen}
                                onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
                                isMobileLayout={isMobileLayout}
                            />
                        </div>
                    )}

                    {/* 九宫格盘式 */}
                    <div className="flex-1 min-h-0 w-full">
                        <div className={`w-full h-full ${isMobileLayout ? '' : 'bg-card rounded-xl border border-border p-2'}`}>
                            <div className={`grid grid-cols-3 ${isMobileLayout ? 'gap-0' : 'gap-1'} h-full`}>
                                {orderedPalaces.map((palace) => (
                                    <PalaceCell
                                        key={palace.position}
                                        palace={palace}
                                        isSelected={selectedPalace === palace.position}
                                        onSelect={() => onSelectPalace(palace.position)}
                                        showChangSheng={showChangSheng}
                                        showShiShen={showShiShen}
                                        showPalaceMeta={showPalaceMeta}
                                        isZhiFu={palace.xing === header.zhiFu}
                                        isZhiShi={palace.men === header.zhiShi}
                                        isDayStem={palace.tianPan === targetDayStem}
                                        isHourStem={palace.tianPan === targetHourStem}
                                        isJiGongDayStem={palace.jiGongTianPan === targetDayStem}
                                        isJiGongHourStem={palace.jiGongTianPan === targetHourStem}
                                        dynamicMaKong={dynamicMaKong}
                                        isMobileLayout={isMobileLayout}
                                        onLongPress={onLongPressPalace ? () => onLongPressPalace(palace.position) : undefined}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 高级设置弹窗 - 绝对定位在右侧，弹窗底部与信息栏底部对齐 */}
            {isSettingsOpen && (
                <div className="absolute top-[60px] right-2 w-56 bg-card border border-border/80 rounded-xl shadow-xl p-3 animate-in fade-in slide-in-from-left-2 duration-200 ring-1 ring-black/5 z-10">
                    <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
                        <span className="text-xs text-muted-foreground font-serif">宫位元素显示</span>
                        <button
                            type="button"
                            onClick={() => setIsSettingsOpen(false)}
                            className="p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            title="关闭"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex flex-col gap-3">
                        {/* 长生状态开关 */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-serif text-foreground">长生状态</span>
                            <button
                                type="button"
                                onClick={handleToggleChangSheng}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${showChangSheng ? 'bg-primary' : 'bg-muted'}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${showChangSheng ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        {/* 十神展示开关 */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-serif text-foreground">十神展示</span>
                            <button
                                type="button"
                                onClick={handleToggleShiShen}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${showShiShen ? 'bg-primary' : 'bg-muted'}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${showShiShen ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        {/* 宫位元数据开关 */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-serif text-foreground">宫位提示</span>
                            <button
                                type="button"
                                onClick={handleTogglePalaceMeta}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${showPalaceMeta ? 'bg-primary' : 'bg-muted'}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${showPalaceMeta ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
