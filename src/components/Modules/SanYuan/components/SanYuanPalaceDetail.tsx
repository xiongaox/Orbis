import { analyzeSanYuanPalace } from '../../../../lib/sanyuan';
import type {
    PalaceVerificationLevel,
    SanYuanChart,
    SanYuanPalaceAnalysis,
    SanYuanTalentInsight,
    PalaceName,
} from '../../../../lib/sanyuan';

interface SanYuanPalaceDetailProps {
    chart: SanYuanChart;
    selectedPalace: PalaceName | null;
}

const LEVEL_STYLES: Record<PalaceVerificationLevel, string> = {
    priority: 'border-primary/30 bg-primary/10 text-primary',
    verify: 'border-border/60 bg-card/50 text-foreground',
    caution: 'border-destructive/30 bg-destructive/10 text-destructive',
};

function TalentRow({ talent }: { talent: SanYuanTalentInsight }) {
    return (
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 rounded-lg border border-border/50 bg-background/40 px-3 py-3">
            <div className={`row-span-2 flex items-center justify-center self-stretch font-serif text-2xl font-bold ${talent.isFourAuspicious ? 'text-destructive' : 'text-primary'}`}>
                {talent.value}
            </div>
            <div className="flex items-baseline gap-2">
                <p className="text-sm font-medium text-foreground">{talent.title}</p>
                <span className="text-xs text-muted-foreground">（{talent.alias}）</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {talent.starName}{talent.relation ? ` · ${talent.relation}` : ''}。{talent.guidance}
            </p>
        </div>
    );
}

function TimingItem({
    label,
    value,
    atCurrentYun,
}: {
    label: string;
    value: number;
    atCurrentYun: boolean;
}) {
    return (
        <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="font-serif text-xl font-bold text-primary">{value}</span>
            </div>
            <p className={`mt-1 text-[11px] ${atCurrentYun ? 'text-primary' : 'text-muted-foreground'}`}>
                {atCurrentYun ? '当前运星到位' : '未见当前运星到位'}
            </p>
        </div>
    );
}

function PalaceAnalysisContent({ analysis, chart }: { analysis: SanYuanPalaceAnalysis; chart: SanYuanChart }) {
    const { talents, timing, verification } = analysis;

    return (
        <>
            <section className="rounded-xl border border-border/50 bg-card/40 p-4">
                <p className="text-xs tracking-[0.16em] text-muted-foreground">所选宫位</p>
                <h2 className="mt-1 text-2xl font-bold font-serif text-primary">{analysis.palaceLabel}宫研判</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    峦头为主，理气为用；请结合该宫实际用途、气口与周边形势核验。
                </p>
            </section>

            <section className={`mt-3 rounded-lg border p-3 ${LEVEL_STYLES[verification.level]}`}>
                <p className="text-sm font-medium">{verification.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/80">{verification.summary}</p>
            </section>

            <section className="mt-5">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-foreground">三才主断</h3>
                    <span className="text-xs text-muted-foreground">四吉星 {talents.fourAuspiciousCount} / 3</span>
                </div>
                <div className="mt-2 space-y-2">
                    <TalentRow talent={talents.earthMother} />
                    <TalentRow talent={talents.heavenFather} />
                    <TalentRow talent={talents.humanChild} />
                </div>
            </section>

            <section className="mt-5">
                <h3 className="text-sm font-medium text-foreground">时运条件</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <TimingItem label="山星" value={timing.mountainStar} atCurrentYun={timing.mountainAtCurrentYun} />
                    <TimingItem label="向星" value={timing.facingStar} atCurrentYun={timing.facingAtCurrentYun} />
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2.5">
                    <div>
                        <p className="text-xs text-muted-foreground">大玄空</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{chart.header.yuanPhaseLabel}方位属性参考</p>
                    </div>
                    <span className={`font-serif text-xl font-bold ${analysis.bigXuanKong.role === '零神' ? 'text-destructive' : 'text-primary'}`}>
                        {analysis.bigXuanKong.value} · {analysis.bigXuanKong.role}
                    </span>
                </div>
            </section>

            <section className="mt-5">
                <h3 className="text-sm font-medium text-foreground">核验与使用提示</h3>
                <ul className="mt-2 space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
                    {verification.actionTips.map((tip) => (
                        <li key={tip} className="text-xs leading-relaxed text-muted-foreground">
                            {tip}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mt-5">
                <h3 className="text-sm font-medium text-foreground">核验次序</h3>
                <ol className="mt-2 space-y-2 border-l border-border/60 pl-3">
                    {verification.checklist.map((item, index) => (
                        <li key={item} className="text-xs leading-relaxed text-muted-foreground">
                            <span className="mr-1 text-primary">{index + 1}.</span>{item}
                        </li>
                    ))}
                </ol>
            </section>

            <details className="mt-5 rounded-lg border border-border/50 bg-card/30 p-3">
                <summary className="cursor-pointer text-sm text-muted-foreground focus-ring">排盘依据</summary>
                <div className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
                    <p>大数取大玄空；小数由运盘、山星与向星组成；三才数依次为地母、天父、人子。</p>
                    <p>地母以坐山纳甲翻卦，天父以向山纳甲，人子以坐山纳甲排布。</p>
                </div>
            </details>
        </>
    );
}

export default function SanYuanPalaceDetail({ chart, selectedPalace }: SanYuanPalaceDetailProps) {
    if (!selectedPalace) {
        return (
            <div className="p-6">
                <h2 className="text-xl font-bold font-serif mb-3">宫位研判</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    点击任一外宫，查看三才、时运条件与现场核验提示。
                </p>
            </div>
        );
    }

    const analysis = analyzeSanYuanPalace(chart, selectedPalace);

    return (
        <div className="h-full min-h-0 overflow-y-auto p-6">
            <PalaceAnalysisContent analysis={analysis} chart={chart} />
        </div>
    );
}
