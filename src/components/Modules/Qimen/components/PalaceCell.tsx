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
    showShiShen: boolean;
    showPalaceMeta: boolean;
    isZhiFu: boolean;
    isZhiShi: boolean;
    isDayStem: boolean;
    isHourStem: boolean;
    isJiGongDayStem?: boolean;
    isJiGongHourStem?: boolean;
    dynamicMaKong?: { kongPositions: number[]; maPosition: number };
}

export default function PalaceCell({
    palace,
    isSelected,
    onSelect,
    showChangSheng,
    showShiShen,
    showPalaceMeta,
    isZhiFu,
    isZhiShi,
    isDayStem,
    isHourStem,
    isJiGongDayStem,
    isJiGongHourStem,
    dynamicMaKong,
}: PalaceCellProps) {
    // 动态计算马/空显示
    const dynamicMaKongDisplay = (() => {
        if (!dynamicMaKong || palace.position === 5) return '';
        const isMa = dynamicMaKong.maPosition === palace.position;
        const isKong = dynamicMaKong.kongPositions.includes(palace.position);
        if (isMa && isKong) return '〇/马';
        if (isKong) return '〇';
        if (isMa) return '马';
        return '';
    })();
    // 显示状态计算：十神或长生二选一
    const showExtraInfo = showShiShen || showChangSheng;
    const baseClass = `relative rounded-lg border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border hover:bg-muted/30'} ${palace.position === 5 ? 'bg-muted/20' : ''}`;

    // 中宫特殊布局 - 与普通宫位保持完全一致的DOM结构
    if (palace.position === 5) {
        return (
            <button type="button" onClick={onSelect} className={baseClass}>
                <div className={`h-full flex flex-col p-0.5 2xl:p-1 ${showExtraInfo ? 'justify-center gap-y-3 2xl:gap-y-4' : 'justify-evenly gap-y-3 2xl:gap-y-4'}`}>
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
                            {showExtraInfo && <span className="text-xs 2xl:text-sm text-muted-foreground">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-xl 2xl:text-2xl font-serif font-bold text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className="text-xs 2xl:text-sm text-muted-foreground">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-base 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className="text-xs 2xl:text-sm text-muted-foreground">&nbsp;</span>}
                        </div>
                    </div>
                    {/* 第三行：地盘干 - 与普通宫位对齐，包含长生占位 */}
                    <div className="grid grid-cols-3 w-full">
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-base 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className="text-xs 2xl:text-sm text-muted-foreground">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-lg 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className="text-xs 2xl:text-sm text-muted-foreground">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.diPan}</span>
                            {showShiShen && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.diPanShiShen}</span>}
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
            <div className={`h-full flex flex-col p-0.5 2xl:p-1 ${showPalaceMeta ? 'justify-between gap-y-1 2xl:gap-y-1.5' : showExtraInfo ? 'justify-center gap-y-2 2xl:gap-y-3' : 'justify-evenly gap-y-2 2xl:gap-y-3'}`}>
                {/* 门迫路径行（顶部）：原宫 → 所在宫 → 后天方位 */}
                {showPalaceMeta && palace.menPoPath && (
                    <div className="flex items-center justify-center gap-1 border-b border-border/40 pb-0.5">
                        <span className="text-xs font-serif text-foreground/40">{palace.menPoPath.from}</span>
                        <span className="text-xs text-foreground/40">→</span>
                        <span className="text-sm font-serif font-semibold text-foreground/60">{palace.menPoPath.to}</span>
                        <span className="text-xs text-foreground/40">→</span>
                        <span className="text-xs font-serif text-foreground/40">{palace.menPoPath.final}</span>
                    </div>
                )}

                {/* 第一行：暗干 + 八神 + 马/空 */}
                <div className="grid grid-cols-3 w-full">
                    <div className="flex items-center justify-center"><span className="text-base 2xl:text-xl font-serif text-muted-foreground">{palace.anGan}</span></div>
                    <div className="flex items-center justify-center"><span className="text-base 2xl:text-xl font-serif text-foreground/60">{palace.shen}</span></div>
                    <div className="flex items-center justify-center"><span className="text-base 2xl:text-xl font-serif text-muted-foreground">{dynamicMaKong ? dynamicMaKongDisplay : palace.maKong}</span></div>
                </div>

                {/* 第二行：寄宫天盘 + 九星 + 天盘干 */}
                <div className="grid grid-cols-3 w-full">
                    <div className="flex flex-col items-center justify-center leading-none">
                        <span className={jiGongClass}>{palace.jiGongTianPan}</span>
                        {showShiShen && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.jiGongTianPanShiShen}</span>}
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.jiGongTianPanCS}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-center leading-none">
                        <span className={`text-xl 2xl:text-2xl font-serif font-bold ${isZhiFu ? 'text-primary' : 'text-foreground'}`}>{palace.xing}</span>
                        {showShiShen && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.xingShiShen}</span>}
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.xingWang}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-center leading-none">
                        {tianPanStatus.status === 'jiXing' ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-fuchsia-500 text-fuchsia-500 bg-fuchsia-500/5 font-serif font-bold text-base 2xl:text-lg">
                                {palace.tianPan}
                            </span>
                        ) : tianPanStatus.status === 'ruMu' ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-[#cd853f] text-[#cd853f] bg-[#cd853f]/10 font-serif font-bold text-base 2xl:text-lg">
                                {palace.tianPan}
                            </span>
                        ) : tianPanStatus.status === 'jiXingRuMu' ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10 font-serif font-bold text-base 2xl:text-lg">
                                {palace.tianPan}
                            </span>
                        ) : (
                            <span className={tianPanStatus.colorVar ? 'text-base 2xl:text-xl font-serif font-bold' : `text-base 2xl:text-xl font-serif ${isDayStem || isHourStem ? 'text-primary font-bold' : 'text-foreground'}`} style={tianPanStatus.colorVar ? { color: tianPanStatus.colorVar } : undefined}>{palace.tianPan}</span>
                        )}
                        {showShiShen && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.tianPanShiShen}</span>}
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.tianPanShiErCS}</span>}
                    </div>
                </div>

                {/* 第三行：寄宫地盘 + 八门 + 地盘干 */}
                <div className="grid grid-cols-3 w-full">
                    <div className="flex flex-col items-center justify-center leading-none">
                        <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.jiGongDiPan}</span>
                        {showShiShen && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.jiGongDiPanShiShen}</span>}
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.jiGongDiPanCS}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-center leading-none">
                        <span className={menPoStatus.colorVar ? 'text-lg 2xl:text-xl font-serif font-bold' : `text-lg 2xl:text-xl font-serif ${isZhiShi ? 'text-primary' : 'text-foreground'}`} style={menPoStatus.colorVar ? { color: menPoStatus.colorVar } : undefined}>{palace.men}</span>
                        {showShiShen && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.menShiShen}</span>}
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.menWang}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-center leading-none">
                        {diPanStatus.status === 'jiXing' ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-fuchsia-500 text-fuchsia-500 bg-fuchsia-500/5 font-serif font-bold text-base 2xl:text-lg">
                                {palace.diPan}
                            </span>
                        ) : diPanStatus.status === 'ruMu' ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-[#cd853f] text-[#cd853f] bg-[#cd853f]/10 font-serif font-bold text-base 2xl:text-lg">
                                {palace.diPan}
                            </span>
                        ) : diPanStatus.status === 'jiXingRuMu' ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10 font-serif font-bold text-base 2xl:text-lg">
                                {palace.diPan}
                            </span>
                        ) : (
                            <span className={diPanStatus.colorVar ? 'text-base 2xl:text-xl font-serif font-bold' : 'text-base 2xl:text-xl font-serif text-foreground'} style={diPanStatus.colorVar ? { color: diPanStatus.colorVar } : undefined}>{palace.diPan}</span>
                        )}
                        {showShiShen && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.diPanShiShen}</span>}
                        {showChangSheng && <span className="text-xs 2xl:text-sm text-muted-foreground">{palace.diPanShiErCS}</span>}
                    </div>
                </div>

                {/* 底部元数据行：序号 | 宫位【旺衰】| 内盘 */}
                {showPalaceMeta && palace.palaceMeta && (
                    <div className="flex items-center justify-center gap-0.5 border-t border-border/40 pt-0.5 text-xs text-foreground/40 font-serif">
                        <span>{palace.palaceMeta.number}</span>
                        <span>丨</span>
                        <span>宫位</span>
                        <span>【 {palace.palaceMeta.wangShuai} 】</span>
                        <span>丨</span>
                        <span>{palace.palaceMeta.panType}</span>
                    </div>
                )}
            </div>
        </button>
    );
}
