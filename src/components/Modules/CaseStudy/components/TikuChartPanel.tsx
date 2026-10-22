import { useState } from 'react';
import { Compass } from 'lucide-react';
import CaseStudyBaziChart from './CaseStudyBaziChart';
import CaseStudyDayunPanel from './CaseStudyDayunPanel';
import CaseStudyQimenChart from './CaseStudyQimenChart';
import { useTikuChart, type TikuChartKind } from '../hooks/useTikuChart';
import type { TikuVolume } from '../../../../lib/caseStudy/tikuParser';
import type { PaiPanMethod } from '../../../../lib/csp-qimen/qimenService';

interface TikuChartPanelProps {
    volume: TikuVolume | null;
    isMobile?: boolean;
}

const KINDS: Array<{ id: TikuChartKind; label: string }> = [
    { id: 'bazi', label: '八字' },
    { id: 'qimen', label: '奇门' },
];

/**
 * 题库右侧排盘：同一命例的出生时间可排八字，也可起奇门局，
 * 两种盘共用一份时间来源，靠顶部分段切换。
 */
export default function TikuChartPanel({ volume, isMobile = false }: TikuChartPanelProps) {
    const [kind, setKind] = useState<TikuChartKind>('bazi');
    const [qimenMethod, setQimenMethod] = useState<PaiPanMethod>('zhirun');
    const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number | null>(null);
    const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number | null>(null);

    const { baziData, qimenResult, qimenLoading } = useTikuChart(volume, kind, qimenMethod);

    const hasTime = !!volume?.birthTime;

    const body = !hasTime ? (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground px-4 text-center">
            <Compass className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">该命例原稿缺公历时间</p>
            <p className="text-xs mt-1 opacity-70">无法排盘，可对照原稿八字研读</p>
        </div>
    ) : kind === 'bazi' ? (
        baziData ? (
            <>
                <div className="flex-shrink-0">
                    <CaseStudyBaziChart
                        data={baziData}
                        selectedDaYunIndex={selectedDaYunIndex}
                        selectedLiuNianYear={selectedLiuNianYear}
                        isMobile={isMobile}
                    />
                </div>
                <div className="flex-1 border-t border-border">
                    <CaseStudyDayunPanel
                        data={baziData}
                        selectedDaYunIndex={selectedDaYunIndex}
                        selectedLiuNianYear={selectedLiuNianYear}
                        onSelectDaYun={setSelectedDaYunIndex}
                        onSelectLiuNian={setSelectedLiuNianYear}
                        isMobile={isMobile}
                    />
                </div>
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <p className="text-sm">排盘失败，请检查出生时间</p>
            </div>
        )
    ) : qimenResult ? (
        <CaseStudyQimenChart
            palaces={qimenResult.palaces}
            header={qimenResult.header}
            globalPatterns={qimenResult.globalPatterns}
            isMobile={isMobile}
            method={qimenMethod}
            onMethodChange={setQimenMethod}
        />
    ) : (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">{qimenLoading ? '排盘计算中…' : '奇门起局失败'}</p>
        </div>
    );

    return (
        <div className="h-full bg-muted/10 flex flex-col overflow-hidden">
            <div className="px-2 py-1 border-b border-border bg-muted/20 flex justify-between items-center h-[32px] flex-shrink-0">
                <span className="text-xs font-medium text-muted-foreground">排盘信息</span>
                <div className="flex space-x-1">
                    {KINDS.map((k) => (
                        <button
                            key={k.id}
                            type="button"
                            onClick={() => setKind(k.id)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                kind === k.id
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                            }`}
                        >
                            {k.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col">
                {body}
            </div>
        </div>
    );
}
