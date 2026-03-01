/**
 * NodesLayer - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `NodesLayer`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `useGanZhiLayout`、内部模块 `baziStyleMap`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

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
