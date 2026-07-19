import { isBigXuanKongZeroGod, isFourAuspiciousStar, toChineseNumeral } from '../../../../lib/sanyuan';
import type { SanYuanPalace, YuanPhase } from '../../../../lib/sanyuan';

interface SanYuanPalaceCellProps {
    palace: SanYuanPalace;
    yuanPhase: YuanPhase;
    isActive: boolean;
    onClick: () => void;
}

interface NumberBlockProps {
    value: number;
    className?: string;
    highlighted?: boolean;
}

function NumberBlock({ value, className = '', highlighted = false }: NumberBlockProps) {
    return (
        <div className={`bg-background/80 flex flex-1 items-center justify-center rounded-lg shadow-sm p-1 md:p-1.5 ${className}`}>
            <span className={`text-lg md:text-[24px] leading-none ${highlighted ? 'text-destructive' : 'text-foreground/90'}`}>{value}</span>
        </div>
    );
}

export default function SanYuanPalaceCell({ palace, yuanPhase, isActive, onClick }: SanYuanPalaceCellProps) {
    return (
        <button
            type="button"
            aria-label={`查看${palace.label}宫数字释义`}
            className={`flex flex-col gap-1 w-full h-full bg-card/40 rounded-xl p-1.5 text-left transition-all border-2 overflow-hidden focus-ring
                ${isActive ? 'border-primary/80 bg-primary/5' : 'border-border/80 hover:border-primary/50'}
            `}
            onClick={onClick}
        >
            <div className="flex gap-1 flex-[4] min-h-0">
                <NumberBlock value={palace.mountainStar} />
                <div className="bg-background/80 flex-[1.6] flex items-center justify-center rounded-lg shadow-sm p-1 md:p-1.5">
                    <span className="text-lg md:text-[24px] leading-none text-foreground/90">{toChineseNumeral(palace.mountainStar)}</span>
                </div>
                <NumberBlock value={palace.facingStar} />
            </div>

            <div className="flex gap-1 flex-[6] min-h-0">
                <NumberBlock value={palace.bigXuanKong} highlighted={isBigXuanKongZeroGod(palace.bigXuanKong, yuanPhase)} />
                <div className="flex-[1.6] bg-background/90 flex items-center justify-center rounded-lg shadow-sm overflow-hidden p-1">
                    <span className="text-[20px] md:text-[28px] xl:text-[36px] font-bold font-serif text-foreground/30 leading-none">{palace.label}</span>
                </div>
                <div className="bg-background/80 flex flex-1 items-center justify-center rounded-lg shadow-sm p-1 md:p-1.5">
                    <span className="text-lg md:text-[24px] text-foreground/90 leading-none">{toChineseNumeral(palace.yunStar)}</span>
                </div>
            </div>

            <div className="flex gap-1 flex-[4] min-h-0">
                <NumberBlock value={palace.earthStar} highlighted={isFourAuspiciousStar(palace.earthStar)} />
                <NumberBlock value={palace.waterStar} className="flex-[1.6]" highlighted={isFourAuspiciousStar(palace.waterStar)} />
                <NumberBlock value={palace.heavenStar} highlighted={isFourAuspiciousStar(palace.heavenStar)} />
            </div>
        </button>
    );
}
