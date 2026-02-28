/**
 * 奇门遁甲模块 - 宫位详情面板 (竖向 Tab 版)
 * 左侧显示宫位内的所有元素列表，右侧显示选中元素的详细解读
 */
import { useState, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import type { QimenPalace } from './QimenChart';
import { QimenDataService } from '../../../lib/csp-qimen/qimenDataService';
import { detectPalacePatterns, type PatternContext } from '../../../lib/csp-qimen/patternDetector';
import { getGanLabel, getDetailDisplayData } from './utils/palaceDetailDataHelper';

interface QimenPalaceDetailProps {
    palace: QimenPalace | null;
    timeZhi?: string;
    zhiShiMen?: string;
    zhiFuXing?: string;
    siZhu?: { year: string; month: string; day: string; hour: string };
    xunShou?: string;
}

export default function QimenPalaceDetail({ palace, timeZhi, zhiShiMen, zhiFuXing, siZhu, xunShou }: QimenPalaceDetailProps) {
    const [selectedTab, setSelectedTab] = useState<string>('');

    if (!palace) {
        return (
            <aside className="w-full h-full bg-card border-l border-border flex flex-col min-h-0">
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">点击宫位查看详情</p>
                    </div>
                </div>
            </aside>
        );
    }

    // 构建左侧菜单项
    const originalMen = QimenDataService.getOriginalMen(palace.position);
    const menuItems = [
        palace.shen && { id: 'shen', label: palace.shen, type: '八神' },
        // 禽芮代表天禽+天芮两颗星，拆为两个独立列表项
        ...(palace.xing === '禽芮' ? [
            { id: 'xing_qin', label: '天禽', type: '九星' },
            { id: 'xing_rui', label: '天芮', type: '九星' },
        ] : palace.xing ? [{ id: 'xing', label: palace.xing, type: '九星' }] : []),
        palace.men && { id: 'men', label: palace.men, type: '八门' },
        { id: 'gong', label: palace.gongName + palace.position + '宫', type: '九宫' },
        (palace.gongName !== '中') && { id: 'gua', label: palace.gongName + '卦', type: '八卦' },
        palace.tianPan && { id: 'tian', label: getGanLabel(palace.tianPan), type: '天盘干' },
        palace.diPan && { id: 'di', label: getGanLabel(palace.diPan), type: '地盘干' },
        palace.jiGongTianPan && { id: 'ji_tian', label: getGanLabel(palace.jiGongTianPan), type: '天盘寄干' },
        palace.jiGongDiPan && { id: 'ji_di', label: getGanLabel(palace.jiGongDiPan), type: '地盘寄干' },
        palace.anGan && { id: 'an', label: '暗干' + getGanLabel(palace.anGan), type: '暗干' },
        (palace.shen === '值符' && palace.tianPan) && { id: 'jia_dun', label: '甲遁' + palace.tianPan + '下', type: '遁藏' },
        (palace.maKong?.includes('马')) && { id: 'yima', label: '驿马', type: '马星' },
        (palace.maKong?.includes('〇')) && { id: 'kongwang', label: '空亡', type: '旬空' },
        ...detectPalacePatterns(palace, zhiShiMen, {
            zhiShiMen,
            zhiFuXing,
            yearGan: siZhu?.year?.charAt(0),
            monthGan: siZhu?.month?.charAt(0),
            dayGan: siZhu?.day?.charAt(0),
            hourGan: siZhu?.hour?.charAt(0),
            xunShou,
        } as PatternContext).map((p, i) => {
            const complexPatterns = ['九遁', '三诈五假', '六仪击刑', '悖格'];
            const isComplex = complexPatterns.includes(p.name) && p.label !== p.name;
            return {
                id: `pattern_${i}_${p.name}`,
                label: isComplex ? `${p.label}(${p.name})` : p.label,
                displayLabel: isComplex ? p.name : p.label,
                type: p.type
            };
        }),
        (palace.tianPan && palace.diPan) && { id: 'ge_td', label: `${palace.tianPan}+${palace.diPan}`, type: '十干克应' },
        (palace.anGan && palace.tianPan) && { id: 'ge_at', label: `暗${palace.anGan}+天${palace.tianPan}`, type: '十干克应' },
        (palace.anGan && palace.diPan) && { id: 'ge_ad', label: `暗${palace.anGan}+地${palace.diPan}`, type: '十干克应' },
        (palace.anGan && palace.jiGongTianPan) && { id: 'ge_ajt', label: `暗${palace.anGan}+寄天${palace.jiGongTianPan}`, type: '十干克应' },
        (palace.anGan && palace.jiGongDiPan) && { id: 'ge_ajd', label: `暗${palace.anGan}+寄地${palace.jiGongDiPan}`, type: '十干克应' },
        (palace.tianPan && palace.jiGongDiPan) && { id: 'ge_tjd', label: `天${palace.tianPan}+寄地${palace.jiGongDiPan}`, type: '十干克应' },
        (palace.jiGongTianPan && palace.diPan) && { id: 'ge_jtd', label: `寄天${palace.jiGongTianPan}+地${palace.diPan}`, type: '十干克应' },
        (palace.tianPan && palace.anGan) && { id: 'ge_ta', label: `天${palace.tianPan}+暗${palace.anGan}`, type: '十干克应' },
        (originalMen && palace.men) && { id: 'ge_mm', label: `${originalMen}+${palace.men}`, type: '门门克应' },
        (palace.men && palace.tianPan) && { id: 'ge_mt', label: `${palace.men}+${palace.tianPan}`, type: '门干克应' },
        (palace.shen && palace.men) && { id: 'ge_sm', label: `${palace.shen}+${palace.men}`, type: '神门克应' },
        // 禽芮值时也拆为两个独立项
        ...(palace.xing === '禽芮' && timeZhi ? [
            { id: 'xing_time_qin', label: `天禽值${timeZhi}时`, type: '九星值时' },
            { id: 'xing_time_rui', label: `天芮值${timeZhi}时`, type: '九星值时' },
        ] : (palace.xing && timeZhi) ? [{ id: 'xing_time', label: `${palace.xing}值${timeZhi}时`, type: '九星值时' }] : []),
    ].filter(Boolean) as { id: string; label: string; displayLabel?: string; type: string }[];

    const activeItem = menuItems.find(i => i.id === selectedTab) || menuItems[0];

    const detailData = useMemo(() => {
        if (!activeItem) return { title: '', subTitle: '', tags: [], content: '' };
        return getDetailDisplayData(activeItem.type, activeItem.label, palace.position, timeZhi);
    }, [activeItem, palace.position, timeZhi]);

    return (
        <aside className="w-full h-full bg-card border-l border-border flex min-h-0 text-foreground">
            {/* 左侧竖向 Tabs */}
            <div className="w-[100px] flex-shrink-0 flex flex-col border-r border-border bg-muted/20 min-h-0">
                <div className="p-3 text-center border-b border-border shrink-0">
                    <div className="font-serif text-lg text-foreground font-bold">{palace.gongName}宫</div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    {menuItems.map((item) => {
                        const isActive = (activeItem?.id === item.id);
                        return (
                            <button
                                key={item.id}
                                onClick={() => setSelectedTab(item.id)}
                                className={`
                                    w-full text-left pl-3 pr-2 py-2 border-b border-border transition-all relative
                                    flex flex-col gap-0.5
                                    ${isActive ? 'bg-primary/10' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}
                                `}
                            >
                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                                <span className={`text-xs ${isActive ? 'text-primary/80' : 'opacity-60'}`}>{item.type}</span>
                                <span className={`font-serif text-sm font-medium truncate ${isActive ? 'text-primary' : ''}`}>{item.displayLabel || item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 右侧详情内容 */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-card">
                {activeItem && (
                    <div className="p-3 border-b border-border bg-muted/10">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-xl font-serif text-foreground">{detailData.title}</h2>
                            {(detailData.subTitle || (detailData.tags && detailData.tags.length > 0)) && (
                                <div className="flex flex-wrap gap-2">
                                    {detailData.subTitle && (
                                        <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary border border-primary/20">{detailData.subTitle}</span>
                                    )}
                                    {detailData.tags?.map((tag, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary border border-primary/20">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    <div className="prose prose-invert prose-sm max-w-none">
                        <div className="leading-loose text-foreground/60 font-normal text-base">
                            {typeof detailData.content === 'string' ? (
                                detailData.content.split('\n\n').map((block, idx) => {
                                    const match = block.match(/^【(.+)】\n([\s\S]+)$/);
                                    if (match) {
                                        const [, title, text] = match;
                                        return (
                                            <div key={idx} className="mb-6 last:mb-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-1 h-3.5 bg-primary/80 rounded-full" />
                                                    <div className="text-base font-bold text-foreground font-serif">{title}</div>
                                                </div>
                                                <div className="whitespace-pre-wrap pl-3 text-foreground/60">{text}</div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={idx} className="whitespace-pre-wrap mb-4 last:mb-0">{block}</div>
                                    );
                                })
                            ) : detailData.content}
                        </div>
                    </div>
                    <div className="h-10" />
                </div>
            </div>
        </aside>
    );
}
