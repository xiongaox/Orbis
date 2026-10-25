import qiongtongData from '../../../data/book/qiongtongbaojian.json';

export interface QiongtongEntry {
    title: string;
    tiaohou: string;
    summary: string;
    keyPoints: string[];
}

/**
 * 根据日主和月份获取调候用神信息
 * @param riZhu 日主天干（如 "甲", "乙", "丙"...）
 * @param month 月份（1-12，农历）
 * @returns 穷通宝鉴条目，如果没有则返回 undefined
 */
export function getQiongtongEntry(riZhu: string, month: number): QiongtongEntry | undefined {
    const data = qiongtongData as unknown as Record<string, Record<string, QiongtongEntry>>;
    const riZhuData = data[riZhu];

    if (!riZhuData) {
        return undefined;
    }

    return riZhuData[String(month)];
}

