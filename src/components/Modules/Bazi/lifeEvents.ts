/**
 * 生平时间轴的分组逻辑（独立成文件：组件文件只允许导出组件，否则破坏 Fast Refresh）
 */

import type { LifeEvent } from '../../../services/baziCaseService';

/**
 * 把记录按大运节点分组：键为大运起始年。
 * - 大运级记录排在该节点最前，流年记录按年份升序
 * - 年份落不进任何大运段的记录进 orphan（改过出生时间后会出现），不静默丢弃
 */
export function groupLifeEvents(
    events: LifeEvent[],
    rangeList: { startYear: number; endYear: number }[],
) {
    const map = new Map<number, LifeEvent[]>();
    const orphan: LifeEvent[] = [];
    for (const event of events) {
        const year = Number(event.ref);
        const owner = rangeList.find((d) => year >= d.startYear && year <= d.endYear);
        if (!owner) { orphan.push(event); continue; }
        const list = map.get(owner.startYear) ?? [];
        list.push(event);
        map.set(owner.startYear, list);
    }
    for (const list of map.values()) {
        list.sort((a, b) => (a.kind === b.kind ? Number(a.ref) - Number(b.ref) : a.kind === 'dayun' ? -1 : 1));
    }
    return { map, orphan: orphan.sort((a, b) => Number(a.ref) - Number(b.ref)) };
}

/** 年份落在第几段之后（返回需要展示的段数）：超出所有段时返回全部段数 */
const countThrough = (afterBirth: { endYear: number }[], year: number) => {
    const idx = afterBirth.findIndex((d) => year <= d.endYear);
    return idx === -1 ? afterBirth.length : idx + 1;
};

/**
 * 大运展示段数的下限：「减少大运」不能再往下减的段数。
 * 至少要留 1 段，并且不能把已有记录、当前年份所在的段收起来（否则内容会莫名消失）。
 */
export function minDayunCount(
    afterBirth: { endYear: number }[],
    events: LifeEvent[],
    currentYear: number,
) {
    if (afterBirth.length === 0) return 0;
    const maxEventYear = events.reduce((max, e) => Math.max(max, Number(e.ref) || 0), 0);
    const byEvents = maxEventYear > 0 ? countThrough(afterBirth, maxEventYear) : 0;
    return Math.min(afterBirth.length, Math.max(byEvents, countThrough(afterBirth, currentYear), 1));
}

/**
 * 默认展示多少段大运：覆盖到 100 岁为止，更远的段由「新增大运」逐段展开。
 */
export function defaultDayunCount(
    afterBirth: { startAge?: number; endYear: number }[],
    events: LifeEvent[],
    currentYear: number,
) {
    if (afterBirth.length === 0) return 0;
    const beyond100 = afterBirth.findIndex((d) => (d.startAge ?? 0) > 100);
    const byAge = beyond100 === -1 ? afterBirth.length : Math.max(1, beyond100);
    return Math.min(afterBirth.length, Math.max(byAge, minDayunCount(afterBirth, events, currentYear)));
}
