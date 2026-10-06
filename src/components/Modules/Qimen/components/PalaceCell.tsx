import { useCallback, useRef } from 'react';
import type { QimenPalace } from '../QimenChart';
import { getTianPanStatus, getMenPoStatus } from '../../../../lib/csp-qimen/qimenStatusUtils';
import QimenStatusStem from '../../../Common/QimenStatusStem';

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
    /** 盘面说明弹窗联动：当前高亮条目对应的元素 id，匹配的元素加主色描边 */
    guideLitId?: string | null;
    /** 说明弹窗反向选择：允许点击卡内元素（打 data-guide-el 标记，由弹窗层委托处理点击） */
    guideInteractive?: boolean;
    /** 大卡档位（说明弹窗用）：字号/行高等整体放大一档，相当于常驻 2xl 档位 */
    enlarged?: boolean;
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
    guideLitId,
    guideInteractive = false,
    enlarged = false,
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
    const baseClass = `relative ${enlarged ? 'rounded-2xl' : isMobileLayout ? '' : 'rounded-lg'} border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border hover:bg-muted/30'} ${palace.position === 5 ? 'bg-muted/20' : ''}`;
    // 长生/十神状态文字样式：移动端 11px 不换行，桌面端 text-xs
    const extraInfoClass = isMobileLayout
        ? `${enlarged ? 'text-sm' : 'text-[11px] 2xl:text-sm'} text-muted-foreground whitespace-nowrap overflow-hidden`
        : `${enlarged ? 'text-sm' : 'text-xs 2xl:text-sm'} text-muted-foreground`;
    // 底部元数据 gap：移动端 0，桌面端 0.5
    const metaGapClass = isMobileLayout ? 'gap-0' : 'gap-0.5';
    // 说明大卡（enlarged）专属：三卦行 / 元数据行的元素间距统一为 gap-3；九宫格普通宫位保持原紧凑样式
    const sanguaRowCls = enlarged ? 'gap-3 border-b border-border/40 pb-2' : 'gap-1 border-b border-border/40 pb-0.5';
    const metaRowCls = enlarged ? 'gap-3 border-t border-border/40 pt-2' : `${metaGapClass} border-t border-border/40 pt-0.5`;
    // 盘面说明弹窗联动：弹窗当前选中条目对应的元素加主色描边
    const litCls = (id: string) =>
        guideLitId === id ? 'outline outline-[1.5px] outline-primary outline-offset-2 bg-primary/10 rounded' : '';
    // 说明弹窗反向选择：可点击的卡内元素打上 data-guide-el 标记，由弹窗层委托处理点击
    const guideElProps = (id: string) => (guideInteractive ? { 'data-guide-el': id } : {});
    // 尺寸档位：说明弹窗大卡（enlarged）整体放大一档，避免大卡小字、高亮框相对突兀
    const ganCls = enlarged ? 'text-2xl' : 'text-base 2xl:text-xl';
    const xingCls = enlarged ? 'text-3xl' : 'text-xl 2xl:text-2xl';
    const menCls = enlarged ? 'text-2xl' : 'text-lg 2xl:text-xl';
    const sanguaCls = enlarged ? 'text-base' : 'text-xs';
    const sanguaToCls = enlarged ? 'text-lg' : 'text-sm';
    const rowMinH = isMobileLayout ? '' : enlarged ? 'min-h-9' : 'min-h-6 2xl:min-h-7';
    const statusStemCls = enlarged ? 'w-9 h-9 text-2xl' : 'w-6 h-6 2xl:w-7 2xl:h-7 text-base 2xl:text-lg';
    const metaCls = enlarged ? 'text-sm' : 'text-[11px]';
    const cardPad = enlarged ? 'px-3 py-4' : 'p-0.5 2xl:p-1';
    const rowGap = enlarged ? 'gap-y-2' : 'gap-y-1 2xl:gap-y-1.5';
    // 说明弹窗高亮中的状态干：以内层普通字形呈现，避免「描边套状态色块」双层容器
    const litJiGong = guideLitId === 'jiGong';
    const litTianPan = guideLitId === 'tianPan';
    const litDiPan = guideLitId === 'diPan';

    // 中宫特殊布局 - 与普通宫位保持完全一致的DOM结构
    if (palace.position === 5) {
        return (
            <button type="button" {...gestureProps} className={baseClass}>
                <div className={`h-full flex flex-col ${cardPad} ${showPalaceMeta ? `justify-between ${rowGap}` : showExtraInfo ? 'justify-center gap-y-3 2xl:gap-y-4' : 'justify-evenly gap-y-3 2xl:gap-y-4'}`}>
                    {/* 占位行：对齐普通宫位的“门迫提示”，仅在 showPalaceMeta 开启时显示 */}
                    {showPalaceMeta && (
                        <div className={`flex items-center justify-center ${enlarged ? 'gap-3 pb-2' : 'gap-1 pb-0.5'} border-b border-transparent opacity-0 select-none`}>
                            <span className="text-xs font-serif">占位</span>
                            <span className="text-xs">→</span>
                            <span className="text-sm font-serif font-semibold">占位</span>
                            <span className="text-xs">→</span>
                            <span className="text-xs font-serif">占位</span>
                        </div>
                    )}
                    {/* 第一行：暗干 - 与普通宫位对齐 */}
                    <div className="grid grid-cols-3 w-full">
                        <div {...guideElProps('anGan')} className={`flex items-center justify-center ${litCls('anGan')}`}><span className={`${ganCls} font-serif text-muted-foreground`}>{palace.anGan}</span></div>
                        <div className="flex items-center justify-center"><span className={`${ganCls} font-serif text-foreground/60`}>&nbsp;</span></div>
                        <div className="flex items-center justify-center"><span className={`${ganCls} font-serif text-muted-foreground`}>&nbsp;</span></div>
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
                    <div {...guideElProps('diPan')} className={`flex flex-col items-center justify-center leading-none ${litCls('diPan')}`}>
                        <span className={`${ganCls} font-serif text-foreground`}>{palace.diPan}</span>
                        {showShiShen && <span className={extraInfoClass}>{palace.diPanShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>&nbsp;</span>}
                    </div>
                    </div>
                    {/* 底部元数据行：对齐普通宫位的 Meta 行 */}
                    {showPalaceMeta && (
                        palace.palaceMeta ? (
                            <div className={`flex items-center justify-center ${metaGapClass} border-t border-border/40 ${metaRowCls} ${metaCls} text-foreground/40 font-serif`}>
                                <span {...guideElProps('num')} className={litCls('num')}>{palace.palaceMeta.number}</span>
                                <span>丨</span>
                                <span {...guideElProps('wang')} className={litCls('wang')}>{isMobileLayout ? '' : '宫位'}【 {palace.palaceMeta.wangShuai} 】</span>
                                <span>丨</span>
                                <span {...guideElProps('panType')} className={litCls('panType')}>{isMobileLayout ? palace.palaceMeta.panType.replace('盘', '') : palace.palaceMeta.panType}</span>
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
    // 中宫寄干在寄宫同样参与击刑/入墓判定（如中宫己寄坤宫为六仪击刑）
    const jiGongTianPanStatus = getTianPanStatus(palace.jiGongTianPan || '', palace.position);
    const jiGongDiPanStatus = getTianPanStatus(palace.jiGongDiPan || '', palace.position);

    const jiGongClass = `${ganCls} font-serif ${isJiGongDayStem || isJiGongHourStem ? 'text-primary font-bold' : 'text-foreground'}`;

    return (
        <button type="button" {...gestureProps} className={baseClass}>
            <div className={`h-full flex flex-col ${cardPad} ${showPalaceMeta ? `justify-between ${rowGap}` : showExtraInfo ? 'justify-center gap-y-3 2xl:gap-y-4' : 'justify-evenly gap-y-3 2xl:gap-y-4'}`}>
                {/* 门迫路径行（顶部）：原宫 → 所在宫 → 后天方位 */}
                {showPalaceMeta && palace.menPoPath && (
                    <div {...guideElProps('sangua')} className={`flex items-center justify-center ${sanguaRowCls} ${litCls('sangua')}`}>
                        <span className={`${sanguaCls} font-serif text-foreground/40`}>{palace.menPoPath.from}</span>
                        <span className={`${sanguaCls} text-foreground/40`}>→</span>
                        <span className={`${sanguaToCls} font-serif font-semibold text-foreground/60`}>{palace.menPoPath.to}</span>
                        <span className={`${sanguaCls} text-foreground/40`}>→</span>
                        <span className={`${sanguaCls} font-serif text-foreground/40`}>{palace.menPoPath.final}</span>
                    </div>
                )}

                {/* 第一行：暗干 + 八神 + 马/空 */}
                <div className="grid grid-cols-3 w-full">
                    <div {...guideElProps('anGan')} className={`flex items-center justify-center ${litCls('anGan')}`}><span className={`${ganCls} font-serif text-muted-foreground`}>{palace.anGan}</span></div>
                    <div {...guideElProps('shen')} className={`flex items-center justify-center ${litCls('shen')}`}><span className={`${ganCls} font-serif text-foreground/60`}>{palace.shen}</span></div>
                    <div {...guideElProps('ma')} className={`flex items-center justify-center ${litCls('ma')}`}><span className={`${ganCls} font-serif text-muted-foreground`}>{dynamicMaKong ? dynamicMaKongDisplay : palace.maKong}</span></div>
                </div>

                {/* 第二行：寄宫天盘 + 九星 + 天盘干 */}
                <div className="grid grid-cols-3 w-full">
                    <div {...guideElProps('jiGong')} className={`flex flex-col items-center justify-end leading-none ${litCls('jiGong')}`}>
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : rowMinH}`}>
                            {jiGongTianPanStatus.status === 'normal' || litJiGong ? (
                                <span className={jiGongClass}>{palace.jiGongTianPan}</span>
                            ) : (
                                <QimenStatusStem status={jiGongTianPanStatus.status} value={palace.jiGongTianPan || ''} isMobile={isMobileLayout} mobileClassName={enlarged ? 'text-xl' : 'text-base'} desktopClassName={statusStemCls} />
                            )}
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.jiGongTianPanShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.jiGongTianPanCS}</span>}
                    </div>
                    <div {...guideElProps('xing')} className={`flex flex-col items-center justify-end leading-none ${litCls('xing')}`}>
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : rowMinH}`}>
                            <span className={`${xingCls} font-serif font-bold ${isZhiFu ? 'text-primary' : 'text-foreground'}`}>{palace.xing}</span>
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.xingShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.xingWang}</span>}
                    </div>
                    <div {...guideElProps('tianPan')} className={`flex flex-col items-center justify-end leading-none ${litCls('tianPan')}`}>
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : rowMinH}`}>
                            {tianPanStatus.status !== 'normal' && !litTianPan ? (
                                <QimenStatusStem status={tianPanStatus.status} value={palace.tianPan} isMobile={isMobileLayout} mobileClassName={enlarged ? 'text-xl' : 'text-base'} desktopClassName={statusStemCls} />
                            ) : (
                                <span className={tianPanStatus.colorVar ? `${ganCls} font-serif font-bold` : `${ganCls} font-serif ${isDayStem || isHourStem ? 'text-primary font-bold' : 'text-foreground'}`} style={tianPanStatus.colorVar ? { color: tianPanStatus.colorVar } : undefined}>{palace.tianPan}</span>
                            )}
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.tianPanShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.tianPanShiErCS}</span>}
                    </div>
                </div>

                {/* 第三行：寄宫地盘 + 八门 + 地盘干 */}
                <div className="grid grid-cols-3 w-full">
                    <div className="flex flex-col items-center justify-end leading-none">
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : rowMinH}`}>
                            {jiGongDiPanStatus.status === 'normal' ? (
                                <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.jiGongDiPan}</span>
                            ) : (
                                <QimenStatusStem status={jiGongDiPanStatus.status} value={palace.jiGongDiPan || ''} isMobile={isMobileLayout} mobileClassName={enlarged ? 'text-xl' : 'text-base'} desktopClassName={statusStemCls} />
                            )}
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.jiGongDiPanShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.jiGongDiPanCS}</span>}
                    </div>
                    <div {...guideElProps('men')} className={`flex flex-col items-center justify-end leading-none ${litCls('men')}`}>
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : rowMinH}`}>
                            <span className={menPoStatus.colorVar ? `${menCls} font-serif font-bold` : `${menCls} font-serif ${isZhiShi ? 'text-primary' : 'text-foreground'}`} style={menPoStatus.colorVar ? { color: menPoStatus.colorVar } : undefined}>{palace.men}</span>
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.menShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.menWang}</span>}
                    </div>
                    <div {...guideElProps('diPan')} className={`flex flex-col items-center justify-end leading-none ${litCls('diPan')}`}>
                        <div className={`flex items-center justify-center ${isMobileLayout ? '' : rowMinH}`}>
                            {diPanStatus.status !== 'normal' && !litDiPan ? (
                                <QimenStatusStem status={diPanStatus.status} value={palace.diPan} isMobile={isMobileLayout} mobileClassName={enlarged ? 'text-xl' : 'text-base'} desktopClassName={statusStemCls} />
                            ) : (
                                <span className={diPanStatus.colorVar ? `${ganCls} font-serif font-bold` : `${ganCls} font-serif text-foreground`} style={diPanStatus.colorVar ? { color: diPanStatus.colorVar } : undefined}>{palace.diPan}</span>
                            )}
                        </div>
                        {showShiShen && <span className={extraInfoClass}>{palace.diPanShiShen}</span>}
                        {showChangSheng && <span className={extraInfoClass}>{palace.diPanShiErCS}</span>}
                    </div>
                </div>

                {/* 底部元数据行：序号 | 宫位【旺衰】| 内外盘 */}
                {showPalaceMeta && palace.palaceMeta && (
                    <div className={`flex items-center justify-center ${metaGapClass} border-t border-border/40 ${metaRowCls} ${metaCls} text-foreground/40 font-serif`}>
                        <span {...guideElProps('num')} className={litCls('num')}>{palace.palaceMeta.number}</span>
                        <span>丨</span>
                        <span {...guideElProps('wang')} className={litCls('wang')}>{isMobileLayout ? '' : '宫位'}【 {palace.palaceMeta.wangShuai} 】</span>
                        <span>丨</span>
                        <span {...guideElProps('panType')} className={litCls('panType')}>{isMobileLayout ? palace.palaceMeta.panType.replace('盘', '') : palace.palaceMeta.panType}</span>
                    </div>
                )}
            </div>
        </button>
    );
}
