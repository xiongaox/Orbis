/**
 * QimenChart - 重构后的精简版本
 * 奇门遁甲排盘九宫图
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
}: QimenChartProps) {
    const orderedPalaces = LUOSHU_ORDER.map(pos => palaces.find(p => p.position === pos)!);
    const [showChangSheng, setShowChangSheng] = useState(false);
    const [showShiShen, setShowShiShen] = useState(false);
    const [showPalaceMeta, setShowPalaceMeta] = useState(false);

    // 互斥切换逻辑：开启长生则关闭十神，开启十神则关闭长生
    const handleToggleChangSheng = () => {
        if (!showChangSheng) {
            setShowChangSheng(true);
            setShowShiShen(false);
        } else {
            setShowChangSheng(false);
        }
    };

    const handleToggleShiShen = () => {
        if (!showShiShen) {
            setShowShiShen(true);
            setShowChangSheng(false);
        } else {
            setShowShiShen(false);
        }
    };

    // 高亮计算
    const targetDayStem = getRealStem(header.siZhu.day[0], header.siZhu.day[1]);
    const targetHourStem = getRealStem(header.siZhu.hour[0], header.siZhu.hour[1]);

    return (
        <div className="flex flex-col h-full overflow-hidden items-center p-2">
            <div className="flex flex-col flex-1 min-h-0 items-center w-full">
                <div className="flex flex-col h-full items-center max-w-2xl">
                    {/* 顶部信息栏 */}
                    <div className="w-full flex-shrink-0 mb-2">
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
                            showChangSheng={showChangSheng}
                            onToggleChangSheng={handleToggleChangSheng}
                            showShiShen={showShiShen}
                            onToggleShiShen={handleToggleShiShen}
                            showPalaceMeta={showPalaceMeta}
                            onTogglePalaceMeta={() => setShowPalaceMeta(!showPalaceMeta)}
                        />
                    </div>

                    {/* 九宫格盘式 */}
                    <div className="flex-1 min-h-0 w-full">
                        <div className="w-full h-full bg-card rounded-xl border border-border p-2">
                            <div className="grid grid-cols-3 gap-1 h-full">
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
