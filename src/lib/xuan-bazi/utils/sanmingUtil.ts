/**
 * 三命通会数据查询工具
 */
import sanmingData from '../../../data/book/sanmingtonghui.json';

interface NaYinInfo {
    nayin: string;
    pair: string;
    element: string;
    desc?: string;
    fullDesc?: string;
    modernDesc?: string;
}

interface SanMingData {
    meta: {
        name: string;
        author: string;
        dynasty: string;
        description: string;
    };
    nayin: Record<string, NaYinInfo>;
}

const data = sanmingData as SanMingData;

/**
 * 获取干支的纳音信息
 * @param ganZhi 干支（如 "甲子", "丙寅"）
 * @returns 纳音信息，如果没有则返回 undefined
 */
export function getSanMingNaYin(ganZhi: string): NaYinInfo | undefined {
    return data.nayin[ganZhi];
}

/**
 * 获取干支的详细论述
 * @param ganZhi 干支（如 "甲子", "丙寅"）
 * @returns 详细论述，如果没有则返回空字符串
 */
export function getSanMingDetail(ganZhi: string): string {
    const nayin = data.nayin[ganZhi];
    // 优先返回 fullDesc（完整纳音论述）
    if (nayin?.fullDesc) {
        return nayin.fullDesc;
    }
    // 返回简要描述
    if (nayin?.desc) {
        return nayin.desc;
    }
    return '';
}

/**
 * 获取纳音对应的干支对
 * 例如：丙寅和丁卯都是"炉中火"
 * @param ganZhi 干支
 * @returns 纳音名称和配对干支
 */
export function getNaYinPair(ganZhi: string): { nayin: string; selfGanZhi: string; pairGanZhi: string } | undefined {
    const info = data.nayin[ganZhi];
    if (!info) return undefined;
    return {
        nayin: info.nayin,
        selfGanZhi: ganZhi,
        pairGanZhi: info.pair,
    };
}

/**
 * 获取三命通会元数据
 */
export function getSanMingMeta() {
    return data.meta;
}

/**
 * 构建三命通会完整内容
 * @param dayGanZhi 日柱干支
 * @returns 格式化的内容
 */
export function buildSanMingContent(dayGanZhi: string) {
    const nayinInfo = getSanMingNaYin(dayGanZhi);
    if (!nayinInfo) {
        return {
            found: false,
            nayinLabel: '',
            elementLabel: '',
            summary: `暂无 ${dayGanZhi} 的三命通会数据`,
            keyPoints: [],
        };
    }

    const pairInfo = getNaYinPair(dayGanZhi);
    const detail = getSanMingDetail(dayGanZhi);

    // 构建纳音标签（如 "丙寅丁卯炉中火"）
    const nayinLabel = pairInfo
        ? `${pairInfo.selfGanZhi}${pairInfo.pairGanZhi}${pairInfo.nayin}`
        : `${dayGanZhi}${nayinInfo.nayin}`;

    // 五行标签（如 "丙火"）
    const dayGan = dayGanZhi[0];
    const elementLabel = `${dayGan}${nayinInfo.element}`;

    // 构建要点解析 - 使用现代解析（如果有）
    const keyPoints: string[] = [];

    // 现代解析
    if (nayinInfo.modernDesc) {
        // 分割多行内容，并去除 Markdown 列表符号，因为 UI 会自动添加列表点
        const lines = nayinInfo.modernDesc.split('\n');
        lines.forEach(line => {
            const cleanLine = line.trim().replace(/^\*\s*/, '');
            if (cleanLine) {
                keyPoints.push(cleanLine);
            }
        });
    }

    return {
        found: true,
        nayinLabel,
        elementLabel,
        nayinName: nayinInfo.nayin,
        summary: detail || nayinInfo.desc,
        keyPoints,
    };
}


