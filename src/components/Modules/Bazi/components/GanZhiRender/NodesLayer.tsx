import { getX, UNIFIED_COLOR, type Relation } from '../../hooks/useGanZhiLayout';
import { getElementColor } from '../../../../../lib/xuan-bazi/maps/baziStyleMap';

interface NodesLayerProps {
    relations: Relation[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[];
    getTrackY: (index: number) => number;
    useGan?: boolean; // True to display gan, false for zhi
}

export const NodesLayer = ({ relations, items, getTrackY, useGan = true }: NodesLayerProps) => {
    return (
        <>
            {relations.map((rel, idx) => {
                const y = getTrackY(rel.trackIndex ?? 0);
                const color = UNIFIED_COLOR;
                // Fix: explicit map output to number to solve 'number | undefined'
                const positions = rel.positions
                    .map((p: string | number) => typeof p === 'string' ? parseInt(p) : p)
                    .sort((a: number, b: number) => a - b);

                // Helper to render a single node
                const renderNode = (index: number, key: string) => {
                    const item = items[index];
                    const text = useGan ? item.gan : item.zhi;
                    const x = getX(index);
                    return (
                        <g key={key}>
                            <circle cx={x} cy={y} r="16" fill="hsl(var(--background))" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
                            <text x={x} y={y} dy="5" textAnchor="middle" fontSize="14" fill={getElementColor(text)} fontWeight="bold">{text}</text>
                        </g>
                    );
                };

                return (
                    <g key={`nodes-${idx}`}>
                        {positions.map((pos: number, i: number) => renderNode(pos, `node-${idx}-${i}`))}
                    </g>
                );
            })}
        </>
    );
};
