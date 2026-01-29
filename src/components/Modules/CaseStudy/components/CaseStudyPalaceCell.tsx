/**
 * 案例学习专用奇门宫位单元格组件 - 精简版
 * 字体较小，适配缩小的盘面
 */
import type { QimenPalace } from '../../../Modules/Qimen/QimenChart';
import { getTianPanStatus, getMenPoStatus } from '../../../../lib/csp-qimen/qimenStatusUtils';

interface PalaceCellProps {
    palace: QimenPalace;
    isSelected: boolean;
    onSelect: () => void;
    showChangSheng: boolean;
    showShiShen: boolean;
    isZhiFu: boolean;
    isZhiShi: boolean;
    isDayStem: boolean;
    isHourStem: boolean;
    isJiGongDayStem?: boolean;
    isJiGongHourStem?: boolean;
}

export default function CaseStudyPalaceCell({
    palace,
    isSelected,
    onSelect,
    showChangSheng,
    showShiShen,
    isZhiFu,
    isZhiShi,
    isDayStem,
    isHourStem,
    isJiGongDayStem,
    isJiGongHourStem,
}: PalaceCellProps) {
    // 显示状态计算：十神或长生二选一
    const showExtraInfo = showShiShen || showChangSheng;
    // 移除 rounded-lg 和 border，改为纯背景色交互
    const baseClass = `relative w-full h-full transition-all flex flex-col items-center justify-center ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/30'} ${palace.position === 5 ? 'bg-muted/10' : ''}`;

    // 中宫特殊布局 - 与普通宫位保持完全一致的DOM结构
    if (palace.position === 5) {
        return (
            <button type="button" onClick={onSelect} className={baseClass}>
                <div className={`w-full h-full flex flex-col p-0.5 ${showExtraInfo ? 'justify-center gap-y-1' : 'justify-evenly gap-y-1'}`}>
                    {/* 第一行：暗干 - 与普通宫位对齐 */}
                    <div className="grid grid-cols-3 w-full items-start">
                        <div className="flex items-center justify-center"><span className="text-sm font-serif text-muted-foreground opacity-70">{palace.anGan}</span></div>
                        <div className="flex items-center justify-center"><span className="text-sm font-serif text-foreground/60">&nbsp;</span></div>
                        <div className="flex items-center justify-center"><span className="text-sm font-serif text-muted-foreground">&nbsp;</span></div>
                    </div>
                    {/* 第二行：占位 - 与普通宫位对齐，包含长生占位 */}
                    <div className="grid grid-cols-3 w-full items-end">
                        <div className="flex flex-col items-center justify-end leading-none">
                            <span className="text-base font-serif text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className="text-[12px] text-muted-foreground whitespace-nowrap">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-end leading-none">
                            <span className="text-xl font-serif font-bold text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-end leading-none">
                            <span className="text-base font-serif text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">&nbsp;</span>}
                        </div>
                    </div>
                    {/* 第三行：地盘干 - 与普通宫位对齐，包含长生占位 */}
                    <div className="grid grid-cols-3 w-full items-end">
                        <div className="flex flex-col items-center justify-end leading-none">
                            <span className="text-base font-serif text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className="text-[12px] text-muted-foreground whitespace-nowrap">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-end leading-none">
                            <span className="text-lg font-serif text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-end leading-none">
                            <span className="text-base font-serif text-foreground">{palace.diPan}</span>
                            {showShiShen && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">{palace.diPanShiShen}</span>}
                            {showChangSheng && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">&nbsp;</span>}
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

    const jiGongClass = `text-base font-serif ${isJiGongDayStem || isJiGongHourStem ? 'text-primary font-bold' : 'text-foreground'}`;

    return (
        <button type="button" onClick={onSelect} className={baseClass}>
            <div className={`w-full h-full flex flex-col p-0.5 ${showExtraInfo ? 'justify-center gap-y-1' : 'justify-evenly gap-y-1'}`}>
                {/* 第一行：暗干 + 八神 + 马/空 */}
                <div className="grid grid-cols-3 w-full items-start">
                    <div className="flex items-center justify-center"><span className="text-sm font-serif text-muted-foreground opacity-70">{palace.anGan}</span></div>
                    <div className="flex items-center justify-center"><span className="text-sm font-serif text-foreground/60">{palace.shen}</span></div>
                    <div className="flex items-center justify-center"><span className="text-sm font-serif text-muted-foreground">{palace.maKong}</span></div>
                </div>

                {/* 第二行：寄宫天盘 + 九星 + 天盘干 */}
                <div className="grid grid-cols-3 w-full items-end">
                    <div className="flex flex-col items-center justify-end leading-none">
                        <span className={jiGongClass}>{palace.jiGongTianPan}</span>
                        {showShiShen && <span className="text-[12px] text-muted-foreground whitespace-nowrap">{palace.jiGongTianPanShiShen}</span>}
                        {showChangSheng && <span className="text-[12px] text-muted-foreground whitespace-nowrap">{palace.jiGongTianPanCS}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-end leading-none">
                        <span className={`text-xl font-serif font-bold ${isZhiFu ? 'text-primary' : 'text-foreground'}`}>{palace.xing}</span>
                        {showShiShen && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">{palace.xingShiShen}</span>}
                        {showChangSheng && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">{palace.xingWang}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-end leading-none">
                        {tianPanStatus.status === 'jiXing' ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-fuchsia-500 text-fuchsia-500 bg-fuchsia-500/5 font-serif font-bold text-sm">
                                {palace.tianPan}
                            </span>
                        ) : tianPanStatus.status === 'ruMu' ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-[#cd853f] text-[#cd853f] bg-[#cd853f]/10 font-serif font-bold text-sm">
                                {palace.tianPan}
                            </span>
                        ) : tianPanStatus.status === 'jiXingRuMu' ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10 font-serif font-bold text-sm">
                                {palace.tianPan}
                            </span>
                        ) : (
                            <span className={tianPanStatus.colorVar ? 'text-base font-serif font-bold' : `text-base font-serif ${isDayStem || isHourStem ? 'text-primary font-bold' : 'text-foreground'}`} style={tianPanStatus.colorVar ? { color: tianPanStatus.colorVar } : undefined}>{palace.tianPan}</span>
                        )}
                        {showShiShen && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">{palace.tianPanShiShen}</span>}
                        {showChangSheng && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">{palace.tianPanShiErCS}</span>}
                    </div>
                </div>

                {/* 第三行：寄宫地盘 + 八门 + 地盘干 */}
                <div className="grid grid-cols-3 w-full items-end">
                    <div className="flex flex-col items-center justify-end leading-none">
                        <span className="text-base font-serif text-foreground">{palace.jiGongDiPan}</span>
                        {showShiShen && <span className="text-[12px] text-muted-foreground whitespace-nowrap">{palace.jiGongDiPanShiShen}</span>}
                        {showChangSheng && <span className="text-[12px] text-muted-foreground whitespace-nowrap">{palace.jiGongDiPanCS}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-end leading-none">
                        <span className={menPoStatus.colorVar ? 'text-lg font-serif font-bold' : `text-lg font-serif ${isZhiShi ? 'text-primary' : 'text-foreground'}`} style={menPoStatus.colorVar ? { color: menPoStatus.colorVar } : undefined}>{palace.men}</span>
                        {showShiShen && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">{palace.menShiShen}</span>}
                        {showChangSheng && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">{palace.menWang}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-end leading-none">
                        {diPanStatus.status === 'jiXing' ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-fuchsia-500 text-fuchsia-500 bg-fuchsia-500/5 font-serif font-bold text-sm">
                                {palace.diPan}
                            </span>
                        ) : diPanStatus.status === 'ruMu' ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-[#cd853f] text-[#cd853f] bg-[#cd853f]/10 font-serif font-bold text-sm">
                                {palace.diPan}
                            </span>
                        ) : diPanStatus.status === 'jiXingRuMu' ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10 font-serif font-bold text-sm">
                                {palace.diPan}
                            </span>
                        ) : (
                            <span className={diPanStatus.colorVar ? 'text-base font-serif font-bold' : 'text-base font-serif text-foreground'} style={diPanStatus.colorVar ? { color: diPanStatus.colorVar } : undefined}>{palace.diPan}</span>
                        )}
                        {showShiShen && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">{palace.diPanShiShen}</span>}
                        {showChangSheng && <span className="text-[12px] text-muted-foreground whitespace-nowrap mt-0.5">{palace.diPanShiErCS}</span>}
                    </div>
                </div>
            </div>
        </button>
    );
}
