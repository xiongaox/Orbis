/**
 * 案例学习专用奇门盘面组件 - 精简版
 * 基于原始 QimenChart，使用精简版 Header
 */
import { useState } from 'react';
import { LunarUtil } from 'lunar-typescript';
import type { PaiPanMethod } from '../../../../lib/csp-qimen/qimenService';
import type { GlobalPattern } from '../../../../lib/csp-qimen/patternDetector';

// 导入子组件
import CaseStudyQimenHeader from './CaseStudyQimenHeader';
import CaseStudyPalaceCell from './CaseStudyPalaceCell';
import { MA_XING_MAP } from '../../Qimen/utils/qimenInfoUtils';

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
}

interface CaseStudyQimenChartProps {
    palaces: QimenPalace[];
    selectedPalace: number | null;
    onSelectPalace: (position: number) => void;
    method?: PaiPanMethod;
    onMethodChange?: (method: PaiPanMethod) => void;
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
}

// 洛书九宫布局顺序
const LUOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

// 获取真实天干（甲遁六仪）
function getRealStem(stem: string, branch: string): string {
    if (stem !== '甲') return stem;
    const map: Record<string, string> = { '子': '戊', '戌': '己', '申': '庚', '午': '辛', '辰': '壬', '寅': '癸' };
    return map[branch] || stem;
}

export default function CaseStudyQimenChart({
    palaces,
    selectedPalace,
    onSelectPalace,
    method = 'zhirun',
    onMethodChange,
    onJuClick,
    header,
    globalPatterns = [],
    onPatternClick,
}: CaseStudyQimenChartProps) {
    const orderedPalaces = LUOSHU_ORDER.map(pos => palaces.find(p => p.position === pos)!);
    const [showChangSheng, setShowChangSheng] = useState(true);
    const [showShiShen, setShowShiShen] = useState(false);

    // 互斥切换逻辑
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
        <div className="flex flex-col h-full overflow-hidden items-center">
            <div className="flex flex-col flex-1 min-h-0 items-center w-full">
                {/* 精简版顶部信息栏 - 无边距 */}
                <div className="w-full flex-shrink-0">
                    <CaseStudyQimenHeader
                        header={header}
                        method={method}
                        onMethodChange={onMethodChange}
                        onJuClick={onJuClick}
                        globalPatterns={globalPatterns}
                        onPatternClick={onPatternClick}
                        showChangSheng={showChangSheng}
                        onToggleChangSheng={handleToggleChangSheng}
                        showShiShen={showShiShen}
                        onToggleShiShen={handleToggleShiShen}
                    />
                </div>

                {/* 九宫格盘式 - 保持正方形，居中显示 -> 改为居上显示 */}
                <div className="w-full flex-1 min-h-0 bg-card flex flex-col items-center justify-start pt-0">
                    <div className="grid grid-cols-3 gap-px w-full aspect-square bg-border border-b border-border">
                        {orderedPalaces.map((palace) => (
                            <div key={palace.position} className="bg-background overflow-hidden">
                                <CaseStudyPalaceCell
                                    palace={palace}
                                    isSelected={selectedPalace === palace.position}
                                    onSelect={() => onSelectPalace(palace.position)}
                                    showChangSheng={showChangSheng}
                                    showShiShen={showShiShen}
                                    isZhiFu={palace.xing === header.zhiFu}
                                    isZhiShi={palace.men === header.zhiShi}
                                    isDayStem={palace.tianPan === targetDayStem}
                                    isHourStem={palace.tianPan === targetHourStem}
                                    isJiGongDayStem={palace.jiGongTianPan === targetDayStem}
                                    isJiGongHourStem={palace.jiGongTianPan === targetHourStem}
                                />
                            </div>
                        ))}
                    </div>

                    {/* 新增：空亡与驿马信息 (五等分) - 顶满排版 */}
                    <div className="w-full bg-card border-t-0 border-border">
                        <div className="grid grid-cols-5 text-sm font-serif">
                            {/* 空亡行 */}
                            <div className="flex items-center justify-center py-4 bg-muted/30 border-r border-b border-border text-muted-foreground font-bold">空亡</div>
                            {['year', 'month', 'day', 'hour'].map((key) => {
                                const gz = header.siZhu[key as keyof typeof header.siZhu];
                                return (
                                    <div key={'kw-' + key} className="flex items-baseline justify-center py-4 border-r border-b border-border last:border-r-0">
                                        <span className="text-[14px] text-muted-foreground/70 mr-2">{
                                            key === 'year' ? '年' : key === 'month' ? '月' : key === 'day' ? '日' : '时'
                                        }</span>
                                        <span className="text-base font-medium text-foreground">
                                            {gz ? LunarUtil.getXunKong(gz) : '-'}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* 驿马行 */}
                            <div className="flex items-center justify-center py-4 bg-muted/30 border-r border-b border-border text-muted-foreground font-bold">驿马</div>
                            {['year', 'month', 'day', 'hour'].map((key) => {
                                const gz = header.siZhu[key as keyof typeof header.siZhu];
                                const zhi = gz ? gz[1] : '';
                                return (
                                    <div key={'ym-' + key} className="flex items-baseline justify-center py-4 border-r border-b border-border last:border-r-0">
                                        <span className="text-[14px] text-muted-foreground/70 mr-2">{
                                            key === 'year' ? '年' : key === 'month' ? '月' : key === 'day' ? '日' : '时'
                                        }</span>
                                        <span className="text-base font-medium text-foreground">
                                            {zhi ? (MA_XING_MAP[zhi] || '-') : '-'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
