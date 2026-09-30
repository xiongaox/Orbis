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
 * - 上游依赖：内部模块 `types`、外部依赖 `lucide-react`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import type { ComponentType } from 'react';
import {
    BookOpen,
    Calendar,
    Compass,
    Flower2,
    Grid3X3,
    Moon,
    Sparkles,
    Star,
    Sun,
} from 'lucide-react';
import type { ChartType } from '../../types';

const chartMeta: Record<ChartType, { title: string; icon: ComponentType<{ className?: string }> }> = {
    bazi: { title: '八字', icon: Compass },
    qimen: { title: '奇门', icon: Grid3X3 },
    liuyao: { title: '六爻', icon: BookOpen },
    ziwei: { title: '紫薇', icon: Star },
    daliuren: { title: '大六壬', icon: Moon },
    xiaoliuren: { title: '案例学习', icon: Sun },
    meihua: { title: '梅花', icon: Flower2 },
    wannianli: { title: '万年历', icon: Calendar },
    sanyuan: { title: '三元天星', icon: Sparkles },
};

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
