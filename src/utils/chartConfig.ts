/**
 * 排盘类型配置
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
