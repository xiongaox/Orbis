import type { SanYuanState } from '../hooks/useSanYuanState';

interface SanYuanInfoBarProps {
    state: SanYuanState;
}

export default function SanYuanInfoBar({ state }: SanYuanInfoBarProps) {
    const { chart } = state;
    const { header } = chart;

    return (
        <div className="w-full max-w-[640px] mx-auto mb-0 shrink-0">
            <div className="flex items-center justify-between bg-card/40 border border-border/50 rounded-xl px-4 py-3">
                <div>
                    <div className="text-base font-bold text-primary">
                        {header.directionLabel} · {header.yun}运{header.panTypeLabel}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        大玄空按{header.yuanPhaseLabel}起星；点击九宫查看数字来源。
                    </div>
                </div>

                <div className="flex border border-border/50 rounded-lg overflow-hidden bg-background/30 shadow-sm">
                    <div className="flex flex-col items-center justify-center gap-1 px-3 py-2 border-r border-border/50 min-w-[68px]">
                        <span className="text-lg font-bold text-primary leading-none">{header.mountainStart}</span>
                        <span className="text-[10px] text-muted-foreground leading-none">山星入中</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 px-3 py-2 border-r border-border/50 min-w-[68px]">
                        <span className="text-lg font-bold text-primary leading-none">{header.facingStart}</span>
                        <span className="text-[10px] text-muted-foreground leading-none">向星入中</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[68px]">
                        <span className="text-lg font-bold text-primary leading-none">{header.yun}</span>
                        <span className="text-[10px] text-muted-foreground leading-none">运入中</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
