import type { ReactNode } from 'react';
import type { PaiPanMethod } from '../../../lib/csp-qimen/qimenService';
import type { GlobalPattern } from '../../../lib/csp-qimen/patternDetector';
import { getJiaDunStem } from '../../../lib/csp-qimen/qimenUtils';

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
    /** 顶栏第三行右侧自定义动作区（透传给 QimenHeader，如案例盘的长生/十神切换） */
    headerActions?: ReactNode;
    dynamicMaKong?: { kongPositions: number[]; maPosition: number };
    /** Pad 横屏时传入 true，去掉 max-w 限制让盘面更宽 */
    fullWidth?: boolean;
    /** Pad 横屏时隐藏顶部信息栏（移至右侧面板） */
    hideHeader?: boolean;
    /** 移动端布局 */
    isMobileLayout?: boolean;
    /**
     * 紧凑档：供把盘面嵌进窄侧栏的场景使用（案例学习右栏）。
     * 开启后——收紧内边距与格间距、去掉盘面与宫位圆角、宫位内容不再撑满拉长、
     * 字号按「容器宽度」而非视口宽度分档。
     * 不传时保持奇门模块整页排盘的原样，互不影响。
     */
    compact?: boolean;
    /**
     * 干/星/门与正下方旺衰之间补一点行间距（案例学习窄侧栏用）。
     * 与 compact 分开：Pad 端奇门排盘也走 compact，但外观需保持原样，
     * 故这里用独立开关，只有案例学习显式开启。
     */
    roomyStemSpacing?: boolean;
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
    headerActions,
    dynamicMaKong,
    fullWidth = false,
    hideHeader = false,
    isMobileLayout = false,
    compact = false,
    roomyStemSpacing = false,
    controlledShowChangSheng,
    controlledShowShiShen,
    controlledShowPalaceMeta,
    onLongPressPalace,
}: QimenChartProps) {
    const orderedPalaces = LUOSHU_ORDER.map(pos => palaces.find(p => p.position === pos)!);
    const showChangSheng = controlledShowChangSheng ?? false;
    const showShiShen = controlledShowShiShen ?? false;
    const showPalaceMeta = controlledShowPalaceMeta ?? false;

    // 高亮计算
    const targetDayStem = getJiaDunStem(header.siZhu.day[0], header.siZhu.day[1]);
    const targetHourStem = getJiaDunStem(header.siZhu.hour[0], header.siZhu.hour[1]);

    return (
        <div className={`flex flex-col h-full overflow-hidden items-center ${isMobileLayout ? 'p-0' : compact ? 'p-1' : 'p-2'} relative`}>
            <div className="flex flex-col flex-1 min-h-0 items-center w-full">
                {/* 九宫盘主体 */}
                <div className={`flex flex-col h-full items-center w-full ${isMobileLayout ? '' : fullWidth ? 'max-w-[560px]' : 'max-w-2xl'}`}>
                    {/* 顶部信息栏 - Pad 端由右侧面板渲染 */}
                    {!hideHeader && (
                        <div className={`w-full flex-shrink-0 ${isMobileLayout ? 'mb-0' : compact ? 'mb-1' : 'mb-2'}`}>
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
                                headerActions={headerActions}
                                isMobileLayout={isMobileLayout}
                                compact={compact}
                            />
                        </div>
                    )}

                    {/* 九宫格盘式：紧凑档挂 @container，宫位字号改按「格子实际宽度」分档 */}
                    <div className={`flex-1 min-h-0 w-full ${compact ? '@container' : ''}`}>
                        <div className={`w-full h-full ${isMobileLayout ? '' : compact ? 'bg-card border border-border p-1' : 'bg-card rounded-xl border border-border p-2'}`}>
                            <div className={`grid grid-cols-3 ${isMobileLayout ? 'gap-0' : compact ? 'gap-0.5' : 'gap-1'} h-full`}>
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
                                        compact={compact}
                                        roomyStemSpacing={roomyStemSpacing}
                                        onLongPress={onLongPressPalace ? () => onLongPressPalace(palace.position) : undefined}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
