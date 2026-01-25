/**
 * 穷通宝鉴数据查询工具
 * 根据日主和月份获取调候用神信息
 */
import qiongtongData from '../../../data/book/qiongtongbaojian.json';

export interface QiongtongEntry {
    title: string;
    tiaohou: string;
    summary: string;
    keyPoints: string[];
}

export interface QiongtongMeta {
    name: string;
    author: string;
    dynasty: string;
    description: string;
}

/**
 * 获取穷通宝鉴元数据
 */
export function getQiongtongMeta(): QiongtongMeta {
    return qiongtongData.meta;
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

/**
 * 获取所有已支持的日主列表
 */
export function getSupportedRiZhu(): string[] {
    const data = qiongtongData as Record<string, unknown>;
    return Object.keys(data).filter(key => key !== 'meta');
}

/**
 * 检查某个日主是否有数据
 */
export function hasRiZhuData(riZhu: string): boolean {
    const data = qiongtongData as Record<string, unknown>;
    return riZhu in data && riZhu !== 'meta';
}
