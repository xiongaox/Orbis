/**
 * QimenPalaceDetail 数据查询辅助函数
 * 从 QimenPalaceDetail.tsx 提取的数据查询逻辑
 */
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

export interface DetailDisplayData {
    title: string;
    subTitle: string;
    tags: string[];
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
    let tags: string[] = [];
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
        case '遁': {
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
                const limaItems = d.临马星含义 ? d.临马星含义.map((item: string) => `• ${item}`).join('\n') : '';
                const desc = d.描述 ? d.描述.replace(/驿马/g, '马星') : '';
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
                const desc = d.描述 ? d.描述.replace(/空亡/g, '旬空') : '';
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
                    content = `【${subPatternKey}】\n${d[subPatternKey]}`;
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
