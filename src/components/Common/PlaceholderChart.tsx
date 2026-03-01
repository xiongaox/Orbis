/**
 * PlaceholderChart - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：提供跨模块的通用 UI 组件
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default PlaceholderChart`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `types`、内部模块 `chartConfig`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import type { ChartType } from '../../types';
import { chartMeta } from '../../utils/chartConfig';

interface PlaceholderChartProps {
    chart: ChartType;
}

export default function PlaceholderChart({ chart }: PlaceholderChartProps) {
    const Icon = chartMeta[chart].icon;
    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-card rounded-xl border border-border p-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-display text-lg font-medium text-foreground">{chartMeta[chart].title}</h2>
                        <p className="text-sm text-muted-foreground">示例排盘内容</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
