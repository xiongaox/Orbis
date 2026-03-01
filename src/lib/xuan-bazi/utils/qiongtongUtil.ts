/**
 * qiongtongUtil - 应用底层设施
 *
 * 模块定位：
 * - 所在层级：应用底层设施
 * - 主要目标：封装第三方库或核心底层能力
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `QiongtongEntry`, `QiongtongMeta`, `getQiongtongMeta`, `getQiongtongEntry`, `getSupportedRiZhu`, `hasRiZhuData`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `qiongtongbaojian.json`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
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
