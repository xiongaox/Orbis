/**
 * 奇门宫位单元格组件
 * 从 QimenChart.tsx 提取的宫位渲染逻辑
 */
import { useRef, useCallback } from 'react';
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
    isMobileLayout?: boolean;
    onLongPress?: () => void;
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
    isMobileLayout = false,
    onLongPress,
}: PalaceCellProps) {
    // 双击手势实现：300ms 内两次点击触发
    const lastClickTime = useRef(0);

    const handleClick = useCallback(() => {
        const now = Date.now();
        if (onLongPress && now - lastClickTime.current < 300) {
            // 双击：触发详情
            lastClickTime.current = 0;
            onLongPress();
        } else {
            // 单击：正常选中
            lastClickTime.current = now;
            onSelect();
        }
    }, [onSelect, onLongPress]);

    // 事件 props
    const gestureProps = { onClick: handleClick };
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
    const baseClass = `relative ${isMobileLayout ? '' : 'rounded-lg'} border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border hover:bg-muted/30'} ${palace.position === 5 ? 'bg-muted/20' : ''}`;
    // 长生/十神状态文字样式：移动端 11px 不换行，桌面端 text-xs
    const extraInfoClass = isMobileLayout
        ? 'text-[11px] 2xl:text-sm text-muted-foreground whitespace-nowrap overflow-hidden'
        : 'text-xs 2xl:text-sm text-muted-foreground';
    // 底部元数据 gap：移动端 0，桌面端 0.5
    const metaGapClass = isMobileLayout ? 'gap-0' : 'gap-0.5';

    // 中宫特殊布局 - 与普通宫位保持完全一致的DOM结构
    if (palace.position === 5) {
        return (
            <button type="button" {...gestureProps} className={baseClass}>
                <div className={`h-full flex flex-col p-0.5 2xl:p-1 ${showPalaceMeta ? 'justify-between gap-y-1 2xl:gap-y-1.5' : showExtraInfo ? 'justify-center gap-y-2 2xl:gap-y-3' : 'justify-evenly gap-y-2 2xl:gap-y-3'}`}>
                    {/* 占位行：对齐普通宫位的“门迫提示”，仅在 showPalaceMeta 开启时显示 */}
                    {showPalaceMeta && (
                        <div className="flex items-center justify-center gap-1 border-b border-transparent pb-0.5 opacity-0 select-none">
                            <span className="text-xs font-serif">占位</span>
                            <span className="text-xs">→</span>
                            <span className="text-sm font-serif font-semibold">占位</span>
                            <span className="text-xs">→</span>
                            <span className="text-xs font-serif">占位</span>
                        </div>
                    )}
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
                            {showExtraInfo && <span className={extraInfoClass}>&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-xl 2xl:text-2xl font-serif font-bold text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className={extraInfoClass}>&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-base 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className={extraInfoClass}>&nbsp;</span>}
                        </div>
                    </div>
                    {/* 第三行：地盘干 - 与普通宫位对齐，包含长生占位 */}
                    <div className="grid grid-cols-3 w-full">
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-base 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className={extraInfoClass}>&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-lg 2xl:text-xl font-serif text-foreground">&nbsp;</span>
                            {showExtraInfo && <span className={extraInfoClass}>&nbsp;</span>}
                        </div>
                        <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.diPan}</span>
                            {showShiShen && <span className={extraInfoClass}>{palace.diPanShiShen}</span>}
                            {showChangSheng && <span className={extraInfoClass}>&nbsp;</span>}
                        </div>
                    </div>
                    {/* 底部元数据行：对齐普通宫位的 Meta 行 */}
                    {showPalaceMeta && (
                        palace.palaceMeta ? (
                            <div className={`flex items-center justify-center ${metaGapClass} border-t border-border/40 pt-0.5 text-[11px] text-foreground/40 font-serif`}>
                                <span>{palace.palaceMeta.number}</span>
                                <span>丨</span>
                                <span>{isMobileLayout ? '' : '宫位'}【 {palace.palaceMeta.wangShuai} 】</span>
                                <span>丨</span>
                                <span>{isMobileLayout ? palace.palaceMeta.panType.replace('盘', '') : palace.palaceMeta.panType}</span>
                            </div>
                        ) : (
                            <div className={`flex items-center justify-center ${metaGapClass} border-t border-transparent pt-0.5 text-[11px] text-transparent font-serif select-none`}>
                                <span>占位</span>
                                <span>丨</span>
                                <span>【 占位 】</span>
                                <span>丨</span>
                                <span>占</span>
                            </div>
                        )
                    )}
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
        <button type="button" {...gestureProps} className={baseClass}>
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
                    <div className="flex flex-col items-center justify-end leading-none">
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : 'min-h-6 2xl:min-h-7'}`}>
                            <span className={jiGongClass}>{palace.jiGongTianPan}</span>
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.jiGongTianPanShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.jiGongTianPanCS}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-end leading-none">
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : 'min-h-6 2xl:min-h-7'}`}>
                            <span className={`text-xl 2xl:text-2xl font-serif font-bold ${isZhiFu ? 'text-primary' : 'text-foreground'}`}>{palace.xing}</span>
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.xingShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.xingWang}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-end leading-none">
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : 'min-h-6 2xl:min-h-7'}`}>
                            {tianPanStatus.status === 'jiXing' ? (
                                <span className={isMobileLayout ? 'text-base font-serif font-bold text-fuchsia-500' : 'inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-fuchsia-500 text-fuchsia-500 bg-fuchsia-500/5 font-serif font-bold text-base 2xl:text-lg'}>
                                    {palace.tianPan}
                                </span>
                            ) : tianPanStatus.status === 'ruMu' ? (
                                <span className={isMobileLayout ? 'text-base font-serif font-bold text-[#cd853f]' : 'inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-[#cd853f] text-[#cd853f] bg-[#cd853f]/10 font-serif font-bold text-base 2xl:text-lg'}>
                                    {palace.tianPan}
                                </span>
                            ) : tianPanStatus.status === 'jiXingRuMu' ? (
                                <span className={isMobileLayout ? 'text-base font-serif font-bold text-[#3b82f6]' : 'inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10 font-serif font-bold text-base 2xl:text-lg'}>
                                    {palace.tianPan}
                                </span>
                            ) : (
                                <span className={tianPanStatus.colorVar ? 'text-base 2xl:text-xl font-serif font-bold' : `text-base 2xl:text-xl font-serif ${isDayStem || isHourStem ? 'text-primary font-bold' : 'text-foreground'}`} style={tianPanStatus.colorVar ? { color: tianPanStatus.colorVar } : undefined}>{palace.tianPan}</span>
                            )}
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.tianPanShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.tianPanShiErCS}</span>}
                    </div>
                </div>

                {/* 第三行：寄宫地盘 + 八门 + 地盘干 */}
                <div className="grid grid-cols-3 w-full">
                    <div className="flex flex-col items-center justify-end leading-none">
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : 'min-h-6 2xl:min-h-7'}`}>
                            <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.jiGongDiPan}</span>
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.jiGongDiPanShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.jiGongDiPanCS}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-end leading-none">
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : 'min-h-6 2xl:min-h-7'}`}>
                            <span className={menPoStatus.colorVar ? 'text-lg 2xl:text-xl font-serif font-bold' : `text-lg 2xl:text-xl font-serif ${isZhiShi ? 'text-primary' : 'text-foreground'}`} style={menPoStatus.colorVar ? { color: menPoStatus.colorVar } : undefined}>{palace.men}</span>
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.menShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.menWang}</span>}
                    </div>
                    <div className="flex flex-col items-center justify-end leading-none">
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : 'min-h-6 2xl:min-h-7'}`}>
                            {diPanStatus.status === 'jiXing' ? (
                                <span className={isMobileLayout ? 'text-base font-serif font-bold text-fuchsia-500' : 'inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-fuchsia-500 text-fuchsia-500 bg-fuchsia-500/5 font-serif font-bold text-base 2xl:text-lg'}>
                                    {palace.diPan}
                                </span>
                            ) : diPanStatus.status === 'ruMu' ? (
                                <span className={isMobileLayout ? 'text-base font-serif font-bold text-[#cd853f]' : 'inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-[#cd853f] text-[#cd853f] bg-[#cd853f]/10 font-serif font-bold text-base 2xl:text-lg'}>
                                    {palace.diPan}
                                </span>
                            ) : diPanStatus.status === 'jiXingRuMu' ? (
                                <span className={isMobileLayout ? 'text-base font-serif font-bold text-[#3b82f6]' : 'inline-flex items-center justify-center w-6 h-6 2xl:w-7 2xl:h-7 rounded-md border border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10 font-serif font-bold text-base 2xl:text-lg'}>
                                    {palace.diPan}
                                </span>
                            ) : (
                                <span className={diPanStatus.colorVar ? 'text-base 2xl:text-xl font-serif font-bold' : 'text-base 2xl:text-xl font-serif text-foreground'} style={diPanStatus.colorVar ? { color: diPanStatus.colorVar } : undefined}>{palace.diPan}</span>
                            )}
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.diPanShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.diPanShiErCS}</span>}
                    </div>
                </div>

                {/* 底部元数据行：序号 | 宫位【旺衰】| 内外盘 */}
                {showPalaceMeta && palace.palaceMeta && (
                    <div className={`flex items-center justify-center ${metaGapClass} border-t border-border/40 pt-0.5 text-[11px] text-foreground/40 font-serif`}>
                        <span>{palace.palaceMeta.number}</span>
                        <span>丨</span>
                        <span>{isMobileLayout ? '' : '宫位'}【 {palace.palaceMeta.wangShuai} 】</span>
                        <span>丨</span>
                        <span>{isMobileLayout ? palace.palaceMeta.panType.replace('盘', '') : palace.palaceMeta.panType}</span>
                    </div>
                )}
            </div>
        </button>
    );
}
