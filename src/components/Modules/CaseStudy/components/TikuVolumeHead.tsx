import type { TikuVolume } from '../../../../lib/caseStudy/tikuParser';

/** 命例卷头：主标题是命例（男女 + 出生），副标题是命题人；八字单列一行 */
export default function TikuVolumeHead({
    volume,
    index,
    score,
}: {
    volume: TikuVolume;
    index: number;
    /** 交卷后的得分，显示在右上角题号下方 */
    score?: { right: number; total: number };
}) {
    const sub = [volume.gender, volume.birth].filter(Boolean).join('　');

    return (
        <div className="px-4 py-4 border-b border-border/40 bg-muted/10">
            <div className="flex items-baseline gap-3">
                <span className="flex-shrink-0 font-mono text-[17px] font-semibold text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="font-serif text-[17px] font-semibold text-foreground leading-snug">
                        {sub || '命例信息缺失'}
                    </div>
                    <div className="text-[13px] text-foreground/70 mt-0.5">
                        {volume.provider ? `命例提供者：${volume.provider}` : '未署名'}
                    </div>
                    {volume.bazi ? (
                        <div className="font-serif text-[15px] tracking-[0.14em] text-primary mt-1">
                            {volume.bazi}
                        </div>
                    ) : (
                        <div className="text-[12px] text-muted-foreground/70 mt-1">
                            原稿仅公历，八字待排盘
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 text-right">
                    {score && (
                        <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-right">
                            <div className="text-[11px] text-muted-foreground leading-none">得分</div>
                            <div className="font-mono text-[20px] font-semibold text-primary leading-tight mt-1">
                                {score.right}
                                <span className="text-[13px] text-muted-foreground"> / {score.total}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground leading-none mt-0.5">
                                正确率 {Math.round((score.right / Math.max(score.total, 1)) * 100)}%
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {volume.notes.length > 0 && (
                <div className="mt-2 pl-[calc(17px+0.75rem)] text-[12px] text-muted-foreground leading-relaxed">
                    {volume.notes.join('　·　')}
                </div>
            )}
        </div>
    );
}
