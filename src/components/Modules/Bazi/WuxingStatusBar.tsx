/**
 * 五行旺衰信息条组件
 * 显示五行旺相休囚死状态、当前年龄和胎命身开关
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
        <div className="bg-card rounded-xl border border-border px-4 py-2.5 flex items-center justify-between text-sm">
            {/* 左侧：五行旺衰状态 */}
            <div className="flex items-center gap-1">
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
                            <span className="text-border mx-2">|</span>
                        )}
                    </div>
                ))}
            </div>

            {/* 右侧：年龄和按钮组 */}
            <div className="flex items-center gap-3">
                {/* 年龄显示 */}
                {currentAge !== null && (
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
                        px-3 py-1 rounded-lg text-xs font-medium transition-all border
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
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-all border bg-muted text-foreground border-border hover:bg-muted/80"
                >
                    当前流年
                </button>

                {/* 隐藏详情开关 */}
                <button
                    type="button"
                    onClick={onToggleHideDetails}
                    className={`
                        px-3 py-1 rounded-lg text-xs font-medium transition-all border
                        ${hideDetails
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
