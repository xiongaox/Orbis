import { LUOSHU_LAYOUT } from '../../../../lib/sanyuan';
import type { PalaceName, SanYuanChart as SanYuanChartData } from '../../../../lib/sanyuan';
import SanYuanPalaceCell from './SanYuanPalaceCell';

interface SanYuanChartProps {
    chart: SanYuanChartData;
    selectedPalace: PalaceName | null;
    onSelectPalace: (palace: PalaceName) => void;
}

export default function SanYuanChart({ chart, selectedPalace, onSelectPalace }: SanYuanChartProps) {
    return (
        <div className="w-full max-w-[640px] aspect-square grid grid-cols-3 grid-rows-3 gap-3 p-2 bg-card/20 border border-border/50 rounded-2xl shadow-inner mx-auto my-auto overflow-hidden">
            {LUOSHU_LAYOUT.flatMap((row) => row.map((palace) => {
                if (!palace) {
                    return <div key="center" className="bg-background/20 rounded-xl" aria-hidden="true" />;
                }

                return (
                    <SanYuanPalaceCell
                        key={palace}
                        palace={chart.palaces[palace]}
                        yuanPhase={chart.input.yuanPhase}
                        isActive={selectedPalace === palace}
                        onClick={() => onSelectPalace(palace)}
                    />
                );
            }))}
        </div>
    );
}
