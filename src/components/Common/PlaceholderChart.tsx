/**
 * 占位组件 - 用于尚未开发的模块
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
