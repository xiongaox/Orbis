/**
 * PillarCards - 应用源码层
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
 * - `DetailedPillarCard`, `YunPillar`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `bazi`、内部模块 `baziStyleMap`、内部模块 `useIsPadLandscape`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
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
                        className="w-4 h-4 shrink-0 flex items-center justify-center rounded text-[10px] leading-none text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors focus:outline-none focus-ring"
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
                        className="w-4 h-4 shrink-0 flex items-center justify-center rounded text-[10px] leading-none text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors focus:outline-none focus-ring"
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
                            // 移动端窄列：四字神煞固定折成两字两行（限制为两字宽度，避免出现 3+1 断行）
                            <span key={i} className={`${isMobileLayout ? 'text-[11px] max-w-[26px]' : 'text-xs'} text-foreground text-center`}>{s}</span>
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
        <div className={`flex-1 ${isMobileLayout ? 'min-w-[44px]' : 'min-w-[56px]'} border-r border-border last:border-r-0 flex flex-col ${isAccent ? 'bg-accent/5' : ''}`}>
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
                            // 移动端窄列：四字神煞固定折成两字两行（限制为两字宽度，避免出现 3+1 断行）
                            <span key={i} className={`${isMobileLayout ? 'text-[11px] max-w-[26px]' : 'text-xs'} text-foreground text-center`}>{s}</span>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
