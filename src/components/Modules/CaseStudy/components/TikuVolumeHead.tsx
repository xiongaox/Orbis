import type { TikuVolume } from '../../../../lib/caseStudy/tikuParser';
import { splitNumberedItems } from '../../../../lib/caseStudy/tikuParser';

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
    // 主标题只放性别 + 出生时间；出生地已拆成独立一行，避免同一条信息出现两次
    const sub = [volume.gender, volume.birthText || volume.birth].filter(Boolean).join('　');

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
                    {volume.birthPlace && (
                        <div className="text-[14px] text-foreground/70 mt-0.5">
                            出生地：{volume.birthPlace}
                        </div>
                    )}
                    <div className="text-[14px] text-foreground/70 mt-0.5">
                        {volume.provider ? `命例提供者：${volume.provider}` : '未署名'}
                    </div>
                    {volume.bazi ? (
                        <div className="font-serif text-[15px] tracking-[0.14em] text-primary mt-1">
                            {volume.bazi}
                        </div>
                    ) : (
                        <div className="text-[14px] text-muted-foreground/70 mt-1">
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
                <div className="mt-2 pl-[calc(17px+0.75rem)] text-[14px] text-muted-foreground leading-relaxed">
                    {volume.notes.join('　·　')}
                </div>
            )}
            {/* 补充信息（一生描述 / 发生事项 / 已知事情 …）：反推时辰题的已知条件，
                缺了这些线索题就没法做，故随卷常驻展示。
                原文是一整段带序号的流水句，按序号拆行，长案例才读得下去 */}
            {volume.supplements.length > 0 && (
                <div className="mt-2.5 pl-[calc(17px+0.75rem)] space-y-2">
                    {volume.supplements.map((item) => {
                        const items = splitNumberedItems(item.text);
                        return (
                            <div key={`${item.label}-${item.text.slice(0, 8)}`} className="text-[14px] leading-relaxed">
                                <span className="text-primary/80 font-serif">{item.label}：</span>
                                <div className="mt-1 space-y-0.5">
                                    {items.map((line, i) => (
                                        <div key={i} className="text-foreground/75">{line}</div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
