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
function getDetailDisplayData(type: string, label: string, position: number | undefined, timeZhi?: string) {
    // 1. 清理标签 (移除括号内备注、数字、宫字、前缀等)
    let cleanLabel = label.replace(/\s*\(.*\)/, '').trim(); // 移除 (长生) 等

    // 纠正别名/异体字 (如: 腾蛇 -> 螣蛇)
    if (cleanLabel.includes('腾蛇')) {
        cleanLabel = cleanLabel.replace(/腾蛇/g, '螣蛇');
    }

    // 特殊处理
    // 特殊处理
    if (['宫', '九宫', '卦', '八卦'].includes(type)) {
        // "乾六宫" -> "乾", "乾卦" -> "乾"
        cleanLabel = cleanLabel.split('')[0];
    } else if (['暗', '寄', '暗干', '天盘寄干', '地盘寄干'].includes(type) || type.startsWith('寄')) {
        // "暗干戊" -> "戊", "天寄癸" -> "癸", "地寄壬" -> "壬", "天盘寄干戊" -> "戊"
        cleanLabel = cleanLabel.replace(/^暗干/, '').replace(/^[天地]盘?寄(干)?/, '').replace(/^[天地]寄/, '');
    } else if (type === '星时') {
        // "天蓬值子时" -> "天蓬"
        cleanLabel = cleanLabel.split('值')[0];
    }

    // 移除阴阳五行后缀 (如 "阳金", "阴水")
    // Note: '星' type typically handles '天蓬'. '星时' cleans to '天蓬'.
    if (['天', '地', '暗', '寄', '暗干'].includes(type) || type.startsWith('寄') || type === '星时') {
        // cleanLabel = cleanLabel.replace(/[阳阴][木火土金水].*$/, '');
    }

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
                    d.解读 && `【解读】\n${d.解读}`,
                    d.原文 && `【原文】\n${d.原文}`,
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
            if (position) {
                const d = QimenDataService.getGong(cleanLabel, position);
                if (d) {
                    title = cleanLabel + '宫'; // "坎宫"
                    // subTitle = '九宫';
                    content = d.description;
                }
            }
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
        case '天盘寄干':
        case '地盘寄干':
        case '寄': {
            const gan = extractGan(cleanLabel);
            const d = QimenDataService.getGan(gan);
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
        case '神门克应': {
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
        case '门干克应': {
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
            // Label can be "乙+丙" or "暗乙+天丙" etc.
            if (label.includes('+')) {
                const [p1, p2] = label.split('+');
                const tian = extractGan(p1);
                const di = extractGan(p2);
                const d = QimenDataService.getGanCombo(tian, di);
                if (d) {
                    title = label;
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
        case '门门克应': {
            if (cleanLabel.includes('+')) {
                const [m1, m2] = cleanLabel.split('+');
                const d = QimenDataService.getMenMen(m1, m2);
                if (d) {
                    title = cleanLabel;
                    // subTitle = '门门克应';
                    content = [
                        d.静应 && `【静应】\n${d.静应}`,
                        d.动应 && `【动应】\n${d.动应}`,
                    ].filter(Boolean).join('\n\n');
                } else {
                    content = '暂无该门门组合的详细数据。';
                }
            }
            break;
        }
        case '马星': {
            const d = QimenDataService.getJuPattern('驿马');
            if (d) {
                title = '驿马';
                // subTitle = '马星';
                const appItems = d.应用 ? Object.entries(d.应用).map(([k, v]) => `• ${k}：${v}`).join('\n') : '';
                const limaItems = d.临马星含义 ? d.临马星含义.map((item: string) => `• ${item}`).join('\n') : '';
                const desc = d.描述 ? d.描述.replace(/驿马/g, '马星') : ''; // 替换描述中的 "驿马" 为 "马星"

                content = [
                    desc && `【描述】\n${desc}`,
                    d.口诀 && `【口诀】\n${d.口诀}`,
                    d.时上马星 && `【时上马星】\n${d.时上马星}`,
                    limaItems && `【临马星含义】\n${limaItems}`,
                    appItems && `【应用】\n${appItems}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '旬空': {
            const d = QimenDataService.getJuPattern('空亡');
            if (d) {
                title = '空亡';
                // subTitle = '旬空';
                const appItems = d.应用 ? Object.entries(d.应用).map(([k, v]) => `• ${k}：${v}`).join('\n') : '';
                const desc = d.描述 ? d.描述.replace(/空亡/g, '旬空') : ''; // 替换描述中的 "空亡" 为 "旬空"

                content = [
                    desc && `【描述】\n${desc}`,
                    d.日干落空亡 && `【日干落空亡】\n${d.日干落空亡}`,
                    d.时干落空亡 && `【时干落空亡】\n${d.时干落空亡}`,
                    d.真空假空 && `【真空假空】\n${d.真空假空}`,
                    appItems && `【应用】\n${appItems}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        case '时干入墓': {
            const d = QimenDataService.getJuPattern('时干入墓');
            if (d) {
                title = '时干入墓';
                content = [
                    (d.定义概念 || d.定义) && `【定义】\n${d.定义概念 || d.定义}`,
                    d.含义 && `【含义】\n${d.含义}`,
                    d.辨析 && `【辨析】\n${d.辨析}`,
                    d.注意 && `【注意】\n${d.注意}`,
                ].filter(Boolean).join('\n\n');
            }
            break;
        }
        // 吉凶格局类型
        case '吉格':
        case '凶格': {
            // fullLabel 初始传入的是格局名称，如 "三奇贵人升殿" 或 "天遁"
            // 对于复杂格局，label 格式为 "甲子戊落震宫(六仪击刑)"
            let patternKey = cleanLabel;
            let subPatternKey = '';

            // 解析子格局，如 "甲子戊落震宫(六仪击刑)" -> patternKey="六仪击刑", subPatternKey="甲子戊落震宫"
            // 注意：使用原始 label 进行匹配，因为 cleanLabel 可能清理掉了括号
            const subMatch = label.match(/^(.+)\((.+)\)$/);
            if (subMatch) {
                subPatternKey = subMatch[1];
                patternKey = subMatch[2];
            }

            const d = QimenDataService.getJuPattern(patternKey);
            if (d) {
                // 复杂格局：标题显示格局名（六仪击刑），subTitle显示具体描述（甲子戊落震宫）
                title = patternKey;
                if (subPatternKey) {
                    subTitle = subPatternKey;
                }

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

    // 构建左侧菜单项（按用户指定顺序）
    const originalMen = QimenDataService.getOriginalMen(palace.position);
    const menuItems = [
        // 1. 八神
        palace.shen && { id: 'shen', label: palace.shen, type: '八神' },
        // 2. 九星
        palace.xing && { id: 'xing', label: palace.xing, type: '九星' },
        // 3. 八门
        palace.men && { id: 'men', label: palace.men, type: '八门' },
        // 4. 九宫
        { id: 'gong', label: palace.gongName + palace.position + '宫', type: '九宫' },
        // 5. 八卦
        (palace.gongName !== '中') && { id: 'gua', label: palace.gongName + '卦', type: '八卦' },
        // 6. 天盘干
        palace.tianPan && { id: 'tian', label: getGanLabel(palace.tianPan), type: '天盘干' },
        // 7. 地盘干
        palace.diPan && { id: 'di', label: getGanLabel(palace.diPan), type: '地盘干' },
        // 8. 天盘寄干
        palace.jiGongTianPan && { id: 'ji_tian', label: getGanLabel(palace.jiGongTianPan), type: '天盘寄干' },
        // 9. 地盘寄干
        palace.jiGongDiPan && { id: 'ji_di', label: getGanLabel(palace.jiGongDiPan), type: '地盘寄干' },
        // 10. 暗干
        palace.anGan && { id: 'an', label: '暗干' + getGanLabel(palace.anGan), type: '暗干' },
        // 11. 遁藏（仅在值符宫显示）
        (palace.shen === '值符' && palace.tianPan) && { id: 'jia_dun', label: '甲遁' + palace.tianPan + '下', type: '遁藏' },
        // 12. 马星
        (palace.maKong?.includes('马')) && { id: 'yima', label: '驿马', type: '马星' },
        // 13. 旬空
        (palace.maKong?.includes('〇')) && { id: 'kongwang', label: '空亡', type: '旬空' },
        // 14. 吉凶格局（动态检测）
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
        // 15. 十干克应（多个组合）
        (palace.tianPan && palace.diPan) && { id: 'ge_td', label: `${palace.tianPan}+${palace.diPan}`, type: '十干克应' },
        (palace.anGan && palace.tianPan) && { id: 'ge_at', label: `暗${palace.anGan}+天${palace.tianPan}`, type: '十干克应' },
        (palace.anGan && palace.diPan) && { id: 'ge_ad', label: `暗${palace.anGan}+地${palace.diPan}`, type: '十干克应' },
        (palace.anGan && palace.jiGongTianPan) && { id: 'ge_ajt', label: `暗${palace.anGan}+寄天${palace.jiGongTianPan}`, type: '十干克应' },
        (palace.anGan && palace.jiGongDiPan) && { id: 'ge_ajd', label: `暗${palace.anGan}+寄地${palace.jiGongDiPan}`, type: '十干克应' },
        (palace.tianPan && palace.jiGongDiPan) && { id: 'ge_tjd', label: `天${palace.tianPan}+寄地${palace.jiGongDiPan}`, type: '十干克应' },
        (palace.jiGongTianPan && palace.diPan) && { id: 'ge_jtd', label: `寄天${palace.jiGongTianPan}+地${palace.diPan}`, type: '十干克应' },
        (palace.tianPan && palace.anGan) && { id: 'ge_ta', label: `天${palace.tianPan}+暗${palace.anGan}`, type: '十干克应' },
        // 16. 门门克应
        (originalMen && palace.men) && { id: 'ge_mm', label: `${originalMen}+${palace.men}`, type: '门门克应' },
        // 17. 门干克应
        (palace.men && palace.tianPan) && { id: 'ge_mt', label: `${palace.men}+${palace.tianPan}`, type: '门干克应' },
        // 18. 神门克应
        (palace.shen && palace.men) && { id: 'ge_sm', label: `${palace.shen}+${palace.men}`, type: '神门克应' },
        // 19. 九星值时
        (palace.xing && timeZhi) && { id: 'xing_time', label: `${palace.xing}值${timeZhi}时`, type: '九星值时' },
    ].filter(Boolean) as { id: string; label: string; displayLabel?: string; type: string }[];

    // 如果当前选中的 tab 不在 menuItems 中，默认选第一项
    const activeItem = menuItems.find(i => i.id === selectedTab) || menuItems[0];

    // 获取详情数据
    const detailData = useMemo(() => {
        if (!activeItem) return { title: '', subTitle: '', tags: [], content: '' };
        return getDetailDisplayData(activeItem.type, activeItem.label, palace.position, timeZhi);
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
                                <span className={`font-serif text-sm font-medium truncate ${isActive ? 'text-primary' : ''}`}>{item.displayLabel || item.label}</span>
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
                        <div className="flex flex-col gap-2">
                            <h2 className="text-xl font-serif text-foreground">{detailData.title}</h2>
                            {/* subTitle 和 tags 统一使用标签容器样式 */}
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
