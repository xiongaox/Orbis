/**
 * GanZhiLiuYiPanel - 应用源码层
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
 * - `default GanZhiLiuYiPanel`, `GanZhiLiuYiData`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `lucide-react`、内部模块 `baziGanZhiLiuYiUtil`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { Link2 } from 'lucide-react';

import type { GanZhiLiuYiResult } from '../../../lib/xuan-bazi/utils/baziGanZhiLiuYiUtil';

export interface GanZhiLiuYiData {
    /** 天干留意内容 */
    tianGan?: GanZhiLiuYiResult[];
    /** 地支留意内容 */
    diZhi?: GanZhiLiuYiResult[];
}

interface GanZhiLiuYiPanelProps {
    data?: GanZhiLiuYiData;
    className?: string;
    title?: string;
}

export default function GanZhiLiuYiPanel({
    data,
    className = '',
    title = '干支留意',
}: GanZhiLiuYiPanelProps) {
    // 如果没有任何数据，不渲染
    if ((!data?.tianGan || data.tianGan.length === 0) && (!data?.diZhi || data.diZhi.length === 0)) {
        return null;
    }

    const renderItems = (items?: GanZhiLiuYiResult[]) => {
        if (!items || items.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-x-2 gap-y-1">
                {items.map((item, index) => (
                    <span
                        key={index}
                        className={`${item.isDynamic ? 'font-bold text-primary/80' : 'text-muted-foreground'}`}
                    >
                        {item.description}
                        {index < items.length - 1 && <span className="text-border ml-2 font-normal">|</span>}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className={`flex flex-col ${className}`}>
            {/* 标题栏 - 和智能咨询参考一致 */}
            <div className="p-4 border-b border-border">
                <h2 className="font-display text-base font-medium text-foreground flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    {title}
                </h2>
            </div>
            {/* 内容区 */}
            <div className="p-4">
                {data?.tianGan && data.tianGan.length > 0 && (
                    <div className="flex items-start gap-2 text-sm mb-3 last:mb-0">
                        <span className="text-primary font-medium whitespace-nowrap flex-shrink-0 pt-0.5">
                            天干：
                        </span>
                        {renderItems(data.tianGan)}
                    </div>
                )}
                {data?.diZhi && data.diZhi.length > 0 && (
                    <div className="flex items-start gap-2 text-sm mt-2">
                        <span className="text-primary font-medium whitespace-nowrap flex-shrink-0 pt-0.5">
                            地支：
                        </span>
                        {renderItems(data.diZhi)}
                    </div>
                )}
            </div>
        </div>
    );
}
