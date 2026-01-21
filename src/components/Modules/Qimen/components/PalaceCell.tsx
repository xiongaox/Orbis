/**
 * 奇门宫位单元格组件
 * 从 QimenChart.tsx 提取的宫位渲染逻辑
 */
import type { QimenPalace } from '../QimenChart';
import { getTianPanStatus, getMenPoStatus } from '../../../../lib/csp-qimen/qimenStatusUtils';

interface PalaceCellProps {
    palace: QimenPalace;
    isSelected: boolean;
    onSelect: () => void;
    showChangSheng: boolean;
    isZhiFu: boolean;
    isZhiShi: boolean;
    isDayStem: boolean;
    isHourStem: boolean;
    isJiGongDayStem?: boolean;
    isJiGongHourStem?: boolean;
}

export default function PalaceCell({
    palace,
    isSelected,
    onSelect,
    showChangSheng,
    isZhiFu,
    isZhiShi,
    isDayStem,
    isHourStem,
    isJiGongDayStem,
    isJiGongHourStem,
}: PalaceCellProps) {
    const baseClass = `relative rounded-lg border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border hover:bg-muted/30'} ${palace.position === 5 ? 'bg-muted/20' : ''}`;

    // 中宫特殊布局 - 与普通宫位保持完全一致的DOM结构
    if (palace.position === 5) {
        return (
            <button type="button" onClick={onSelect} className={baseClass}>
                <div className={`h-full flex flex-col p-0.5 2xl:p-1 ${showChangSheng ? 'justify-center gap-y-3 2xl:gap-y-4' : 'justify-evenly gap-y-3 2xl:gap-y-4'}`}>
                    {/* 第一行：暗干 - 与普通宫位对齐 */}
                    <div className="grid grid-cols-3 w-full">
                        <div className="flex items-center justify-center"><span className="text-base 2xl:text-xl font-serif text-muted-foreground">{palace.anGan}</span></div>
                        <div className="flex items-center justify-center"><span className="text-base 2xl:text-xl font-serif text-foreground/60">&nbsp;</span></div>
                        <div className="flex items-center justify-center"><span className="text-base 2xl:text-xl font-serif text-muted-foreground">&nbsp;</span></div>
                    </div>
                    {/* 第二行：占位 - 与普通宫位对齐，包含长生占位 */}
                    <div className="grid grid-cols-3 w-full">
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-base 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                            {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-xl 2xl:text-2xl font-serif font-bold text-foreground">&nbsp;</span>
                            {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-base 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                            {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">&nbsp;</span>}
                        </div>
                    </div>
                    {/* 第三行：地盘干 - 与普通宫位对齐，包含长生占位 */}
                    <div className="grid grid-cols-3 w-full">
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-base 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                            {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-lg 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                            {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.diPan}</span>
                            {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">&nbsp;</span>}
                        </div>
                    </div>
                </div>
            </button>
        );
    }

    // 普通宫位
    const tianPanStatus = getTianPanStatus(palace.tianPan, palace.position);
    const menPoStatus = getMenPoStatus(palace.men, palace.position);
    const diPanStatus = getTianPanStatus(palace.diPan, palace.position);

    const jiGongClass = `text-base 2xl:text-xl font-serif ${isJiGongDayStem || isJiGongHourStem ? 'text-primary font-bold' : 'text-foreground'}`;

    return (
        <button type="button" onClick={onSelect} className={baseClass}>
            <div className={`h-full flex flex-col p-0.5 2xl:p-1 ${showChangSheng ? 'justify-center gap-y-3 2xl:gap-y-4' : 'justify-evenly gap-y-3 2xl:gap-y-4'}`}>
                {/* 第一行：暗干 + 八神 + 马/空 */}
                <div className="grid grid-cols-3 w-full">
                    <div className="flex items-center justify-center"><span className="text-base 2xl:text-xl font-serif text-muted-foreground">{palace.anGan}</span></div>
                    <div className="flex items-center justify-center"><span className="text-base 2xl:text-xl font-serif text-foreground/60">{palace.shen}</span></div>
                    <div className="flex items-center justify-center"><span className="text-base 2xl:text-xl font-serif text-muted-foreground">{palace.maKong}</span></div>
                </div>

                {/* 第二行：寄宫天盘 + 九星 + 天盘干 */}
                <div className="grid grid-cols-3 w-full">
                    <div className="flex flex-col items-center justify-center leading-none">
                        <span className={jiGongClass}>{palace.jiGongTianPan}</span>
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.jiGongTianPanCS}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-center leading-none">
                        <span className={`text-xl 2xl:text-2xl font-serif font-bold ${isZhiFu ? 'text-primary' : 'text-foreground'}`}>{palace.xing}</span>
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.xingWang}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-center leading-none">
                        <span className={tianPanStatus.colorVar ? 'text-base 2xl:text-xl font-serif font-bold' : `text-base 2xl:text-xl font-serif ${isDayStem || isHourStem ? 'text-primary font-bold' : 'text-foreground'}`} style={tianPanStatus.colorVar ? { color: tianPanStatus.colorVar } : undefined}>{palace.tianPan}</span>
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.tianPanShiErCS}</span>}
                    </div>
                </div>

                {/* 第三行：寄宫地盘 + 八门 + 地盘干 */}
                <div className="grid grid-cols-3 w-full">
                    <div className="flex flex-col items-center justify-center leading-none">
                        <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.jiGongDiPan}</span>
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.jiGongDiPanCS}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-center leading-none">
                        <span className={menPoStatus.colorVar ? 'text-lg 2xl:text-xl font-serif font-bold' : `text-lg 2xl:text-xl font-serif ${isZhiShi ? 'text-primary' : 'text-foreground'}`} style={menPoStatus.colorVar ? { color: menPoStatus.colorVar } : undefined}>{palace.men}</span>
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.menWang}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-center leading-none">
                        <span className={diPanStatus.colorVar ? 'text-base 2xl:text-xl font-serif font-bold' : 'text-base 2xl:text-xl font-serif text-foreground'} style={diPanStatus.colorVar ? { color: diPanStatus.colorVar } : undefined}>{palace.diPan}</span>
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.diPanShiErCS}</span>}
                    </div>
                </div>
            </div>
        </button>
    );
}
