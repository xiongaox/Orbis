/**
 * chartConfig - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：提供纯函数工具和辅助模块
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `ChartMeta`, `chartMeta`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `types`
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
import type { ChartType } from '../types';

export interface ChartMeta {
    title: string;
    icon: ComponentType<{ className?: string }>;
}

export const chartMeta: Record<ChartType, ChartMeta> = {
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
