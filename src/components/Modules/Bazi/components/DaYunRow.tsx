/**
 * DaYunRow - 应用源码层
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
 * - `default DaYunRow`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `baziStyleMap`、内部模块 `dayunLiunianUtils`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
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
    isMobileLayout?: boolean;
}

export default function DaYunRow({
    displayDaYun,
    activeDaYunIndex,
    dayMaster,
    daYunPage,
    totalDaYunPages,
    onDaYunClick,
    onPageChange,
    isMobileLayout = false,
}: DaYunRowProps) {
    return (
        <div className="border-b border-border">
            <div className="flex items-stretch">
                {/* 左侧标题区 */}
                <div className={`${isMobileLayout ? 'w-7' : 'w-10'} bg-secondary/30 border-r border-border flex flex-col items-center justify-center gap-0.5`}>
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
                    <div className={`${isMobileLayout ? 'text-sm' : 'text-base'} text-foreground/70 font-medium leading-none flex flex-col items-center gap-0.5`}>
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
                                    className={`min-w-0 ${isMobileLayout ? 'px-0.5 py-1.5' : 'p-3'} border-r border-border last:border-r-0 cursor-pointer transition-colors hover:bg-primary/10 h-full flex flex-col justify-center ${isActive ? 'bg-primary/5' : ''}`}
                                    onClick={() => onDaYunClick(item.index)}
                                >
                                    <div className="flex flex-col items-center text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={`${isMobileLayout ? 'text-xs' : 'text-sm'} text-muted-foreground leading-snug whitespace-nowrap`}>
                                                {item.startAge}岁
                                            </div>
                                            <div className={`${isMobileLayout ? 'text-xs' : 'text-sm'} text-muted-foreground leading-snug whitespace-nowrap`}>
                                                {item.startYear}
                                            </div>
                                        </div>
                                        <div className={`${isMobileLayout ? 'mt-1.5 space-y-0.5' : 'mt-3 space-y-1'}`}>
                                            <div className={`flex items-baseline justify-center ${isMobileLayout ? 'gap-x-0' : 'gap-x-1'} whitespace-nowrap`}>
                                                <span
                                                    className={`font-display ${isMobileLayout ? 'text-base' : 'text-lg'} text-foreground leading-none`}
                                                    style={{ color: getElementColor(item.tiangan) }}
                                                >
                                                    {item.tiangan}
                                                </span>
                                                <span className={`${isMobileLayout ? 'text-xs' : 'text-base'} text-muted-foreground leading-none`}>
                                                    {getShiShenAbbr(dayMaster, item.tiangan)}
                                                </span>
                                            </div>
                                            <div className={`flex items-baseline justify-center ${isMobileLayout ? 'gap-x-0' : 'gap-x-1'} whitespace-nowrap`}>
                                                <span
                                                    className={`font-display ${isMobileLayout ? 'text-base' : 'text-lg'} text-foreground leading-none`}
                                                    style={{ color: getElementColor(item.dizhi) }}
                                                >
                                                    {item.dizhi}
                                                </span>
                                                <span className={`${isMobileLayout ? 'text-xs' : 'text-base'} text-muted-foreground leading-none`}>
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
