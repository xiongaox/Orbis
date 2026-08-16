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
    onLongPressPalace,
}: QimenChartProps) {
    const orderedPalaces = LUOSHU_ORDER.map(pos => palaces.find(p => p.position === pos)!);
    const showChangSheng = controlledShowChangSheng ?? false;
    const showShiShen = controlledShowShiShen ?? false;
    const showPalaceMeta = controlledShowPalaceMeta ?? false;

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

        </div>
    );
}
