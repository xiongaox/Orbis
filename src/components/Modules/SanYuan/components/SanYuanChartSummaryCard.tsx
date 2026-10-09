import type { SanYuanChartSummary } from '../../../../lib/sanyuan';

interface SanYuanChartSummaryCardProps {
    headerTitle: string;
    summary: SanYuanChartSummary;
}

/** 单条盘面结论行：圆点前缀 + 结论 + 支撑依据（弱化） */
function SummaryLine({ summary, basis }: { summary: string; basis?: string }) {
    return (
        <li className="flex items-start gap-2">
            <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/70" />
            <p className="text-[13px] leading-[1.65] text-foreground/90">
                {summary}
                {basis && <span className="ml-1.5 text-xs text-muted-foreground">（{basis}）</span>}
            </p>
        </li>
    );
}

/**
 * 盘面总览：盘级格局结论（四大局 / 伏吟反吟合十 / 旺气 / 零正神 / 五黄）。
 * 作为宫位研判侧栏在未选中宫位时的默认视图。
 */
export default function SanYuanChartSummaryCard({ headerTitle, summary }: SanYuanChartSummaryCardProps) {
    const lines: { summary: string; basis?: string }[] = [];
    if (summary.pattern) {
        lines.push({ summary: `${summary.pattern.title}：${summary.pattern.verdict}`, basis: summary.pattern.basis });
    } else {
        lines.push({ summary: '当运星未直接到坐到向，格局以零正神与峦头为纲判断。' });
    }
    if (summary.fuYin) {
        lines.push({
            summary: '伏吟：盘面与元旦盘相同，主呆滞、进退不前；伏吟之宫忌安床开门。',
            basis: `${summary.fuYin.map((hit) => hit.pan).join('、')}与元旦盘同`,
        });
    }
    if (summary.fanYin) {
        lines.push({
            summary: '反吟：盘面与元旦盘逐宫相反，主反复颠倒、破败之象。',
            basis: `${summary.fanYin.map((hit) => hit.pan).join('、')}与元旦盘合十相反`,
        });
    }
    if (summary.heShi) {
        lines.push({
            summary: '合十：主通气吉庆，利人丁。',
            basis: `${summary.heShi.map((hit) => hit.pan).join('、')}与运盘逐宫合十`,
        });
    }
    const wangDesc = summary.wangStars
        .filter((item) => item.palaces.length > 0)
        .map((item) => `${item.kind}${item.palaces.map((palace) => palace.label).join('、')}当运`)
        .join('，');
    if (wangDesc) {
        lines.push({ summary: `旺气所聚：${wangDesc}，宜结合现场用途核验。` });
    }
    if (summary.zeroGodPalaces.length > 0) {
        lines.push({
            summary: `大玄空零神在${summary.zeroGodPalaces.map((palace) => `${palace.label}(${palace.value})`).join('、')}；宜零神方见水，正神方忌水。`,
        });
    }
    for (const item of summary.wuHuang) {
        lines.push({
            summary: item.kind === '山星'
                ? `山星五黄落${item.palace.label}宫，该方宜静不宜动，忌动土；山星五黄寄中时无独立宫位。`
                : `向星五黄落${item.palace.label}宫，该方宜静不宜动，忌动土开路。`,
        });
    }

    return (
        <div className="p-6">
            <h2 className="text-xl font-bold font-serif mb-1">{headerTitle}</h2>
            <p className="text-xs text-muted-foreground mb-4">盘面总览 · 点击任一外宫查看该宫研判</p>
            <ul className="flex flex-col gap-2.5">
                {lines.map((line, index) => (
                    <SummaryLine key={index} summary={line.summary} basis={line.basis} />
                ))}
            </ul>
        </div>
    );
}
