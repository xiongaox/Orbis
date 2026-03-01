/**
 * WuxingStatusBar - 应用源码层
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
 * - `default WuxingStatusBar`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `wuxingStatusUtil`、内部模块 `bazi`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useMemo } from 'react';
import { calculateWuxingStatus } from '../../../lib/xuan-bazi/utils/wuxingStatusUtil';
import type { BaziApiResponse } from '../../../types/bazi';

interface WuxingStatusBarProps {
    baziData: BaziApiResponse | null;
    selectedLiuNianYear: number | null;
    currentYear?: number;
    showTaiMingShen: boolean;
    onToggleTaiMingShen: () => void;
    hideDetails: boolean;
    onToggleHideDetails: () => void;
    onGoToCurrentYear: () => void;
    isMobileLayout?: boolean;
    isPadLandscape?: boolean;
}

export default function WuxingStatusBar({
    baziData,
    selectedLiuNianYear,
    currentYear = new Date().getFullYear(),
    showTaiMingShen,
    onToggleTaiMingShen,
    hideDetails,
    onToggleHideDetails,
    onGoToCurrentYear,
    isMobileLayout = false,
    isPadLandscape = false,
}: WuxingStatusBarProps) {
    // 获取月支
    const monthBranch = baziData?.pillars?.[1]?.dizhi || '';

    // 计算五行旺衰状态
    const wuxingStatus = useMemo(() => {
        return calculateWuxingStatus(monthBranch);
    }, [monthBranch]);

    // 计算当前年龄
    const currentAge = useMemo(() => {
        if (!baziData?.liuNian) return null;

        const targetYear = selectedLiuNianYear || currentYear;
        const liuNian = baziData.liuNian.find(ln => ln.year === targetYear);
        return liuNian?.age || null;
    }, [baziData?.liuNian, selectedLiuNianYear, currentYear]);

    if (!baziData) return null;

    return (
        <div className={`bg-card rounded-xl border border-border text-sm ${isMobileLayout ? 'px-3 py-2 space-y-2' : 'px-4 py-2.5 flex items-center justify-between'
            }`}>
            {/* 五行旺衰状态 + 年龄 */}
            <div className={`flex items-center ${isMobileLayout ? 'justify-between' : isPadLandscape ? 'gap-1.5' : 'gap-3'}`}>
                <div className={`flex items-center ${isMobileLayout ? 'gap-1.5 text-xs' : isPadLandscape ? 'gap-1 text-xs' : 'gap-3'}`}>
                    {wuxingStatus.map((item, index) => (
                        <div key={item.element} className="flex items-center">
                            <span
                                className="font-medium"
                                style={{ color: item.color }}
                            >
                                {item.element}
                            </span>
                            <span className="text-muted-foreground">
                                {item.state}
                            </span>
                            {index < wuxingStatus.length - 1 && (
                                <span className={`text-border ${isMobileLayout ? 'ml-1.5' : isPadLandscape ? 'ml-1' : 'ml-3'}`}>|</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* 移动端：年龄显示在五行同行 */}
                {isMobileLayout && currentAge !== null && (
                    <div className="text-xs text-foreground">
                        <span className="text-muted-foreground">当前</span>
                        <span className="font-medium text-foreground mx-0.5">{currentAge}</span>
                        <span className="text-muted-foreground">岁</span>
                    </div>
                )}
            </div>

            {/* 右侧：按钮组 */}
            <div className={`flex items-center ${isMobileLayout ? 'gap-1.5' : isPadLandscape ? 'gap-1.5' : 'gap-3'}`}>
                {/* 桌面端年龄显示 */}
                {!isMobileLayout && currentAge !== null && (
                    <div className="text-foreground">
                        <span className="text-muted-foreground">当前</span>
                        <span className="font-medium text-foreground mx-1">{currentAge}</span>
                        <span className="text-muted-foreground">岁</span>
                        {selectedLiuNianYear && (
                            <span className="text-muted-foreground/70 ml-1">
                                ({selectedLiuNianYear}年)
                            </span>
                        )}
                    </div>
                )}

                {/* 胎命身开关 */}
                <button
                    type="button"
                    onClick={onToggleTaiMingShen}
                    className={`
                        ${isMobileLayout ? 'flex-1 h-7 text-[12px]' : isPadLandscape ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'} rounded-lg font-medium transition-all border
                        ${showTaiMingShen
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-foreground border-border hover:bg-muted/80'
                        }
                    `}
                >
                    胎命身
                </button>

                {/* 当前流年按钮 */}
                <button
                    type="button"
                    onClick={onGoToCurrentYear}
                    className={`${isMobileLayout ? 'flex-1 h-7 text-[12px]' : isPadLandscape ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'} rounded-lg font-medium transition-all border bg-muted text-foreground border-border hover:bg-muted/80`}
                >
                    当前流年
                </button>

                {/* 隐藏详情开关 */}
                <button
                    type="button"
                    onClick={onToggleHideDetails}
                    className={`
                        ${isMobileLayout ? 'flex-1 h-7 text-[12px]' : isPadLandscape ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'} rounded-lg font-medium transition-all border
                        ${(isMobileLayout ? !hideDetails : hideDetails)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-foreground border-border hover:bg-muted/80'
                        }
                    `}
                >
                    {hideDetails ? '显示详情' : '隐藏详情'}
                </button>
            </div>
        </div>
    );
}
