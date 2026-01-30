import { getX, UNIFIED_COLOR, type Relation } from '../../hooks/useGanZhiLayout';

interface TextLabelsLayerProps {
    relations: Relation[];
    getTrackY: (index: number) => number;
    isTop: boolean; // Controls label position relative to track
}

export const TextLabelsLayer = ({ relations, getTrackY, isTop }: TextLabelsLayerProps) => {
    return (
        <>
            {relations.map((rel, idx) => {
                const y = getTrackY(rel.trackIndex ?? 0);
                const color = UNIFIED_COLOR;
                const positions = rel.positions
                    .map((p: string | number) => typeof p === 'string' ? parseInt(p) : p)
                    .sort((a: number, b: number) => a - b);

                const fullText = rel.description || rel.type;
                // Check if fullText is defined
                let labelText = '';
                if (fullText) {
                    labelText = rel.isTriple ? fullText : (fullText.length > 3 ? fullText.slice(2) : fullText);
                }
                const textWidth = labelText.length * 14 + 16;
                const sp = rel.span || Math.abs(rel.end - rel.start);

                let midX = 0;
                if (positions.length >= 2) {
                    midX = (getX(positions[0]) + getX(positions[positions.length - 1])) / 2;
                }

                // Check collisions or small spans
                const x1 = getX(positions[0]);
                const xLast = getX(positions[positions.length - 1]);
                const nodeDistance = Math.abs(xLast - x1);

                // Conditions to move label outside (guide line)
                // For Triple (isTriple), we always move it (as per original logic logic: needsGuideLine usually true for triple)
                // Or if span is small or text is wide
                const shouldUseGuide = rel.isTriple || (sp === 1 && labelText.length > 2) || textWidth > nodeDistance - 40;

                if (shouldUseGuide) {
                    // Logic to offset label
                    // isTop=true (TianGan) -> label above (y - 35)
                    // isTop=false (DiZhi) -> label below (y + 35)
                    const labelY = isTop ? y - 35 : y + 35;
                    const lineY2 = isTop ? labelY + 12 : labelY - 12;

                    return (
                        <g key={`labels-${idx}`}>
                            <line x1={midX} y1={y} x2={midX} y2={lineY2} stroke={color} strokeWidth="1" strokeDasharray="2 2" />
                            <g transform={`translate(${midX}, ${labelY})`}>
                                <rect x={-textWidth / 2} y="-12" width={textWidth} height="24" rx="4" fill="hsl(var(--card))" stroke={color} strokeWidth="1" />
                                <text dy="5" textAnchor="middle" fontSize="12" fill={color} fontWeight="500">{labelText}</text>
                            </g>
                        </g>
                    );
                }

                // Standard centered label
                return (
                    <g key={`labels-${idx}`} transform={`translate(${midX}, ${y})`}>
                        <rect x={-textWidth / 2} y="-12" width={textWidth} height="24" rx="4" fill="hsl(var(--card))" stroke={color} strokeWidth="1" />
                        <text dy="5" textAnchor="middle" fontSize="12" fill={color} fontWeight="500">{labelText}</text>
                    </g>
                );
            })}
        </>
    );
};
