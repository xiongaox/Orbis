export interface Relation {
    start: number;
    end: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    positions: any[];
    span: number;
    isTriple: boolean;
    trackIndex?: number;
    description?: string;
    type?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

// 统一颜色（使用与流年/大运标签相同的柔和颜色）
export const UNIFIED_COLOR = 'hsl(var(--muted-foreground))';

// 轨道分配算法（支持两点和三点关系）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const assignTracks = (relations: any[]) => {
    // 按照跨度从小到大排序，这样短的在内层（靠近文字），长的在外层
    const sorted = [...relations].map((r, originalIndex) => {
        // positions 可能是数字或字符串，统一转换为数字
        const positions = r.positions.map((p: string | number) => typeof p === 'number' ? p : parseInt(p));
        const start = Math.min(...positions);
        const end = Math.max(...positions);
        return {
            ...r,
            originalIndex,
            start,
            end,
            span: end - start,
            isTriple: r.positions.length === 3, // 标记是否为三元关系
        };
    }).sort((a, b) => {
        // 三点关系（三合/三会）放在更外层，优先分配不同轨道
        if (a.isTriple !== b.isTriple) return a.isTriple ? 1 : -1;
        if (a.span !== b.span) return a.span - b.span;
        return a.start - b.start;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracks: any[][] = [];

    sorted.forEach(rel => {
        let placed = false;
        for (let t = 0; t < tracks.length; t++) {
            const track = tracks[t];
            const overlap = track.some(existing => {
                // 严格的区间重叠检测：两个区间有任何交集都算重叠
                // 包括边界相等的情况：[0,2] 和 [2,4] 也算重叠（因为都涉及位置2）
                const hasOverlap = !(rel.end < existing.start || rel.start > existing.end);
                // 如果涉及三元关系，需要更严格的间隙
                if (rel.isTriple || existing.isTriple) {
                    // 三元关系需要更大的间隙才能不重叠
                    return hasOverlap || Math.abs(rel.start - existing.end) <= 0 || Math.abs(rel.end - existing.start) <= 0;
                }
                return hasOverlap;
            });

            if (!overlap) {
                track.push(rel);
                rel.trackIndex = t;
                placed = true;
                break;
            }
        }

        if (!placed) {
            const newTrack = [rel];
            rel.trackIndex = tracks.length;
            tracks.push(newTrack);
        }
    });

    return {
        tracksCount: tracks.length,
        relationsWithTracks: sorted
    };
};

export const TRACK_HEIGHT = 50; // 每层轨道基础高度
export const GUIDE_LINE_EXTRA = 35; // 有引导线时额外增加的间距
export const ITEM_WIDTH = 60;
export const GAP = 30; // 间距
export const START_X = 40 + ITEM_WIDTH / 2; // 左侧 padding 40px

export const getX = (index: number) => START_X + index * (ITEM_WIDTH + GAP);

// 判断关系是否需要引导线的辅助函数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const needsGuideLine = (rel: any) => {
    // 三点关系（三合/三会）始终使用引导线，将标签放到下方
    if (rel.isTriple) return true;

    const fullText = rel.description || rel.type;
    const labelText = fullText && fullText.length > 3 ? fullText.slice(2) : (fullText || '');
    const textWidth = labelText.length * 14 + 16;
    const x1 = getX(rel.start);
    const x2 = getX(rel.end);
    const nodeDistance = Math.abs(x2 - x1);
    const span = rel.span || Math.abs(rel.end - rel.start);
    return (span === 1 && labelText.length > 2) || textWidth > nodeDistance - 40;
};

// 计算轨道的累积Y偏移（考虑引导线需要的额外空间）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculateTrackY = (relations: any[], baseY: number, isTop: boolean) => {
    // 按轨道分组，检查每个轨道是否有需要引导线的关系
    const tracksWithGuide: Set<number> = new Set();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    relations.forEach((rel: any) => {
        if (needsGuideLine(rel)) {
            tracksWithGuide.add(rel.trackIndex);
        }
    });

    // 计算每个轨道的实际Y位置
    const trackPositions: number[] = [];
    let cumulativeY = baseY;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maxTrack = Math.max(...relations.map((r: any) => r.trackIndex), 0);

    for (let i = 0; i <= maxTrack; i++) {
        trackPositions[i] = cumulativeY;
        const hasGuide = tracksWithGuide.has(i);
        const spacing = TRACK_HEIGHT + (hasGuide ? GUIDE_LINE_EXTRA : 0);
        if (isTop) {
            cumulativeY -= spacing;
        } else {
            cumulativeY += spacing;
        }
    }

    return (trackIndex: number) => trackPositions[trackIndex] || baseY;
};

// 计算实际总高度（考虑引导线额外空间）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculateActualHeight = (relations: any[]) => {
    const tracksWithGuide = new Set<number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    relations.forEach((rel: any) => {
        if (needsGuideLine(rel)) {
            tracksWithGuide.add(rel.trackIndex);
        }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maxTrack = Math.max(...relations.map((r: any) => r.trackIndex), -1);
    let height = 40;
    for (let i = 0; i <= maxTrack; i++) {
        height += TRACK_HEIGHT + (tracksWithGuide.has(i) ? GUIDE_LINE_EXTRA : 0);
    }
    return height;
};
