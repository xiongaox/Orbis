/**
 * 大运行组件 - 显示大运列表
 */
import { getElementColor } from '../../../../lib/xuan-bazi/maps/baziStyleMap';
import { getShiShenAbbr } from '../utils/dayunLiunianUtils';

interface DaYunItem {
    index: number;
    tiangan: string;
    dizhi: string;
    startAge: number;
    startYear: number;
}

interface DaYunRowProps {
    displayDaYun: DaYunItem[];
    activeDaYunIndex: number;
    dayMaster: string;
    daYunPage: number;
    totalDaYunPages: number;
    onDaYunClick: (index: number) => void;
    onPageChange: (page: number) => void;
}

export default function DaYunRow({
    displayDaYun,
    activeDaYunIndex,
    dayMaster,
    daYunPage,
    totalDaYunPages,
    onDaYunClick,
    onPageChange,
}: DaYunRowProps) {
    return (
        <div className="border-b border-border">
            <div className="flex items-stretch">
                {/* 左侧标题区 */}
                <div className="w-10 bg-secondary/30 border-r border-border flex flex-col items-center justify-center gap-0.5">
                    {/* 上一页按钮 */}
                    {totalDaYunPages > 1 && (
                        <button
                            onClick={() => onPageChange(Math.max(0, daYunPage - 1))}
                            disabled={daYunPage === 0}
                            className={`w-5 h-4 flex items-center justify-center rounded text-[10px] transition-colors
                ${daYunPage === 0
                                    ? 'text-muted-foreground/30 cursor-not-allowed'
                                    : 'text-muted-foreground hover:bg-primary/20 hover:text-primary cursor-pointer'}`}
                            title={daYunPage > 0 ? `上一页 (${daYunPage}/${totalDaYunPages})` : '已是第一页'}
                        >
                            ▲
                        </button>
                    )}

                    {/* 大运标题 */}
                    <div className="text-base text-foreground/70 font-medium leading-none flex flex-col items-center gap-0.5">
                        <span>大</span>
                        <span>运</span>
                    </div>

                    {/* 页码提示 */}
                    {totalDaYunPages > 1 && (
                        <div className="text-[9px] text-muted-foreground/60 leading-none">
                            {daYunPage + 1}/{totalDaYunPages}
                        </div>
                    )}

                    {/* 下一页按钮 */}
                    {totalDaYunPages > 1 && (
                        <button
                            onClick={() => onPageChange(Math.min(totalDaYunPages - 1, daYunPage + 1))}
                            disabled={daYunPage >= totalDaYunPages - 1}
                            className={`w-5 h-4 flex items-center justify-center rounded text-[10px] transition-colors
                ${daYunPage >= totalDaYunPages - 1
                                    ? 'text-muted-foreground/30 cursor-not-allowed'
                                    : 'text-muted-foreground hover:bg-primary/20 hover:text-primary cursor-pointer'}`}
                            title={daYunPage < totalDaYunPages - 1 ? `下一页 (${daYunPage + 2}/${totalDaYunPages})` : '已是最后一页'}
                        >
                            ▼
                        </button>
                    )}
                </div>

                {/* 大运格子 */}
                <div className="flex-1 min-w-0 overflow-x-auto flex flex-col">
                    <div className="grid grid-cols-10 min-w-0 w-full flex-1">
                        {displayDaYun.map((item) => {
                            const isActive = item.index === activeDaYunIndex;
                            return (
                                <div
                                    key={`dayun-${item.index}`}
                                    className={`min-w-0 p-3 border-r border-border last:border-r-0 cursor-pointer transition-colors hover:bg-primary/10 h-full flex flex-col justify-center ${isActive ? 'bg-primary/5' : ''}`}
                                    onClick={() => onDaYunClick(item.index)}
                                >
                                    <div className="flex flex-col items-center text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="text-sm text-muted-foreground leading-snug">
                                                {item.startAge}岁
                                            </div>
                                            <div className="text-sm text-muted-foreground leading-snug">
                                                {item.startYear}
                                            </div>
                                        </div>
                                        <div className="mt-3 space-y-1">
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
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
