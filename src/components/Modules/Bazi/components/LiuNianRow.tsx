/**
 * 流年行组件 - 显示流年和小运列表
 */
import { getElementColor } from '../../../../lib/xuan-bazi/maps/baziStyleMap';
import { getShiShenAbbr, checkLiunianStatus } from '../utils/dayunLiunianUtils';

interface LiuNianItem {
    year: number;
    tiangan: string;
    dizhi: string;
    dayunIndex?: number;
}

interface XiaoYunItem {
    ganZhi?: string;
    dayunIndex?: number;
}

interface ActiveHint {
    year: number;
    message: string;
    type: 'danger' | 'warning' | 'success';
}

interface PillarItem {
    tiangan?: string;
    dizhi?: string;
}

interface DayunItem {
    tiangan?: string;
    dizhi?: string;
}

interface LiuNianRowProps {
    displayLiuNian: LiuNianItem[];
    displayXiaoYun: XiaoYunItem[];
    selectedLiuNianYear: number | null;
    currentYear: number;
    dayMaster: string;
    activeDaYunObject: DayunItem | undefined;
    pillars: PillarItem[];
    activeHint: ActiveHint | null;
    onLiuNianClick: (year: number) => void;
    onHintClick: (hint: ActiveHint | null) => void;
}

export default function LiuNianRow({
    displayLiuNian,
    displayXiaoYun,
    selectedLiuNianYear,
    currentYear,
    dayMaster,
    activeDaYunObject,
    pillars,
    activeHint,
    onLiuNianClick,
    onHintClick,
}: LiuNianRowProps) {
    return (
        <div className="border-b border-border">
            <div className="flex">
                {/* 左侧标题区 */}
                <div className="w-10 bg-secondary/30 border-r border-border flex items-center justify-center">
                    <div className="flex flex-col items-center justify-between h-full py-3">
                        <div className="text-base text-foreground/70 font-medium leading-none flex flex-col items-center gap-1">
                            <span>流</span>
                            <span>年</span>
                        </div>
                        <div className="text-base text-foreground/70 font-medium leading-none flex flex-col items-center gap-1">
                            <span>小</span>
                            <span>运</span>
                        </div>
                    </div>
                </div>

                {/* 流年格子 */}
                <div className="flex-1 min-w-0 overflow-x-auto">
                    <div className="grid grid-cols-10 min-w-0 w-full relative">
                        {displayLiuNian.map((item, idx) => {
                            const xiaoyun = displayXiaoYun[idx];
                            const isCurrentYear = item.year === currentYear;
                            const isSelected = item.year === selectedLiuNianYear;
                            const isLastColumn = idx === 9;

                            // 计算特殊状态
                            const status = checkLiunianStatus(item, activeDaYunObject, pillars);
                            const isHintActive = activeHint?.year === item.year;

                            // 动态颜色类
                            let dotColorClass = '';
                            if (status) {
                                switch (status.type) {
                                    case 'danger':
                                        dotColorClass = isHintActive ? 'bg-red-500 border-red-500' : 'border-red-500 hover:bg-red-500';
                                        break;
                                    case 'warning':
                                        dotColorClass = isHintActive ? 'bg-yellow-500 border-yellow-500' : 'border-yellow-500 hover:bg-yellow-500';
                                        break;
                                    case 'success':
                                        dotColorClass = isHintActive ? 'bg-green-500 border-green-500' : 'border-green-500 hover:bg-green-500';
                                        break;
                                }
                            }

                            return (
                                <div
                                    key={item.year}
                                    className={`relative min-w-0 p-3 border-r border-border cursor-pointer transition-colors hover:bg-primary/10 ${isLastColumn ? '!border-r-0' : ''} ${isSelected ? 'bg-primary/10' : isCurrentYear ? 'bg-primary/5' : ''}`}
                                    onClick={() => onLiuNianClick(item.year)}
                                >
                                    <div className="flex flex-col items-center text-center">
                                        <div className="text-sm text-foreground leading-snug">{item.year}</div>
                                        <div className="mt-2 space-y-1">
                                            <div className="flex items-baseline justify-center gap-x-1">
                                                <span
                                                    className="font-display text-lg text-foreground leading-none"
                                                    style={{ color: getElementColor(item.tiangan) }}
                                                >
                                                    {item.tiangan}
                                                </span>
                                                <span className="text-base text-muted-foreground leading-none">
                                                    {getShiShenAbbr(dayMaster, item.tiangan)}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline justify-center gap-x-1">
                                                <span
                                                    className="font-display text-lg text-foreground leading-none"
                                                    style={{ color: getElementColor(item.dizhi) }}
                                                >
                                                    {item.dizhi}
                                                </span>
                                                <span className="text-base text-muted-foreground leading-none">
                                                    {getShiShenAbbr(dayMaster, item.dizhi)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-xs text-muted-foreground leading-none">
                                            {xiaoyun?.ganZhi || '-'}
                                        </div>
                                    </div>

                                    {/* 提示红点 */}
                                    {status && (
                                        <div
                                            role="button"
                                            className="absolute bottom-1 right-1 cursor-pointer z-10 p-1 group"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (activeHint?.year === item.year) {
                                                    onHintClick(null);
                                                } else {
                                                    onHintClick({ year: item.year, message: status.message, type: status.type });
                                                }
                                            }}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full border transition-colors ${dotColorClass}`} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 提示栏 */}
            {activeHint && (
                <div
                    className={`w-full px-4 py-2 border-t flex items-center gap-2 animate-in slide-in-from-top-2 duration-200
            ${activeHint.type === 'danger' ? 'bg-red-500/10 border-red-500/20' :
                            activeHint.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                                'bg-green-500/10 border-green-500/20'}`}
                >
                    <span className="text-xs text-muted-foreground">流年提示：</span>
                    <span
                        className={`text-xs font-medium 
              ${activeHint.type === 'danger' ? 'text-red-500' :
                                activeHint.type === 'warning' ? 'text-yellow-500' :
                                    'text-green-500'}`}
                    >
                        {activeHint.message}
                    </span>
                </div>
            )}
        </div>
    );
}
