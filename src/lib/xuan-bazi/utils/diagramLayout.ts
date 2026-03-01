/**
 * diagramLayout - 应用底层设施
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
 * - `DiagramRelation`, `TrackAssignmentResult`, `assignTracks`, `DIAGRAM_LAYOUT`, `needsGuideLineForRelation`, `calculateTrackYPositions`, `calculateActualHeight`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

// 关系类型
export interface DiagramRelation {
    type: string;
    description?: string;
    positions: (string | number)[];
    start?: number;
    end?: number;
    span?: number;
    isTriple?: boolean;
    trackIndex?: number;
    originalIndex?: number;
}

// 轨道分配结果
export interface TrackAssignmentResult {
    tracksCount: number;
    relationsWithTracks: DiagramRelation[];
}

/**
 * 轨道分配算法（支持两点和三点关系）
 * 将关系分配到不同轨道，避免重叠
 */
export function assignTracks(relations: DiagramRelation[]): TrackAssignmentResult {
    // 按照跨度从小到大排序，这样短的在内层（靠近文字），长的在外层
    const sorted = [...relations].map((r, originalIndex) => {
        // positions 可能是数字或字符串，统一转换为数字
        const positions = r.positions.map((p) => typeof p === 'number' ? p : parseInt(String(p)));
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

    const tracks: DiagramRelation[][] = [];

    sorted.forEach(rel => {
        let placed = false;
        for (let t = 0; t < tracks.length; t++) {
            const track = tracks[t];
            const overlap = track.some(existing => {
                // 严格的区间重叠检测
                const hasOverlap = !((rel.end ?? 0) < (existing.start ?? 0) || (rel.start ?? 0) > (existing.end ?? 0));
                // 如果涉及三元关系，需要更严格的间隙
                if (rel.isTriple || existing.isTriple) {
                    return hasOverlap || Math.abs((rel.start ?? 0) - (existing.end ?? 0)) <= 0 || Math.abs((rel.end ?? 0) - (existing.start ?? 0)) <= 0;
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
}

// 布局常量
export const DIAGRAM_LAYOUT = {
    ITEM_WIDTH: 60,
    GAP: 30,
    TRACK_HEIGHT: 50,
    GUIDE_LINE_EXTRA: 35,
    CENTER_AREA_HEIGHT: 200,
    PADDING: 40,
};

/**
 * 判断关系是否需要引导线
 */
export function needsGuideLineForRelation(
    rel: DiagramRelation,
    getX: (index: number) => number
): boolean {
    // 三点关系（三合/三会）始终使用引导线
    if (rel.isTriple) return true;

    const fullText = rel.description || rel.type;
    const labelText = fullText.length > 3 ? fullText.slice(2) : fullText;
    const textWidth = labelText.length * 14 + 16;
    const x1 = getX(rel.start ?? 0);
    const x2 = getX(rel.end ?? 0);
    const nodeDistance = Math.abs(x2 - x1);
    const span = rel.span || Math.abs((rel.end ?? 0) - (rel.start ?? 0));
    return (span === 1 && labelText.length > 2) || textWidth > nodeDistance - 40;
}

/**
 * 计算轨道的累积Y偏移
 */
export function calculateTrackYPositions(
    relations: DiagramRelation[],
    baseY: number,
    isTop: boolean,
    getX: (index: number) => number
): (trackIndex: number) => number {
    const tracksWithGuide = new Set<number>();
    relations.forEach((rel) => {
        if (needsGuideLineForRelation(rel, getX)) {
            tracksWithGuide.add(rel.trackIndex ?? 0);
        }
    });

    const trackPositions: number[] = [];
    let cumulativeY = baseY;
    const maxTrack = Math.max(...relations.map((r) => r.trackIndex ?? 0), 0);

    for (let i = 0; i <= maxTrack; i++) {
        trackPositions[i] = cumulativeY;
        const hasGuide = tracksWithGuide.has(i);
        const spacing = DIAGRAM_LAYOUT.TRACK_HEIGHT + (hasGuide ? DIAGRAM_LAYOUT.GUIDE_LINE_EXTRA : 0);
        if (isTop) {
            cumulativeY -= spacing;
        } else {
            cumulativeY += spacing;
        }
    }

    return (trackIndex: number) => trackPositions[trackIndex] || baseY;
}

/**
 * 计算实际总高度（考虑引导线额外空间）
 */
export function calculateActualHeight(
    relations: DiagramRelation[],
    getX: (index: number) => number
): number {
    const tracksWithGuide = new Set<number>();
    relations.forEach((rel) => {
        if (needsGuideLineForRelation(rel, getX)) {
            tracksWithGuide.add(rel.trackIndex ?? 0);
        }
    });
    const maxTrack = Math.max(...relations.map((r) => r.trackIndex ?? 0), -1);
    let height = 40;
    for (let i = 0; i <= maxTrack; i++) {
        height += DIAGRAM_LAYOUT.TRACK_HEIGHT + (tracksWithGuide.has(i) ? DIAGRAM_LAYOUT.GUIDE_LINE_EXTRA : 0);
    }
    return height;
}
