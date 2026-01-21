/**
 * 八字柱位卡片组件
 * 从 BaziChart.tsx 提取的柱位显示组件
 */
import type { PillarData } from '../../../../types/bazi';
import { getElementColor } from '../../../../lib/xuan-bazi/maps/baziStyleMap';

// ============ 四柱详情卡片 ============

interface DetailedPillarCardProps {
    pillar: PillarData;
    isDayMaster?: boolean;
    shensha?: string[];
    genderLabel?: string;
}

export function DetailedPillarCard({
    pillar,
    isDayMaster = false,
    shensha = [],
    genderLabel = '日主'
}: DetailedPillarCardProps) {
    return (
        <div className={`h-full flex flex-col ${isDayMaster ? 'bg-primary/5' : ''}`}>
            <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30">
                <span className="text-xs text-muted-foreground">{pillar.label}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
                <span className="text-sm text-foreground">{pillar.tianganShiShen || genderLabel}</span>
            </div>
            <div className="h-14 flex items-center justify-center border-b border-border">
                <span
                    className="text-3xl font-display font-semibold"
                    style={{ color: getElementColor(pillar.tiangan) }}
                >
                    {pillar.tiangan}
                </span>
            </div>
            <div className="h-14 flex items-center justify-center border-b border-border">
                <span
                    className="text-3xl font-display font-semibold"
                    style={{ color: getElementColor(pillar.dizhi) }}
                >
                    {pillar.dizhi}
                </span>
            </div>
            <div className="min-h-[90px] p-2 border-b border-border flex flex-col justify-start gap-1">
                {pillar.zanggan.map((item, index) => (
                    <div key={`${item.gan}-${index}`} className="flex items-center justify-center gap-1 text-sm">
                        <span className="font-medium" style={{ color: getElementColor(item.gan) }}>
                            {item.gan}
                        </span>
                        <span className="text-muted-foreground">{item.shiShen}</span>
                    </div>
                ))}
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
                <span className="text-sm text-foreground">{pillar.diShi}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
                <span className="text-sm text-foreground">{pillar.ziZuo}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
                <span className="text-sm text-muted-foreground">{pillar.kongWang}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
                <span className="text-sm text-muted-foreground">{pillar.naYin}</span>
            </div>
            <div className="flex-1 p-2 flex flex-col items-center justify-start gap-2 min-h-[100px]">
                {shensha.map((s, i) => (
                    <span key={i} className="text-xs text-foreground text-center">{s}</span>
                ))}
            </div>
        </div>
    );
}

// ============ 流年/大运柱组件 ============

interface YunPillarProps {
    label: string;
    tiangan: string;
    dizhi: string;
    zhuxing?: string;
    zanggan?: { gan: string; shiShen: string; element: string }[];
    xingyun?: string;
    zizuo?: string;
    kongwang?: string;
    nayin?: string;
    isAccent?: boolean;
    shensha?: string[];
}

export function YunPillar({
    label,
    tiangan,
    dizhi,
    zhuxing = '',
    zanggan = [],
    xingyun = '',
    zizuo = '',
    kongwang = '',
    nayin = '',
    isAccent = false,
    shensha = [],
}: YunPillarProps) {
    return (
        <div className={`flex-1 border-r border-border last:border-r-0 flex flex-col ${isAccent ? 'bg-accent/5' : ''}`}>
            <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30">
                <span className={`text-xs ${isAccent ? 'text-foreground/70 font-medium' : 'text-muted-foreground'}`}>{label}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
                <span className="text-sm text-foreground">{zhuxing}</span>
            </div>
            <div className="h-14 flex items-center justify-center border-b border-border">
                <span
                    className="text-3xl font-display font-semibold"
                    style={{ color: getElementColor(tiangan) }}
                >
                    {tiangan}
                </span>
            </div>
            <div className="h-14 flex items-center justify-center border-b border-border">
                <span
                    className="text-3xl font-display font-semibold"
                    style={{ color: getElementColor(dizhi) }}
                >
                    {dizhi}
                </span>
            </div>
            <div className="min-h-[90px] p-2 border-b border-border flex flex-col justify-start gap-1">
                {zanggan.map((item, index) => (
                    <div key={`${item.gan}-${index}`} className="flex items-center justify-center gap-1 text-sm">
                        <span className="font-medium" style={{ color: getElementColor(item.gan) }}>
                            {item.gan}
                        </span>
                        <span className="text-muted-foreground">{item.shiShen}</span>
                    </div>
                ))}
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
                <span className="text-sm text-foreground">{xingyun}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
                <span className="text-sm text-foreground">{zizuo}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
                <span className="text-sm text-muted-foreground">{kongwang}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
                <span className="text-sm text-muted-foreground">{nayin}</span>
            </div>
            <div className="flex-1 p-2 flex flex-col items-center justify-start gap-2 min-h-[100px]">
                {shensha.map((s, i) => (
                    <span key={i} className="text-xs text-foreground text-center">{s}</span>
                ))}
            </div>
        </div>
    );
}
