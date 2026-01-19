/**
 * 奇门遁甲模块 - 宫位详情面板 (竖向 Tab 版)
 * 左侧显示宫位内的所有元素列表，右侧显示选中元素的详细解读
 */
import { useState, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import type { QimenPalace } from './QimenChart';
import { QimenDataService } from '../../../lib/csp-qimen/qimenDataService';

interface QimenPalaceDetailProps {
    palace: QimenPalace | null;
    timeZhi?: string;
}

// 干支阴阳五行映射
const GAN_ATTR_MAP: Record<string, string> = {
    '甲': '阳木', '乙': '阴木',
    '丙': '阳火', '丁': '阴火',
    '戊': '阳土', '己': '阴土',
    '庚': '阳金', '辛': '阴金',
    '壬': '阳水', '癸': '阴水'
};

function getGanLabel(gan: string) {
    return gan + (GAN_ATTR_MAP[gan] || '');
}

function extractGan(str: string): string {
    const match = str.match(/[甲乙丙丁戊己庚辛壬癸]/);
    return match ? match[0] : '';
}

// 帮助函数：根据类型和标签获取详细数据
function getDetailDisplayData(type: string, label: string, fullLabel: string, position?: number, timeZhi?: string) {
    // 1. 清理标签 (移除括号内备注、数字、宫字、前缀等)
    let cleanLabel = label.replace(/\s*\(.*\)/, '').trim(); // 移除 (长生) 等

    // 特殊处理
    if (type === '宫' || type === '卦') {
        // "乾六宫" -> "乾", "乾卦" -> "乾"
        cleanLabel = cleanLabel.split('')[0];
    } else if (type === '暗' || type === '寄') {
        // "暗干戊" -> "戊", "天寄癸" -> "癸", "地寄壬" -> "壬"
        cleanLabel = cleanLabel.replace(/^暗干/, '').replace(/^[天地]?寄/, '');
    } else if (type === '星时') {
        // "天蓬值子时" -> "天蓬"
        cleanLabel = cleanLabel.split('值')[0];
    }

    // 移除阴阳五行后缀 (如 "阳金", "阴水")
    if (['天', '地', '暗', '寄'].includes(type) || type === '星时') { // 星 normally doesn't have suffix in label logic here
        // cleanLabel = cleanLabel.replace(/[阳阴][木火土金水].*$/, '');
    }
    // Note: '星' type typically handles '天蓬'. '星时' cleans to '天蓬'.

    let title = cleanLabel;
    let subTitle = '';
    let tags: string[] = [];
    let content = '';

    switch (type) {
        case '神': {
            const d = QimenDataService.getShen(cleanLabel);
            if (d) {
                title = cleanLabel; // 值符
                subTitle = '八神';
                content = [
                    d.概念 && `【概念】\n${d.概念}`,
                    d.内容 && `【内容】\n${d.内容}`,
                    d.性情 && `【性情】\n${d.性情}`,
                    d.人物 && `【人物】\n${d.人物}`,
                    d.形态 && `【形态】\n${d.形态}`,
                    d.延伸 && `【延伸】\n${d.延伸}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '星': {
            const d = QimenDataService.getXing(cleanLabel);
            if (d) {
                title = cleanLabel + (cleanLabel.endsWith('星') ? '' : '星');
                subTitle = d.吉凶 || '九星';
                if (d.五行) tags.push(d.五行);
                if (d.吉凶) tags.push(d.吉凶);
                content = [
                    d.歌诀 && `【歌诀】\n${d.歌诀}`,
                    d.概念 && `【概念】\n${d.概念}`,
                    d.内容 && `【内容】\n${d.内容}`,
                    d.性情 && `【性情】\n${d.性情}`,
                    d.人物 && `【人物】\n${d.人物}`,
                    d.形态 && `【形态】\n${d.形态}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '星时': {
            // cleanLabel is "天蓬", timeZhi is "子"
            if (timeZhi) {
                const d = QimenDataService.getXingTime(cleanLabel, timeZhi);
                if (d) {
                    title = fullLabel; // "天蓬值子时"
                    subTitle = '九星值时克应';
                    content = [
                        d.解读 && `【解读】\n${d.解读}`,
                        d.原文 && `【原文】\n${d.原文}`,
                    ].filter(Boolean).join('\n\n');
                } else {
                    content = '暂无此时辰的克应数据。';
                }
            }
            break;
        }
        case '门': {
            const d = QimenDataService.getMen(cleanLabel);
            if (d) {
                title = cleanLabel + (cleanLabel.endsWith('门') ? '' : '门');
                subTitle = '八门';
                content = [
                    d.概念 && `【概念】\n${d.概念}`,
                    d.内容 && `【内容】\n${d.内容}`,
                    d.性情 && `【性情】\n${d.性情}`,
                    d.人物 && `【人物】\n${d.人物}`,
                    d.形态 && `【形态】\n${d.形态}`,
                    d.延伸 && `【延伸】\n${d.延伸}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '宫': {
            // Need position here
            if (position) {
                const d = QimenDataService.getGong(cleanLabel, position);
                if (d) {
                    title = fullLabel; // 显示 "乾六宫"
                    subTitle = '九宫';
                    content = [
                        d.description && `【内容】\n${d.description}`,
                        // Gong JSON mainly has description.
                        // If it has other fields, add them.
                    ].filter(Boolean).join('\n\n');
                }
            }
            break;
        }
        case '卦': {
            const d = QimenDataService.getBagua(cleanLabel);
            if (d) {
                title = cleanLabel + '卦';
                subTitle = '八卦';
                content = [
                    d.内容 && `【内容】\n${d.内容}`,
                    d.象意 && `【象意】\n${d.象意}`,
                    d.性情 && `【性情】\n${d.性情}`,
                    d.形态 && `【形态】\n${d.形态}`,
                    d.天时 && `【天时】\n${d.天时}`,
                    d.地理 && `【地理】\n${d.地理}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '天':
        case '地':
        case '暗':
        case '寄': {
            const d = QimenDataService.getGan(cleanLabel);
            if (d) {
                title = cleanLabel; // 甲
                subTitle = '十天干';
                content = [
                    d.概念 && `【概念】\n${d.概念}`,
                    d.内容 && `【内容】\n${d.内容}`,
                    d.性情 && `【性情】\n${d.性情}`,
                    d.人物 && `【人物】\n${d.人物}`,
                    d.形态 && `【形态】\n${d.形态}`,
                    d.求利 && `【求利】\n${d.求利}`,
                    d.延伸 && `【延伸】\n${d.延伸}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '遁': {
            const d = QimenDataService.getGan('甲');
            if (d) {
                title = label; // "甲遁壬下"
                subTitle = '甲（遁于' + label.charAt(2) + '下）';
                content = [
                    d.概念 && `【概念】\n${d.概念}`,
                    d.内容 && `【内容】\n${d.内容}`,
                    d.性情 && `【性情】\n${d.性情}`,
                    d.人物 && `【人物】\n${d.人物}`,
                    d.形态 && `【形态】\n${d.形态}`,
                    d.求利 && `【求利】\n${d.求利}`,
                    d.延伸 && `【延伸】\n${d.延伸}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '神门': {
            if (cleanLabel.includes('+')) {
                const [shen, men] = cleanLabel.split('+');
                const d = QimenDataService.getShenMen(shen, men);
                if (d) {
                    title = cleanLabel;
                    subTitle = '神门克应';
                    content = [
                        d.描述 && `【描述】\n${d.描述}`
                    ].filter(Boolean).join('\n\n');
                } else {
                    content = '暂无该神门组合的详细数据。';
                }
            }
            break;
        }
        case '扩展格局': {
            if (label.includes('+')) {
                const [l1, l2] = label.split('+');
                const g1 = extractGan(l1);
                const g2 = extractGan(l2);
                const d = QimenDataService.getGanCombo(g1, g2);
                if (d) {
                    title = label;
                    subTitle = d.格局名称 || '扩展克应';
                    if (d.格局名称) tags.push(d.格局名称);
                    content = [
                        d.详解 && `【详解】\n${d.详解}`,
                        d.象意联想 && `【象意】\n${d.象意联想}`,
                        d.测疾病 && `【测疾病】\n${d.测疾病}`,
                    ].filter(Boolean).join('\n\n');
                } else {
                    content = '暂无该组合的详细数据。';
                }
            }
            break;
        }
        case '门干': {
            if (cleanLabel.includes('+')) {
                const [men, gan] = cleanLabel.split('+');
                const d = QimenDataService.getMenGan(men, gan);
                if (d) {
                    title = cleanLabel;
                    subTitle = '门干克应';
                    content = [
                        d.描述 && `【描述】\n${d.描述}`
                    ].filter(Boolean).join('\n\n');
                } else {
                    content = '暂无该门干组合的详细数据。';
                }
            }
            break;
        }
        case '格': {
            // Label comes as "乙+丙"
            if (cleanLabel.includes('+')) {
                const [tian, di] = cleanLabel.split('+');
                const d = QimenDataService.getGanCombo(tian, di);
                if (d) {
                    title = cleanLabel;
                    subTitle = d.格局名称 || '克应';
                    if (d.格局名称) tags.push(d.格局名称);
                    content = [
                        d.详解 && `【详解】\n${d.详解}`,
                        d.象意联想 && `【象意】\n${d.象意联想}`,
                        d.测疾病 && `【测疾病】\n${d.测疾病}`,
                    ].filter(Boolean).join('\n\n');
                } else {
                    content = '暂无该克应组合的详细数据。';
                }
            }
            break;
        }
        case '门门': {
            if (cleanLabel.includes('+')) {
                const [orig, curr] = cleanLabel.split('+');
                const d = QimenDataService.getMenMen(orig, curr);
                if (d) {
                    title = cleanLabel;
                    subTitle = '门门克应';
                    content = [
                        d.静应 && `【静应】\n${d.静应}`,
                        d.动应 && `【动应】\n${d.动应}`
                    ].filter(Boolean).join('\n\n');
                } else {
                    content = '暂无该门门组合的详细数据。';
                }
            }
            break;
        }
    }

    if (!content) {
        content = '暂无详细数据。';
    }

    return { title, subTitle, tags, content };
}


export default function QimenPalaceDetail({ palace, timeZhi }: QimenPalaceDetailProps) {
    const [selectedTab, setSelectedTab] = useState<string>('gong');

    // Reset tab when palace changes? Not necessarily, user might want to keep viewing "Shen" across palaces.
    // But if current tab (e.g. combo) doesn't exist in new palace, we should switch.
    // Handled in render logic.

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
        // 核心单项
        palace.shen && { id: 'shen', label: palace.shen, type: '神' },
        palace.xing && { id: 'xing', label: palace.xing, type: '星' },

        // 九星值时 (如果有时间支) : 天蓬值子时
        (palace.xing && timeZhi) && { id: 'xing_time', label: `${palace.xing}值${timeZhi}时`, type: '星时' },

        palace.men && { id: 'men', label: palace.men, type: '门' },
        { id: 'gong', label: palace.gongName + palace.position + '宫', type: '宫' },
        { id: 'gua', label: palace.gongName + '卦', type: '卦' }, // Added Bagua

        // 天干
        palace.tianPan && { id: 'tian', label: getGanLabel(palace.tianPan) + (palace.tianPanShiErCS ? ` (${palace.tianPanShiErCS})` : ''), type: '天' },

        // 旬首甲遁 (仅在值符宫显示)
        (palace.shen === '值符' && palace.tianPan) && { id: 'jia_dun', label: '甲遁' + palace.tianPan + '下', type: '遁' },

        palace.diPan && { id: 'di', label: getGanLabel(palace.diPan) + (palace.diPanShiErCS ? ` (${palace.diPanShiErCS})` : ''), type: '地' },
        palace.anGan && { id: 'an', label: '暗干' + getGanLabel(palace.anGan), type: '暗' },

        // 寄宫 (如果有)
        // 寄宫 (如果有)
        palace.jiGongTianPan && { id: 'ji_tian', label: '天寄' + getGanLabel(palace.jiGongTianPan), type: '寄' },
        palace.jiGongDiPan && { id: 'ji_di', label: '地寄' + getGanLabel(palace.jiGongDiPan), type: '寄' },

        // 格局组合
        (palace.tianPan && palace.diPan) && { id: 'ge_td', label: `${palace.tianPan}+${palace.diPan}`, type: '格' },

        // 扩展格局: 暗干+天盘, 暗干+地盘, 暗干+寄天, 暗干+寄地, 天盘+寄地, 寄天+地盘, 天盘+暗干
        (palace.anGan && palace.tianPan) && { id: 'ge_at', label: `暗${palace.anGan}+天${palace.tianPan}`, type: '扩展格局' },
        (palace.anGan && palace.diPan) && { id: 'ge_ad', label: `暗${palace.anGan}+地${palace.diPan}`, type: '扩展格局' },
        (palace.anGan && palace.jiGongTianPan) && { id: 'ge_ajt', label: `暗${palace.anGan}+寄天${palace.jiGongTianPan}`, type: '扩展格局' },
        (palace.anGan && palace.jiGongDiPan) && { id: 'ge_ajd', label: `暗${palace.anGan}+寄地${palace.jiGongDiPan}`, type: '扩展格局' },
        (palace.tianPan && palace.jiGongDiPan) && { id: 'ge_tjd', label: `天${palace.tianPan}+寄地${palace.jiGongDiPan}`, type: '扩展格局' },
        (palace.jiGongTianPan && palace.diPan) && { id: 'ge_jtd', label: `寄天${palace.jiGongTianPan}+地${palace.diPan}`, type: '扩展格局' },
        (palace.tianPan && palace.anGan) && { id: 'ge_ta', label: `天${palace.tianPan}+暗${palace.anGan}`, type: '扩展格局' },

        (palace.shen && palace.men) && { id: 'ge_sm', label: `${palace.shen}+${palace.men}`, type: '神门' },
        (palace.men && palace.tianPan) && { id: 'ge_mt', label: `${palace.men}+${palace.tianPan}`, type: '门干' },
        (originalMen && palace.men) && { id: 'ge_mm', label: `${originalMen}+${palace.men}`, type: '门门' },
    ].filter(Boolean) as { id: string; label: string; type: string }[];

    // 如果当前选中的 tab 不在 menuItems 中，默认选第一项
    const activeItem = menuItems.find(i => i.id === selectedTab) || menuItems[0];

    // 获取详情数据
    const detailData = useMemo(() => {
        if (!activeItem) return { title: '', subTitle: '', tags: [], content: '' };
        return getDetailDisplayData(activeItem.type, activeItem.label, activeItem.label, palace.position, timeZhi);
    }, [activeItem, palace.position, timeZhi]);

    return (
        <aside className="w-full h-full bg-card border-l border-border flex min-h-0 text-foreground">
            {/* 左侧竖向 Tabs */}
            <div className="w-[100px] flex-shrink-0 flex flex-col border-r border-border bg-muted/20 overflow-y-auto custom-scrollbar">
                {/* 宫位标题头 */}
                <div className="p-3 text-center border-b border-border">
                    <div className="font-serif text-lg text-foreground font-bold">{palace.gongName}宫</div>
                </div>

                <div className="flex flex-col">
                    {menuItems.map((item) => {
                        const isActive = (activeItem?.id === item.id);
                        return (
                            <button
                                key={item.id}
                                onClick={() => setSelectedTab(item.id)}
                                className={`
                                    w-full text-left px-3 py-3 border-b border-border transition-all relative
                                    flex flex-col gap-0.5
                                    ${isActive ? 'bg-primary/10' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}
                                `}
                            >
                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                                <span className={`text-xs ${isActive ? 'text-primary/80' : 'opacity-60'}`}>{item.type}</span>
                                <span className={`font-serif text-sm font-medium truncate ${isActive ? 'text-primary' : ''}`}>{item.label.split(' ')[0]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 右侧详情内容 */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-card">
                {/* 头部信息 */}
                {activeItem && (
                    <div className="p-5 border-b border-border bg-muted/10">
                        <div className="flex items-baseline gap-3 mb-2">
                            <h2 className="text-xl font-serif text-foreground">{detailData.title}</h2>
                            {detailData.subTitle && (
                                <span className="text-sm text-muted-foreground">{detailData.subTitle}</span>
                            )}
                        </div>

                        {detailData.tags && detailData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {detailData.tags.map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary border border-primary/20">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 滚动文本区 */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="prose prose-invert prose-sm max-w-none">
                        <div className="whitespace-pre-wrap leading-loose text-foreground/80 font-light text-base">
                            {detailData.content}
                        </div>
                    </div>

                    {/* 底部占位，防止到底 */}
                    <div className="h-10" />
                </div>
            </div>
        </aside>
    );
}
