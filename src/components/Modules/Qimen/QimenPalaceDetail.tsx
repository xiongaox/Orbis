/**
 * 奇门遁甲模块 - 宫位详情面板 (竖向 Tab 版)
 * 左侧显示宫位内的所有元素列表，右侧显示选中元素的详细解读
 */
import { useState, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import type { QimenPalace } from './QimenChart';
import { QimenDataService } from '../../../lib/csp-qimen/qimenDataService';
import { detectPalacePatterns, type PatternContext } from '../../../lib/csp-qimen/patternDetector';

interface QimenPalaceDetailProps {
    palace: QimenPalace | null;
    timeZhi?: string;
    zhiShiMen?: string; // 值使门名称
    zhiFuXing?: string; // 值符星名称
    siZhu?: { year: string; month: string; day: string; hour: string }; // 四柱
    xunShou?: string;  // 旬首
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
        case '八神': {
            const d = QimenDataService.getShen(cleanLabel);
            if (d) {
                title = cleanLabel;
                // subTitle = '八神';
                content = [
                    d.五行 && `【五行】\n${d.五行}`,
                    d.概念 && `【概念】\n${d.概念}`,
                    d.象意 && `【象意】\n${d.象意}`,
                    d.性情 && `【性情】\n${d.性情}`,
                    d.相貌 && `【相貌】\n${d.相貌}`,
                    d.吉凶 && `【吉凶】\n${d.吉凶}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '九星': {
            const d = QimenDataService.getXing(cleanLabel);
            if (d) {
                title = cleanLabel;
                // subTitle = '九星';
                content = [
                    d.五行 && `【五行】\n${d.五行}`,
                    d.概念 && `【概念】\n${d.概念}`,
                    d.象意 && `【象意】\n${d.象意}`,
                    d.性情 && `【性情】\n${d.性情}`,
                    d.相貌 && `【相貌】\n${d.相貌}`,
                    d.吉凶 && `【吉凶】\n${d.吉凶}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '九星值时': {
            const starName = cleanLabel.split('值')[0]; // 天蓬值子时 -> 天蓬
            const d = QimenDataService.getXingTime(starName, timeZhi || '');
            if (d) {
                // label 如 "天蓬值子时"，这里 title 用 label 即可
                title = label;
                // subTitle = '九星值时';
                content = [
                    d.时辰克应 && `【时辰克应】\n${d.时辰克应}`,
                    d.解释 && `【解释】\n${d.解释}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '八门': {
            const d = QimenDataService.getMen(cleanLabel);
            if (d) {
                title = cleanLabel;
                // subTitle = '八门';
                content = [
                    d.五行 && `【五行】\n${d.五行}`,
                    d.概念 && `【概念】\n${d.概念}`,
                    d.象意 && `【象意】\n${d.象意}`,
                    d.性情 && `【性情】\n${d.性情}`,
                    d.相貌 && `【相貌】\n${d.相貌}`,
                    d.吉凶 && `【吉凶】\n${d.吉凶}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '九宫': {
            // Gong data usually just simple description or derived?
            // Assuming we might have data or just generic
            title = cleanLabel;
            // subTitle = '九宫';
            content = `【九宫】\n${cleanLabel}的相关信息...`; // TODO: Add Gong specific data source if available
            // Actually, usually gong links to Bagua or just position. 
            // Let's check DataService. If no specific Gong data, maybe show Bagua data instead?
            // Or just leave as is for now.
            break;
        }
        case '八卦': {
            const d = QimenDataService.getBagua(cleanLabel);
            if (d) {
                title = cleanLabel + '卦';
                // subTitle = '八卦';
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
        case '天盘干':
        case '地盘干':
        case '暗干':
        case '寄': {
            const d = QimenDataService.getGan(cleanLabel);
            if (d) {
                title = cleanLabel; // 甲
                // subTitle = '十天干';
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
                // subTitle = '甲（遁于' + label.charAt(2) + '下）';
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
                    // subTitle = '神门克应';
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
                    // subTitle = d.格局名称 || '扩展克应';
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
                    // subTitle = '门干克应';
                    content = [
                        d.描述 && `【描述】\n${d.描述}`
                    ].filter(Boolean).join('\n\n');
                } else {
                    content = '暂无该门干组合的详细数据。';
                }
            }
            break;
        }
        case '十干克应': {
            // Label comes as "乙+丙"
            if (cleanLabel.includes('+')) {
                const [tian, di] = cleanLabel.split('+');
                const d = QimenDataService.getGanCombo(tian, di);
                if (d) {
                    title = cleanLabel;
                    // subTitle = d.格局名称 || '克应';
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
                const [m1, m2] = cleanLabel.split('+');
                const d = QimenDataService.getMenMen(m1, m2);
                if (d) {
                    title = cleanLabel;
                    // subTitle = '门门克应';
                    content = [
                        d.吉凶 && `【吉凶】\n${d.吉凶}`,
                        d.详解 && `【详解】\n${d.详解}`,
                    ].filter(Boolean).join('\n\n');
                } else {
                    content = '暂无该门门组合的详细数据。';
                }
            }
            break;
        }
        case '驿马': {
            const d = QimenDataService.getJuPattern('驿马');
            if (d) {
                title = '驿马';
                subTitle = '马星';
                const appItems = d.应用 ? Object.entries(d.应用).map(([k, v]) => `• ${k}：${v}`).join('\n') : '';
                const limaItems = d.临马星含义 ? d.临马星含义.map((item: string) => `• ${item}`).join('\n') : '';
                content = [
                    d.描述 && `【描述】\n${d.描述}`,
                    d.口诀 && `【口诀】\n${d.口诀}`,
                    d.时上马星 && `【时上马星】\n${d.时上马星}`,
                    limaItems && `【临马星含义】\n${limaItems}`,
                    appItems && `【应用】\n${appItems}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '空亡': {
            const d = QimenDataService.getJuPattern('空亡');
            if (d) {
                title = '空亡';
                subTitle = '旬空';
                const appItems = d.应用 ? Object.entries(d.应用).map(([k, v]) => `• ${k}：${v}`).join('\n') : '';
                content = [
                    d.描述 && `【描述】\n${d.描述}`,
                    d.日干落空亡 && `【日干落空亡】\n${d.日干落空亡}`,
                    d.时干落空亡 && `【时干落空亡】\n${d.时干落空亡}`,
                    d.真空假空 && `【真空假空】\n${d.真空假空}`,
                    appItems && `【应用】\n${appItems}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        // 吉凶格局类型
        case '吉格':
        case '凶格': {
            // fullLabel 初始传入的是格局名称，如 "三奇贵人升殿" 或 "天遁"
            // 对于九遁类，label 格式为 "天遁(九遁)"
            let patternKey = cleanLabel;
            let subPatternKey = '';

            // 解析子格局，如 "天遁(九遁)" -> patternKey="九遁", subPatternKey="天遁"
            const subMatch = cleanLabel.match(/^(.+)\((.+)\)$/);
            if (subMatch) {
                subPatternKey = subMatch[1];
                patternKey = subMatch[2];
            }

            const d = QimenDataService.getJuPattern(patternKey);
            if (d) {
                title = subPatternKey || patternKey;
                // subTitle = type === '吉格' ? '吉格' : '凶格'; // 移除吉凶定性
                // tags.push(type); // 移除吉凶标签

                // 如果是子格局（如九遁中的天遁），直接取子项文本
                if (subPatternKey && d[subPatternKey]) {
                    content = `【${subPatternKey}】\n${d[subPatternKey]}`;
                } else {
                    // 通用格局展示
                    content = [
                        d.定义 && `【定义】\n${d.定义}`,
                        d.原文 && `【原文】\n${d.原文}`,
                        d.含义 && `【含义】\n${d.含义}`,
                        d.详解 && (typeof d.详解 === 'string' ? `【详解】\n${d.详解}` : ''),
                        d.应用 && `【应用】\n${d.应用}`,
                        d.条件 && `【条件】\n${d.条件}`,
                        d.注意 && `【注意】\n${d.注意}`,
                    ].filter(Boolean).join('\n\n');
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

export default function QimenPalaceDetail({ palace, timeZhi, zhiShiMen, zhiFuXing, siZhu, xunShou }: QimenPalaceDetailProps) {
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
        palace.shen && { id: 'shen', label: palace.shen, type: '八神' },
        palace.xing && { id: 'xing', label: palace.xing, type: '九星' },

        // 九星值时 (如果有时间支) : 天蓬值子时
        (palace.xing && timeZhi) && { id: 'xing_time', label: `${palace.xing}值${timeZhi}时`, type: '九星值时' },

        palace.men && { id: 'men', label: palace.men, type: '八门' },
        { id: 'gong', label: palace.gongName + palace.position + '宫', type: '九宫' },
        { id: 'gua', label: palace.gongName + '卦', type: '八卦' },

        // 天干
        palace.tianPan && { id: 'tian', label: getGanLabel(palace.tianPan) + (palace.tianPanShiErCS ? ` (${palace.tianPanShiErCS})` : ''), type: '天盘干' },

        // 旬首甲遁 (仅在值符宫显示)
        (palace.shen === '值符' && palace.tianPan) && { id: 'jia_dun', label: '甲遁' + palace.tianPan + '下', type: '遁' },

        palace.diPan && { id: 'di', label: getGanLabel(palace.diPan) + (palace.diPanShiErCS ? ` (${palace.diPanShiErCS})` : ''), type: '地盘干' },
        palace.anGan && { id: 'an', label: '暗干' + getGanLabel(palace.anGan), type: '暗干' },

        // 寄宫 (如果有)
        palace.jiGongTianPan && { id: 'ji_tian', label: '天寄' + getGanLabel(palace.jiGongTianPan), type: '寄' },
        palace.jiGongDiPan && { id: 'ji_di', label: '地寄' + getGanLabel(palace.jiGongDiPan), type: '寄' },

        // 格局组合
        (palace.tianPan && palace.diPan) && { id: 'ge_td', label: `${palace.tianPan}+${palace.diPan}`, type: '十干克应' },

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

        // 局势格局：驿马、空亡（只有当前宫位有时才显示）
        (palace.maKong?.includes('马')) && { id: 'yima', label: '驿马', type: '驿马' },
        (palace.maKong?.includes('〇')) && { id: 'kongwang', label: '空亡', type: '空亡' },

        // 吉凶格局（动态检测）
        ...detectPalacePatterns(palace, zhiShiMen, {
            zhiShiMen,
            zhiFuXing,
            yearGan: siZhu?.year?.charAt(0),
            monthGan: siZhu?.month?.charAt(0),
            dayGan: siZhu?.day?.charAt(0),
            hourGan: siZhu?.hour?.charAt(0),
            xunShou,
        } as PatternContext).map((p, i) => ({
            id: `pattern_${i}_${p.name}`,
            label: p.name === '九遁' ? `${p.label}(九遁)` : p.label,
            type: p.type
        })),
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
                        <div className="leading-loose text-foreground/90 font-normal text-base">
                            {/* 解析并渲染内容，将【标题】格式化为标签 */}
                            {typeof detailData.content === 'string' ? (
                                detailData.content.split('\n\n').map((block, idx) => {
                                    const match = block.match(/^【(.+)】\n([\s\S]+)$/);
                                    if (match) {
                                        const [, title, text] = match;
                                        return (
                                            <div key={idx} className="mb-6 last:mb-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-1 h-3.5 bg-primary/80 rounded-full" />
                                                    <div className="text-base font-bold text-foreground font-serif">
                                                        {title}
                                                    </div>
                                                </div>
                                                <div className="whitespace-pre-wrap pl-3 text-secondary-foreground/60">
                                                    {text}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={idx} className="whitespace-pre-wrap mb-4 last:mb-0">
                                            {block}
                                        </div>
                                    );
                                })
                            ) : detailData.content}
                        </div>
                    </div>

                    {/* 底部占位，防止到底 */}
                    <div className="h-10" />
                </div>
            </div>
        </aside>
    );
}
