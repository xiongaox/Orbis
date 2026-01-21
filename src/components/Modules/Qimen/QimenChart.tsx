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
    header,
    globalPatterns = [],
    onPatternClick,
}: QimenChartProps) {
    const orderedPalaces = LUOSHU_ORDER.map(pos => palaces.find(p => p.position === pos)!);
    const [showChangSheng, setShowChangSheng] = useState(true);

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
                            globalPatterns={globalPatterns}
                            onPatternClick={onPatternClick}
                            showChangSheng={showChangSheng}
                            onToggleChangSheng={() => setShowChangSheng(!showChangSheng)}
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
                                        isZhiFu={palace.xing === header.zhiFu}
                                        isZhiShi={palace.men === header.zhiShi}
                                        isDayStem={palace.tianPan === targetDayStem}
                                        isHourStem={palace.tianPan === targetHourStem}
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
