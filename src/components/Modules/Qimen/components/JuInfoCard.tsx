/**
 * 奇门局信息卡片
 * 显示节气、空亡、驿马等基本信息
 */
import { type QimenHeader } from '../../../../lib/csp-qimen/qimenService';
import { getXunShouSuffix } from '../utils/qimenInfoUtils';

interface JuInfoCardProps {
    header: QimenHeader;
    info: {
        prevJieQi: { name: string; time: string };
        currentJieQi: { name: string; time: string };
        nextJieQi: { name: string; time: string };
        kongWang: { year: string; month: string; day: string; hour: string };
        maXing: { year: string; month: string; day: string; hour: string };
    };
}

export default function JuInfoCard({ header, info }: JuInfoCardProps) {
    return (
        <div className="p-6 space-y-5">
            {/* 顶部标题 */}
            <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                    <span className="text-xl font-bold font-display tracking-wide">
                        {header.jieQi} {header.ju} <span className="text-primary font-mono ml-1">{header.xunShou}{getXunShouSuffix(header.xunShou)}</span>
                    </span>
                </div>
            </div>

            {/* 节气时间表 - 紧凑版 */}
            <div className="bg-muted/20 rounded-lg p-3 border border-border/40 shadow-sm space-y-2">
                {/* 上一节气 */}
                <div className="flex items-center justify-between text-muted-foreground/80 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-muted/50 px-1 py-0.5 rounded text-muted-foreground">上</span>
                        <span className="font-medium">{info.prevJieQi.name}</span>
                    </div>
                    <span className="font-mono text-xs tracking-wider opacity-80">{info.prevJieQi.time}</span>
                </div>

                {/* 现在节气 (Highlight) */}
                <div className="flex items-center justify-between text-primary relative">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full opacity-80" />
                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 px-1 py-0.5 rounded font-bold">今</span>
                        <span className="font-bold text-base tracking-wide">{info.currentJieQi.name}</span>
                    </div>
                    <span className="font-mono text-sm font-bold tracking-wider">{info.currentJieQi.time}</span>
                </div>

                {/* 下一节气 */}
                <div className="flex items-center justify-between text-muted-foreground/80 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-muted/50 px-1 py-0.5 rounded text-muted-foreground">下</span>
                        <span className="font-medium">{info.nextJieQi.name}</span>
                    </div>
                    <span className="font-mono text-xs tracking-wider opacity-80">{info.nextJieQi.time}</span>
                </div>
            </div>

            <div className="h-px bg-border/50" />

            {/* 神煞信息 - 表格式对齐 */}
            <div className="space-y-3 text-sm">
                {/* 空亡 */}
                <div className="grid grid-cols-[50px_1fr] gap-2 items-center">
                    <span className="text-muted-foreground text-xs">空亡</span>
                    <div className="flex gap-2">
                        {['year', 'month', 'day', 'hour'].map((key) => {
                            const k = key as keyof typeof info.kongWang;
                            const val = info.kongWang[k];
                            const labelMap: Record<string, string> = { year: '年', month: '月', day: '日', hour: '时' };
                            return (
                                <div key={key} className="flex items-baseline gap-1 bg-muted/30 border border-border/40 px-2 py-1 rounded">
                                    <span className="text-xs text-muted-foreground/70">{labelMap[key]}</span>
                                    <span className={`font-mono ${key === 'hour' ? 'text-primary font-bold' : 'text-foreground/90'}`}>
                                        {val || '-'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 驿马 */}
                <div className="grid grid-cols-[50px_1fr] gap-2 items-center">
                    <span className="text-muted-foreground text-xs">驿马</span>
                    <div className="flex gap-2">
                        {['year', 'month', 'day', 'hour'].map((key) => {
                            const k = key as keyof typeof info.maXing;
                            const val = info.maXing[k];
                            const labelMap: Record<string, string> = { year: '年', month: '月', day: '日', hour: '时' };
                            return (
                                <div key={key} className="flex items-baseline gap-1 bg-muted/30 border border-border/40 px-2 py-1 rounded">
                                    <span className="text-xs text-muted-foreground/70">{labelMap[key]}</span>
                                    <span className={`font-mono ${key === 'hour' ? 'text-primary font-bold' : 'text-foreground/90'}`}>
                                        {val || '-'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
