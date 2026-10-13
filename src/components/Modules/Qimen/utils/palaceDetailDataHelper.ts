import { QimenDataService } from '../../../../lib/csp-qimen/qimenDataService';

// 干支阴阳五行映射
const GAN_ATTR_MAP: Record<string, string> = {
    '甲': '阳木', '乙': '阴木',
    '丙': '阳火', '丁': '阴火',
    '戊': '阳土', '己': '阴土',
    '庚': '阳金', '辛': '阴金',
    '壬': '阳水', '癸': '阴水'
};

export function getGanLabel(gan: string): string {
    return gan + (GAN_ATTR_MAP[gan] || '');
}

export function extractGan(str: string): string {
    const match = str.match(/[甲乙丙丁戊己庚辛壬癸]/);
    return match ? match[0] : '';
}

export interface DetailTag {
    label: string;
    /** 吉凶色调：ji=吉（绿）xiong=凶（红）ping=平（中性），缺省用主题色 */
    tone?: 'ji' | 'xiong' | 'ping';
}

/** 宫位凶象状态 → ju_pattern 词条：菜单项点开即该状态的释义，文案不在 UI 层硬编 */
const STATUS_PATTERN_KEYS: Record<string, string[]> = {
    '门迫': ['门迫'],
    '击刑': ['六仪击刑'],
    '入墓': ['入墓'],
    // 刑墓同宫：两条都给出
    '刑+墓': ['六仪击刑', '入墓'],
};

/** 词条字段有的是字符串、有的是分条对象（如驿马的「应用」），只取字符串 */
function asText(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

/**
 * 取宫位状态的释义块（门迫 / 击刑 / 入墓 / 刑+墓），返回可拼进详情正文的「【字段】\n正文」块。
 * 标题只留字段名（定义/含义/辨析/详解/应用）；刑墓同宫时两个词条的同名字段合到一块，标题不重复。
 * @param statusLabel 状态菜单项的标签
 * @param stem 该状态命中的干：击刑按干取「六仪击刑」详解里的对应分条
 */
export function getPalaceStatusGuideBlocks(statusLabel: string, stem?: string): string[] {
    const keys = STATUS_PATTERN_KEYS[statusLabel];
    if (!keys) return [];

    const sections = new Map<string, string[]>();
    const collect = (name: string, value: string) => {
        if (!value) return;
        sections.set(name, [...(sections.get(name) ?? []), value]);
    };

    for (const key of keys) {
        const d = QimenDataService.getJuPattern(key);
        if (!d) continue;

        // 六仪击刑的详解按六仪分条，落到具体哪一仪时只取该条，避免六条全铺开
        const detail = stem && d.详解 && typeof d.详解 === 'object'
            ? Object.entries(d.详解 as Record<string, string>).find(([name]) => name.includes(stem))?.[1]
            : undefined;

        collect('定义', asText(d.定义概念) || asText(d.定义));
        collect('含义', asText(d.含义));
        collect('辨析', asText(d.辨析));
        collect('详解', detail ?? '');
        collect('应用', asText(d.应用));
    }

    // 块内用单换行连接，块与块之间才是空行（渲染层按 \n\n 切块）
    return Array.from(sections, ([name, values]) => `【${name}】\n${values.join('\n')}`);
}

export interface DetailDisplayData {
    title: string;
    subTitle: string;
    tags: DetailTag[];
    content: string;
}

/**
 * 根据类型和标签获取详细数据
 */
export function getDetailDisplayData(
    type: string,
    label: string,
    position: number | undefined,
    timeZhi?: string
): DetailDisplayData {
    // 1. 清理标签 (移除括号内备注、数字、宫字、前缀等)
    let cleanLabel = label.replace(/\s*\(.*\)/, '').trim();

    // 纠正别名/异体字 (如: 腾蛇 -> 螣蛇)
    if (cleanLabel.includes('腾蛇')) {
        cleanLabel = cleanLabel.replace(/腾蛇/g, '螣蛇');
    }

    // 特殊处理
    if (['宫', '九宫', '卦', '八卦'].includes(type)) {
        cleanLabel = cleanLabel.split('')[0];
    } else if (['暗', '寄', '暗干', '天盘寄干', '地盘寄干'].includes(type) || type.startsWith('寄')) {
        cleanLabel = cleanLabel.replace(/^暗干/, '').replace(/^[天地]盘?寄(干)?/, '').replace(/^[天地]寄/, '');
    } else if (type === '星时') {
        cleanLabel = cleanLabel.split('值')[0];
    }

    let title = cleanLabel;
    let subTitle = '';
    const tags: DetailTag[] = [];
    let content = '';

    switch (type) {
        case '八神': {
            const d = QimenDataService.getShen(cleanLabel);
            if (d) {
                title = cleanLabel;
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
            const starName = cleanLabel.split('值')[0];
            const d = QimenDataService.getXingTime(starName, timeZhi || '');
            if (d) {
                title = label;
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
                    title = cleanLabel + '宫';
                    content = d.description;
                }
            }
            break;
        }
        case '八卦': {
            const d = QimenDataService.getBagua(cleanLabel);
            if (d) {
                title = cleanLabel + '卦';
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
                title = cleanLabel;
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
        case '遁':
        case '遁藏': {
            const d = QimenDataService.getGan('甲');
            if (d) {
                title = label;
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
                    content = [d.描述 && `【描述】\n${d.描述}`].filter(Boolean).join('\n\n');
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
                    content = [d.描述 && `【描述】\n${d.描述}`].filter(Boolean).join('\n\n');
                } else {
                    content = '暂无该门干组合的详细数据。';
                }
            }
            break;
        }
        case '十干克应': {
            if (label.includes('+')) {
                const [p1, p2] = label.split('+');
                const tian = extractGan(p1);
                const di = extractGan(p2);
                const d = QimenDataService.getGanCombo(tian, di);
                if (d) {
                    title = label;
                    if (d.格局名称) tags.push({ label: d.格局名称 });
                    if (d.吉凶) {
                        const tone = d.吉凶 === '吉' ? 'ji' : d.吉凶 === '凶' ? 'xiong' : 'ping';
                        tags.push({ label: d.吉凶, tone });
                    }
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
                const appItems = d.应用 ? Object.entries(d.应用).map(([k, v]) => `• ${k}：${v}`).join('\n') : '';
                const limaItems = Array.isArray(d.临马星含义) ? d.临马星含义.map((item) => `• ${item}`).join('\n') : '';
                const desc = typeof d.描述 === 'string' ? d.描述.replace(/驿马/g, '马星') : '';
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
                const appItems = d.应用 ? Object.entries(d.应用).map(([k, v]) => `• ${k}：${v}`).join('\n') : '';
                const desc = typeof d.描述 === 'string' ? d.描述.replace(/空亡/g, '旬空') : '';
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
        case '吉格':
        case '凶格': {
            let patternKey = cleanLabel;
            let subPatternKey = '';

            const subMatch = label.match(/^(.+)\((.+)\)$/);
            if (subMatch) {
                subPatternKey = subMatch[1];
                patternKey = subMatch[2];
            }

            const d = QimenDataService.getJuPattern(patternKey);
            if (d) {
                title = patternKey;
                if (subPatternKey) {
                    subTitle = subPatternKey;
                }

                if (subPatternKey && d[subPatternKey]) {
                    const subContent = d[subPatternKey];
                    content = typeof subContent === 'string' ? `【${subPatternKey}】\n${subContent}` : '';
                } else {
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
