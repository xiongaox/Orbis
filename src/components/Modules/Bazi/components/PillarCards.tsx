import type { PillarData } from '../../../../types/bazi';
import { getElementColor } from '../../../../lib/xuan-bazi/maps/baziStyleMap';

// ============ 四柱详情卡片 ============

interface DetailedPillarCardProps {
    pillar: PillarData;
    isDayMaster?: boolean;
    shensha?: string[];
    genderLabel?: string;
    isMobileLayout?: boolean;
    hideDetails?: boolean;
    // 时柱专属：切换上一/下一时辰（-1 上一时辰，+1 下一时辰）
    onShiftHour?: (delta: 1 | -1) => void;
}

export function DetailedPillarCard({
    pillar,
    isDayMaster = false,
    shensha = [],
    genderLabel = '日主',
    isMobileLayout = false,
    hideDetails = false,
    onShiftHour,
}: DetailedPillarCardProps) {
    return (
        <div className={`h-full flex flex-col ${isDayMaster ? 'bg-primary/5' : ''}`}>
            <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30 gap-0.5">
                {onShiftHour && (
                    <button
                        type="button"
                        onClick={() => onShiftHour(-1)}
                        title="上一时辰"
                        aria-label="上一时辰"
                        className="w-4 h-4 shrink-0 flex items-center justify-center text-[10px] leading-none text-muted-foreground hover:text-primary active:text-primary transition-colors focus:outline-none focus-ring"
                    >
                        ◀
                    </button>
                )}
                <span className="text-xs text-muted-foreground shrink-0">{pillar.label}</span>
                {onShiftHour && (
                    <button
                        type="button"
                        onClick={() => onShiftHour(1)}
                        title="下一时辰"
                        aria-label="下一时辰"
                        className="w-4 h-4 shrink-0 flex items-center justify-center text-[10px] leading-none text-muted-foreground hover:text-primary active:text-primary transition-colors focus:outline-none focus-ring"
                    >
                        ▶
                    </button>
                )}
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
            <div className={`${isMobileLayout ? 'h-[72px]' : 'h-[90px]'} py-2 px-1 ${!(isMobileLayout && hideDetails) ? 'border-b border-border' : ''} flex flex-col justify-start gap-1`}>
                {pillar.zanggan.map((item, index) => (
                    <div key={`${item.gan}-${index}`} className={`flex items-center justify-center whitespace-nowrap ${isMobileLayout ? 'gap-0 text-xs' : 'gap-1 text-sm'}`}>
                        <span className="font-medium" style={{ color: getElementColor(item.gan) }}>
                            {item.gan}
                        </span>
                        <span className="text-muted-foreground">{item.shiShen}</span>
                    </div>
                ))}
            </div>
            {!(isMobileLayout && hideDetails) && (
                <>
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
                    <div className={`flex-1 ${isMobileLayout ? 'py-1 px-0.5 gap-1' : 'px-1 py-1 gap-2'} flex flex-col items-center justify-start min-h-[100px]`}>
                        {shensha.map((s, i) => (
                            <span key={i} className={`${isMobileLayout ? 'text-[11px]' : 'text-xs'} text-foreground text-center`}>{s}</span>
                        ))}
                    </div>
                </>
            )}
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
    isMobileLayout?: boolean;
    hideDetails?: boolean;
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
    isMobileLayout = false,
    hideDetails = false,
}: YunPillarProps) {
    return (
        // min-w-0：与四柱同规则，任何宽度下由 flex-1 严格等分，勿改回固定 min-w 下限
        <div className={`flex-1 min-w-0 border-r border-border last:border-r-0 flex flex-col ${isAccent ? 'bg-accent/5' : ''}`}>
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
            <div className={`${isMobileLayout ? 'h-[72px]' : 'h-[90px]'} py-2 px-1 ${!(isMobileLayout && hideDetails) ? 'border-b border-border' : ''} flex flex-col justify-start gap-1`}>
                {zanggan.map((item, index) => (
                    <div key={`${item.gan}-${index}`} className={`flex items-center justify-center whitespace-nowrap ${isMobileLayout ? 'gap-0 text-xs' : 'gap-1 text-sm'}`}>
                        <span className="font-medium" style={{ color: getElementColor(item.gan) }}>
                            {item.gan}
                        </span>
                        <span className="text-muted-foreground">{item.shiShen}</span>
                    </div>
                ))}
            </div>
            {!(isMobileLayout && hideDetails) && (
                <>
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
                    <div className={`flex-1 ${isMobileLayout ? 'py-1 px-0.5 gap-1' : 'px-1 py-1 gap-2'} flex flex-col items-center justify-start min-h-[100px]`}>
                        {shensha.map((s, i) => (
                            <span key={i} className={`${isMobileLayout ? 'text-[11px]' : 'text-xs'} text-foreground text-center`}>{s}</span>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
