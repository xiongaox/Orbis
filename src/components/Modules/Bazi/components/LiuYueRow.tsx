/**
 * 流月行组件 - 显示12个月份的流月
 */
import { getElementColor } from '../../../../lib/xuan-bazi/maps/baziStyleMap';
import { getShiShenAbbr, JIEQI_LABELS } from '../utils/dayunLiunianUtils';

interface LiuYueItem {
    index: number;
    month: number | string;
    tiangan?: string;
    dizhi?: string;
}

interface LiuYueRowProps {
    displayLiuYue: LiuYueItem[];
    selectedLiuYueIndex: number | null | undefined;
    dayMaster: string;
    onSelectLiuYue?: (index: number | null) => void;
}

export default function LiuYueRow({
    displayLiuYue,
    selectedLiuYueIndex,
    dayMaster,
    onSelectLiuYue,
}: LiuYueRowProps) {
    return (
        <div className="overflow-hidden">
            <div className="flex">
                {/* 左侧标题区 */}
                <div className="w-10 bg-secondary/30 border-r border-border flex items-center justify-center">
                    <div className="text-base text-muted-foreground font-medium leading-none flex flex-col items-center gap-1">
                        <span>流</span>
                        <span>月</span>
                    </div>
                </div>

                {/* 流月格子 */}
                <div className="flex-1 min-w-0 overflow-x-auto">
                    <div className="grid grid-cols-12 min-w-0 w-full">
                        {displayLiuYue.length > 0 ? (
                            displayLiuYue.map((item, idx) => {
                                const isSelected = selectedLiuYueIndex === item.index;
                                return (
                                    <div
                                        key={`liuyue-${idx}`}
                                        className={`min-w-0 p-3 border-r border-border last:border-r-0 cursor-pointer transition-colors hover:bg-primary/10 ${isSelected ? 'bg-primary/10' : ''}`}
                                        onClick={() => {
                                            const newIndex = item.index === selectedLiuYueIndex ? null : item.index;
                                            if (onSelectLiuYue) {
                                                onSelectLiuYue(newIndex);
                                            }
                                        }}
                                    >
                                        <div className="flex flex-col items-center text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="text-xs text-muted-foreground leading-snug">
                                                    {JIEQI_LABELS[item.index] || item.month}月
                                                </div>
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-baseline justify-center gap-x-1">
                                                    <span
                                                        className="font-display text-lg text-foreground leading-none"
                                                        style={{ color: item.tiangan ? getElementColor(item.tiangan) : 'inherit' }}
                                                    >
                                                        {item.tiangan || '-'}
                                                    </span>
                                                    <span className="text-base text-muted-foreground leading-none">
                                                        {item.tiangan ? getShiShenAbbr(dayMaster, item.tiangan) : ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline justify-center gap-x-1">
                                                    <span
                                                        className="font-display text-lg text-foreground leading-none"
                                                        style={{ color: item.dizhi ? getElementColor(item.dizhi) : 'inherit' }}
                                                    >
                                                        {item.dizhi || '-'}
                                                    </span>
                                                    <span className="text-base text-muted-foreground leading-none">
                                                        {item.dizhi ? getShiShenAbbr(dayMaster, item.dizhi) : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            // 空状态占位
                            Array.from({ length: 12 }).map((_, idx) => (
                                <div
                                    key={`placeholder-${idx}`}
                                    className="min-w-0 p-3 border-r border-border last:border-r-0"
                                >
                                    <div className="flex flex-col items-center text-center">
                                        <div className="text-xs text-muted-foreground leading-snug">-</div>
                                        <div className="mt-2 space-y-1">
                                            <div className="font-display text-lg text-foreground leading-none">-</div>
                                            <div className="font-display text-lg text-foreground leading-none">-</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
