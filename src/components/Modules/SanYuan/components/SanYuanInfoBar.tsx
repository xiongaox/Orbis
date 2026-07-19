import { DIRECTIONS } from '../../../../lib/sanyuan';
import type { PanType, YuanPhase } from '../../../../lib/sanyuan';
import CustomSelect from '../../../UI/CustomSelect';
import type { SanYuanState } from '../hooks/useSanYuanState';

const YUN_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((yun) => ({ label: `${yun}运`, value: yun }));
const PAN_TYPE_OPTIONS: { label: string; value: PanType }[] = [
    { label: '下卦（9°内）', value: 'xia' },
    { label: '替卦（9°外）', value: 'ti' },
];
const YUAN_PHASE_OPTIONS: { label: string; value: YuanPhase }[] = [
    { label: '上元', value: 'upper' },
    { label: '下元', value: 'lower' },
];

interface SanYuanInfoBarProps {
    state: SanYuanState;
}

export default function SanYuanInfoBar({ state }: SanYuanInfoBarProps) {
    const {
        chart,
        draft,
        isYuanPhaseChoiceRequired,
        updateDirection,
        updateYun,
        updatePanType,
        updateYuanPhase,
        submitChart,
    } = state;
    const { header } = chart;

    return (
        <div className="flex flex-col gap-3 w-full max-w-[640px] mx-auto mb-0 shrink-0">
            <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                    <div className="flex flex-col gap-1.5 shrink-0">
                        <span className="text-sm text-muted-foreground">山向</span>
                        <CustomSelect
                            options={DIRECTIONS.map(({ id, label }) => ({ value: id, label }))}
                            value={draft.directionId}
                            onChange={(value) => updateDirection(value as string)}
                            className="w-[136px]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                        <span className="text-sm text-muted-foreground">元运</span>
                        <CustomSelect
                            options={YUN_OPTIONS}
                            value={draft.yun}
                            onChange={(value) => updateYun(value as number)}
                            className="w-[80px]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                        <span className="text-sm text-muted-foreground">卦类</span>
                        <CustomSelect
                            options={PAN_TYPE_OPTIONS}
                            value={draft.panType}
                            onChange={(value) => updatePanType(value as PanType)}
                            className="w-[128px]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                        <span className="text-sm text-muted-foreground">元期</span>
                        {isYuanPhaseChoiceRequired ? (
                            <CustomSelect
                                options={YUAN_PHASE_OPTIONS}
                                value={draft.yuanPhase}
                                onChange={(value) => updateYuanPhase(value as YuanPhase)}
                                className="w-[80px]"
                            />
                        ) : (
                            <span className="inline-flex h-[34px] items-center rounded-lg border border-border/50 bg-background/60 px-3 text-sm text-muted-foreground">
                                {draft.yuanPhase === 'upper' ? '上元' : '下元'}
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={submitChart}
                        className="ml-auto h-[34px] shrink-0 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-ring"
                    >
                        排盘
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between bg-card/40 border border-border/50 rounded-xl px-6 py-3">
                <div>
                    <div className="text-base font-bold text-primary">
                        {header.directionLabel} · {header.yun}运{header.panTypeLabel}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        大玄空按{header.yuanPhaseLabel}起星；点击九宫查看数字来源。
                    </div>
                </div>

                <div className="flex border border-border/50 rounded-lg overflow-hidden bg-background/30 shadow-sm">
                    <div className="flex flex-col items-center justify-center px-4 py-1.5 border-r border-border/50 min-w-[64px]">
                        <span className="text-lg font-bold text-primary leading-none mb-1.5">{header.mountainStart}</span>
                        <span className="text-[10px] text-muted-foreground leading-none">山星入中</span>
                    </div>
                    <div className="flex flex-col items-center justify-center px-4 py-1.5 border-r border-border/50 min-w-[64px]">
                        <span className="text-lg font-bold text-primary leading-none mb-1.5">{header.facingStart}</span>
                        <span className="text-[10px] text-muted-foreground leading-none">向星入中</span>
                    </div>
                    <div className="flex flex-col items-center justify-center px-4 py-1.5 min-w-[64px]">
                        <span className="text-lg font-bold text-primary leading-none mb-1.5">{header.yun}</span>
                        <span className="text-[10px] text-muted-foreground leading-none">运入中</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
