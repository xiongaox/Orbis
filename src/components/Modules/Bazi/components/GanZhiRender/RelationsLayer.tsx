import { getX, UNIFIED_COLOR, type Relation } from '../../hooks/useGanZhiLayout';

interface RelationsLayerProps {
    relations: Relation[];
    getTrackY: (index: number) => number;
    textY: number;
    isTop: boolean; // True for TianGan (upward), False for DiZhi (downward)
}

export const RelationsLayer = ({ relations, getTrackY, textY, isTop }: RelationsLayerProps) => {
    // Sort relations by track index (outer first)
    // Ensure trackIndex is defined, default to 0 if not (though it should be assigned by logic)
    const sortedRelations = [...relations].sort((a, b) => (b.trackIndex ?? 0) - (a.trackIndex ?? 0));

    return (
        <>
            {sortedRelations.map((rel, idx) => {
                const y = getTrackY(rel.trackIndex ?? 0);
                const color = UNIFIED_COLOR;

                // Handle triple relationships for DiZhi (Bottom)
                if (!isTop && rel.isTriple) {
                    const positions = rel.positions.map((p: string | number) => typeof p === 'string' ? parseInt(p) : p).sort((a: number, b: number) => a - b);
                    const [p1, p2, p3] = positions;
                    const x1 = getX(p1);
                    const x2 = getX(p2);
                    const x3 = getX(p3);

                    return (
                        <g key={`rel-lines-${idx}`}>
                            {/* Main connecting lines */}
                            <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="1.5" strokeOpacity="0.7" />
                            <line x1={x2} y1={y} x2={x3} y2={y} stroke={color} strokeWidth="1.5" strokeOpacity="0.7" />
                            {/* Middle point marker */}
                            <circle cx={x2} cy={y} r="4" fill={color} fillOpacity="0.4" />
                            {/* Dotted lines to text */}
                            <line x1={x1} y1={y} x2={x1} y2={textY + 25} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                            <line x1={x2} y1={y} x2={x2} y2={textY + 25} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                            <line x1={x3} y1={y} x2={x3} y2={textY + 25} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                        </g>
                    );
                }

                // Standard 2-point relationship
                const x1 = getX(rel.start);
                const x2 = getX(rel.end);
                // Adjust dotted line end point based on direction
                const dottedLineY = isTop ? textY - 25 : textY + 25;

                return (
                    <g key={`rel-lines-${idx}`}>
                        <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="1" strokeOpacity="0.6" />
                        <line x1={x1} y1={y} x2={x1} y2={dottedLineY} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                        <line x1={x2} y1={y} x2={x2} y2={dottedLineY} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                    </g>
                );
            })}
        </>
    );
};
