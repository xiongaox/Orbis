import { useMemo, useState, useEffect } from 'react';
import { GitBranch } from 'lucide-react';
import BaseModal from '../../UI/BaseModal';
import { createDefaultGanZhiLiuYiSetting } from '../../../lib/xuan-bazi/settings/baziGanZhiLiuYiSetting';
import {
    calculateTianGanLiuYi,
    calculateDiZhiLiuYi
} from '../../../lib/xuan-bazi/utils/baziGanZhiLiuYiUtil';
import { getElementColor } from '../../../lib/xuan-bazi/maps/baziStyleMap';

interface GanZhiDiagramModalProps {
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    baziData: any; // Using any for flexibility as types might need update
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    currentYear?: number;
}

// 统一颜色（使用与流年/大运标签相同的柔和颜色）
const UNIFIED_COLOR = 'hsl(var(--muted-foreground))';

// 轨道分配算法（支持两点和三点关系）
const assignTracks = (relations: any[]) => {
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

export default function GanZhiDiagramModal({
    isOpen,
    onClose,
    baziData,
    selectedDaYunIndex,
    selectedLiuNianYear,
    currentYear = new Date().getFullYear(),
}: GanZhiDiagramModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) setMounted(true);
    }, [isOpen]);

    const [showDaYun, setShowDaYun] = useState(selectedDaYunIndex !== null);
    const [showLiuNian, setShowLiuNian] = useState(selectedLiuNianYear !== null);

    const chartData = useMemo(() => {
        if (!baziData) return null;

        const { pillars, daYun, liuNian } = baziData;

        // 1. 准备天干地支数据
        const staticGans = pillars.map((p: any) => p.tiangan);
        const staticZhis = pillars.map((p: any) => p.dizhi);

        // 确定大运：优先使用选中的，否则根据当前年份查找，再没有则默认取第二个（如果存在）
        let activeDaYun = null;
        if (selectedDaYunIndex !== null && daYun && daYun[selectedDaYunIndex]) {
            activeDaYun = daYun[selectedDaYunIndex];
        } else if (daYun) {
            // 尝试根据当前年份查找
            activeDaYun = daYun.find((dy: any) => currentYear >= dy.startYear && currentYear <= dy.endYear);
            // 如果还没起运或找不到，默认显示第一步大运（索引1），或者索引0（如果是小运且需要的话，但通常大运看1）
            if (!activeDaYun && daYun.length > 1) {
                activeDaYun = daYun[1];
            } else if (!activeDaYun && daYun.length > 0) {
                activeDaYun = daYun[0];
            }
        }
        const currentDaYun = activeDaYun;

        // 确定流年：优先使用选中的，否则查找当前年份
        // 确定流年：优先使用选中的，否则查找当前年份，最后取第一个
        let activeLiuNian = null;
        if (selectedLiuNianYear !== null && liuNian) {
            activeLiuNian = liuNian.find((ln: any) => ln.year === selectedLiuNianYear);
        } else if (liuNian) {
            activeLiuNian = liuNian.find((ln: any) => ln.year === currentYear);
        }
        const currentLiuNian = activeLiuNian;

        const dynamicGans: string[] = [];
        const dynamicZhis: string[] = [];

        if (showDaYun && currentDaYun?.ganZhi) {
            dynamicGans.push(currentDaYun.ganZhi[0]);
            dynamicZhis.push(currentDaYun.ganZhi[1]);
        }

        if (showLiuNian && currentLiuNian?.ganZhi) {
            dynamicGans.push(currentLiuNian.ganZhi[0]);
            dynamicZhis.push(currentLiuNian.ganZhi[1]);
        }

        // 2. 计算关系
        const setting = createDefaultGanZhiLiuYiSetting();
        // 开启天干关系 (0 = 开启, 1 = 关闭)
        setting.tianGanXiangHe = 0;      // 相合 - 开启
        setting.tianGanXiangChong = 0;   // 相冲 - 开启
        setting.tianGanXiangKe = 1;      // 相克 - 关闭
        setting.tianGanXiangSheng = 1;   // 相生 - 关闭

        // 开启地支关系 (0 = 开启)
        setting.diZhiLiuHe = 0;
        setting.diZhiBanHe = 0;
        setting.diZhiXiangChong = 0;
        setting.diZhiXiangXing = 0;
        setting.diZhiXiangPo = 0;
        setting.diZhiXiangHai = 0;
        setting.diZhiSanHe = 0;     // 三合 - 开启
        setting.diZhiSanHui = 0;    // 三会 - 开启
        setting.hideBanHeWhenFullSanHe = 0; // 完整三合时隐藏半合

        const tianGanRelations = calculateTianGanLiuYi(setting, staticGans, dynamicGans);
        const diZhiRelations = calculateDiZhiLiuYi(setting, staticZhis, dynamicZhis);

        // 3. 布局项
        // 为了显示效果，我们将顺序调整为：流年、大运、年、月、日、时
        // 这样符合从左到右的时间流向（外到内）
        // 原始 items 是 [Year, Month, Day, Hour, DaYun, LiuNian]
        // 索引映射：
        // Year: 0 -> Render: 2
        // Month: 1 -> Render: 3
        // Day: 2 -> Render: 4
        // Hour: 3 -> Render: 5
        // DaYun: 0 (dynamic) -> index 4 in data -> Render: 1
        // LiuNian: 1 (dynamic) -> index 5 in data -> Render: 0

        const baseItems = [
            { label: '年柱', gan: pillars[0].tiangan, zhi: pillars[0].dizhi, originalIndex: 0 },
            { label: '月柱', gan: pillars[1].tiangan, zhi: pillars[1].dizhi, originalIndex: 1 },
            { label: '日柱', gan: pillars[2].tiangan, zhi: pillars[2].dizhi, originalIndex: 2 },
            { label: '时柱', gan: pillars[3].tiangan, zhi: pillars[3].dizhi, originalIndex: 3 },
        ];

        const dynamicItems = [];
        let dynamicOffset = 4;

        if (showDaYun && currentDaYun?.ganZhi) {
            dynamicItems.push({ label: '大运', gan: currentDaYun.ganZhi[0], zhi: currentDaYun.ganZhi[1], originalIndex: dynamicOffset++ });
        }

        if (showLiuNian && currentLiuNian?.ganZhi) {
            dynamicItems.push({ label: '流年', gan: currentLiuNian.ganZhi[0], zhi: currentLiuNian.ganZhi[1], originalIndex: dynamicOffset++ });
        }

        // 重新排序：流年、大运、年、月、日、时
        // 注意：dynamicItems 顺序是 大运, 流年。reverse后变成 流年, 大运
        const orderedItems = [...dynamicItems.reverse(), ...baseItems];

        // 建立 originalIndex 到 newIndex 的映射，用于修正 relations 中的 positions
        const indexMap: Record<number, number> = {};
        orderedItems.forEach((item, idx) => {
            indexMap[item.originalIndex] = idx;
        });

        // 修正 relations 的 coordinates（支持两点和三点关系）
        const mapRelations = (relations: any[]) => {
            return relations.map(r => {
                // 映射所有 positions（可能是 2 个或 3 个）
                const mappedPositions = r.positions.map((p: string) => indexMap[parseInt(p)]);
                return {
                    ...r,
                    positions: mappedPositions
                };
            }).filter(r => r.positions.every((p: number | undefined) => p !== undefined));
        };

        const mappedTianGan = mapRelations(tianGanRelations);
        const mappedDiZhi = mapRelations(diZhiRelations);

        // 分配轨道
        const tianGanTracks = assignTracks(mappedTianGan);
        const diZhiTracks = assignTracks(mappedDiZhi);

        return {
            items: orderedItems,
            tianGanData: tianGanTracks,
            diZhiData: diZhiTracks
        };

    }, [baziData, selectedDaYunIndex, selectedLiuNianYear, showDaYun, showLiuNian]);

    if (!isOpen || !mounted) return null;

    // 布局常量
    const ITEM_WIDTH = 60;
    const GAP = 30; // 间距
    const TOTAL_WIDTH = (chartData?.items.length || 0) * ITEM_WIDTH + ((chartData?.items.length || 1) - 1) * GAP;
    const TRACK_HEIGHT = 50; // 每层轨道基础高度
    const GUIDE_LINE_EXTRA = 35; // 有引导线时额外增加的间距
    const CENTER_AREA_HEIGHT = 200; // 中间文字区域高度

    // SVG 内部使用实际计算宽度，通过 viewBox 实现自适应居中
    const SVG_WIDTH = TOTAL_WIDTH + 80; // 内容宽度 + 两侧padding
    const startX = 40 + ITEM_WIDTH / 2; // 左侧 padding 40px
    const getX = (index: number) => startX + index * (ITEM_WIDTH + GAP);

    // 判断关系是否需要引导线的辅助函数
    const needsGuideLine = (rel: any) => {
        // 三点关系（三合/三会）始终使用引导线，将标签放到下方
        if (rel.isTriple) return true;

        const fullText = rel.description || rel.type;
        const labelText = fullText.length > 3 ? fullText.slice(2) : fullText;
        const textWidth = labelText.length * 14 + 16;
        const x1 = getX(rel.start);
        const x2 = getX(rel.end);
        const nodeDistance = Math.abs(x2 - x1);
        const span = rel.span || Math.abs(rel.end - rel.start);
        return (span === 1 && labelText.length > 2) || textWidth > nodeDistance - 40;
    };

    // 计算轨道的累积Y偏移（考虑引导线需要的额外空间）
    const calculateTrackY = (relations: any[], baseY: number, isTop: boolean) => {
        // 按轨道分组，检查每个轨道是否有需要引导线的关系
        const tracksWithGuide: Set<number> = new Set();
        relations.forEach((rel: any) => {
            if (needsGuideLine(rel)) {
                tracksWithGuide.add(rel.trackIndex);
            }
        });

        // 计算每个轨道的实际Y位置
        const trackPositions: number[] = [];
        let cumulativeY = baseY;
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
    const calculateActualHeight = (relations: any[]) => {
        const tracksWithGuide = new Set<number>();
        relations.forEach((rel: any) => {
            if (needsGuideLine(rel)) {
                tracksWithGuide.add(rel.trackIndex);
            }
        });
        const maxTrack = Math.max(...relations.map((r: any) => r.trackIndex), -1);
        let height = 40;
        for (let i = 0; i <= maxTrack; i++) {
            height += TRACK_HEIGHT + (tracksWithGuide.has(i) ? GUIDE_LINE_EXTRA : 0);
        }
        return height;
    };

    const topHeight = chartData ? calculateActualHeight(chartData.tianGanData.relationsWithTracks) : 40;
    const bottomHeight = chartData ? calculateActualHeight(chartData.diZhiData.relationsWithTracks) : 40;
    const totalHeight = topHeight + CENTER_AREA_HEIGHT + bottomHeight;

    const centerY = topHeight + CENTER_AREA_HEIGHT / 2;
    // 天干文字Y坐标
    const ganTextY = centerY - 50;
    // 地支文字Y坐标
    const zhiTextY = centerY + 50;
    // 标签Y坐标
    const labelY = centerY;

    // 获取轨道Y坐标的函数
    const getGanTrackY = chartData ? calculateTrackY(chartData.tianGanData.relationsWithTracks, ganTextY - 50, true) : () => 0;
    const getDiZhiTrackY = chartData ? calculateTrackY(chartData.diZhiData.relationsWithTracks, zhiTextY + 50, false) : () => 0;

    // Header Content
    const header = (
        <div className="flex items-center justify-between w-full">
            <span className="text-lg font-medium text-foreground">干支流通图解</span>
            <div className="flex items-center gap-2 mr-6">
                {showLiuNian && (!chartData?.items.find((i: any) => i.label === '流年')) && (
                    <span className="text-sm text-yellow-500 animate-pulse inline-block">请先选择流年</span>
                )}
                <button
                    onClick={() => setShowLiuNian(!showLiuNian)}
                    className={`px-3 py-1 text-sm rounded-md border transition-colors focus-ring ${showLiuNian
                        ? 'bg-primary/20 text-primary border-primary/50'
                        : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                        }`}
                >
                    流年
                </button>
                <button
                    onClick={() => setShowDaYun(!showDaYun)}
                    className={`px-3 py-1 text-sm rounded-md border transition-colors focus-ring ${showDaYun
                        ? 'bg-primary/20 text-primary border-primary/50'
                        : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                        }`}
                >
                    大运
                </button>
            </div>
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={header}
            titleIcon={<GitBranch className="w-5 h-5" />}
            maxWidth="max-w-[720px]"
            bodyClassName="p-0 overflow-hidden flex flex-col bg-dot-pattern min-h-[500px]"
        >
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex">
                {chartData && (
                    <div className="relative m-auto transition-all duration-300">
                        <svg
                            width={SVG_WIDTH}
                            height={totalHeight}
                            viewBox={`0 0 ${SVG_WIDTH} ${totalHeight}`}
                            className="max-w-full block"
                            style={{
                                height: 'auto',
                                maxWidth: SVG_WIDTH,
                            }}
                            preserveAspectRatio="xMidYMid meet"
                        >
                            {/* Defs for gradients or markers if needed */}
                            <defs>
                                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.1" />
                                </filter>
                            </defs>

                            {/* 1. 天干关系 (Top area) - 分层渲染 */}
                            {/* 1.1 第一层：所有虚线（按轨道从外到内排序，确保外层先渲染） */}
                            {[...chartData.tianGanData.relationsWithTracks]
                                .sort((a: any, b: any) => b.trackIndex - a.trackIndex)
                                .map((rel: any, idx: number) => {
                                    const x1 = getX(rel.start);
                                    const x2 = getX(rel.end);
                                    const y = getGanTrackY(rel.trackIndex);
                                    const color = UNIFIED_COLOR;
                                    return (
                                        <g key={`tg-lines-${idx}`}>
                                            {/* Connecting Line */}
                                            <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="1" strokeOpacity="0.6" />
                                            {/* Vertical Connectors */}
                                            <line x1={x1} y1={y} x2={x1} y2={ganTextY - 25} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                                            <line x1={x2} y1={y} x2={x2} y2={ganTextY - 25} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                                        </g>
                                    );
                                })}

                            {/* 1.2 第二层：所有圆形节点（在虚线之上） */}
                            {chartData.tianGanData.relationsWithTracks.map((rel: any, idx: number) => {
                                const x1 = getX(rel.start);
                                const x2 = getX(rel.end);
                                const y = getGanTrackY(rel.trackIndex);
                                const color = UNIFIED_COLOR;
                                const item1 = chartData.items[rel.start];
                                const item2 = chartData.items[rel.end];
                                return (
                                    <g key={`tg-circles-${idx}`}>
                                        <circle cx={x1} cy={y} r="16" fill="hsl(var(--background))" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
                                        <text x={x1} y={y} dy="5" textAnchor="middle" fontSize="14" fill={getElementColor(item1.gan)} fontWeight="bold">{item1.gan}</text>
                                        <circle cx={x2} cy={y} r="16" fill="hsl(var(--background))" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
                                        <text x={x2} y={y} dy="5" textAnchor="middle" fontSize="14" fill={getElementColor(item2.gan)} fontWeight="bold">{item2.gan}</text>
                                    </g>
                                );
                            })}

                            {/* 1.3 第三层：所有标签（在最上层） */}
                            {chartData.tianGanData.relationsWithTracks.map((rel: any, idx: number) => {
                                const x1 = getX(rel.start);
                                const x2 = getX(rel.end);
                                const y = getGanTrackY(rel.trackIndex);
                                const color = UNIFIED_COLOR;

                                const fullText = rel.description || rel.type;
                                const labelText = fullText.length > 3 ? fullText.slice(2) : fullText;
                                const textWidth = labelText.length * 14 + 16;
                                const nodeDistance = Math.abs(x2 - x1);
                                const midX = (x1 + x2) / 2;
                                const span = rel.span || Math.abs(rel.end - rel.start);

                                if ((span === 1 && labelText.length > 2) || textWidth > nodeDistance - 40) {
                                    const labelY = y - 35;
                                    return (
                                        <g key={`tg-labels-${idx}`}>
                                            <line x1={midX} y1={y} x2={midX} y2={labelY + 12} stroke={color} strokeWidth="1" strokeDasharray="2 2" />
                                            <g transform={`translate(${midX}, ${labelY})`}>
                                                <rect x={-textWidth / 2} y="-12" width={textWidth} height="24" rx="4" fill="hsl(var(--card))" stroke={color} strokeWidth="1" />
                                                <text dy="5" textAnchor="middle" fontSize="12" fill={color} fontWeight="500">{labelText}</text>
                                            </g>
                                        </g>
                                    );
                                }
                                return (
                                    <g key={`tg-labels-${idx}`} transform={`translate(${midX}, ${y})`}>
                                        <rect x={-textWidth / 2} y="-12" width={textWidth} height="24" rx="4" fill="hsl(var(--card))" stroke={color} strokeWidth="1" />
                                        <text dy="5" textAnchor="middle" fontSize="12" fill={color} fontWeight="500">{labelText}</text>
                                    </g>
                                );
                            })}

                            {/* 2. 地支关系 (Bottom area) - 分层渲染 */}
                            {/* 2.1 第一层：所有连接线（按轨道从外到内排序） */}
                            {[...chartData.diZhiData.relationsWithTracks]
                                .sort((a: any, b: any) => b.trackIndex - a.trackIndex)
                                .map((rel: any, idx: number) => {
                                    const y = getDiZhiTrackY(rel.trackIndex);
                                    const color = UNIFIED_COLOR;
                                    const positions = rel.positions.map((p: string) => parseInt(p)).sort((a: number, b: number) => a - b);

                                    // 三点关系（三合/三会）：用曲线连接
                                    if (positions.length === 3) {
                                        const [p1, p2, p3] = positions;
                                        const x1 = getX(p1);
                                        const x2 = getX(p2);
                                        const x3 = getX(p3);
                                        // 使用三段直线连接，中间点略微下沉形成折线效果
                                        return (
                                            <g key={`dz-lines-${idx}`}>
                                                {/* 主连接线：两段 */}
                                                <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="1.5" strokeOpacity="0.7" />
                                                <line x1={x2} y1={y} x2={x3} y2={y} stroke={color} strokeWidth="1.5" strokeOpacity="0.7" />
                                                {/* 中间点标记 */}
                                                <circle cx={x2} cy={y} r="4" fill={color} fillOpacity="0.4" />
                                                {/* 虚线连接到地支文字 */}
                                                <line x1={x1} y1={y} x2={x1} y2={zhiTextY + 25} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                                                <line x1={x2} y1={y} x2={x2} y2={zhiTextY + 25} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                                                <line x1={x3} y1={y} x2={x3} y2={zhiTextY + 25} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                                            </g>
                                        );
                                    }

                                    // 两点关系：原有逻辑
                                    const x1 = getX(rel.start);
                                    const x2 = getX(rel.end);
                                    return (
                                        <g key={`dz-lines-${idx}`}>
                                            <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="1" strokeOpacity="0.6" />
                                            <line x1={x1} y1={y} x2={x1} y2={zhiTextY + 25} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                                            <line x1={x2} y1={y} x2={x2} y2={zhiTextY + 25} stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                                        </g>
                                    );
                                })}

                            {/* 2.2 第二层：所有圆形节点 */}
                            {chartData.diZhiData.relationsWithTracks.map((rel: any, idx: number) => {
                                const y = getDiZhiTrackY(rel.trackIndex);
                                const color = UNIFIED_COLOR;
                                const positions = rel.positions.map((p: string) => parseInt(p)).sort((a: number, b: number) => a - b);

                                // 三点关系
                                if (positions.length === 3) {
                                    const items = positions.map((p: number) => chartData.items[p]);
                                    const xs = positions.map((p: number) => getX(p));
                                    return (
                                        <g key={`dz-circles-${idx}`}>
                                            {xs.map((x: number, i: number) => (
                                                <g key={i}>
                                                    <circle cx={x} cy={y} r="16" fill="hsl(var(--background))" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
                                                    <text x={x} y={y} dy="5" textAnchor="middle" fontSize="14" fill={getElementColor(items[i].zhi)} fontWeight="bold">{items[i].zhi}</text>
                                                </g>
                                            ))}
                                        </g>
                                    );
                                }

                                // 两点关系
                                const x1 = getX(rel.start);
                                const x2 = getX(rel.end);
                                const item1 = chartData.items[rel.start];
                                const item2 = chartData.items[rel.end];
                                return (
                                    <g key={`dz-circles-${idx}`}>
                                        <circle cx={x1} cy={y} r="16" fill="hsl(var(--background))" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
                                        <text x={x1} y={y} dy="5" textAnchor="middle" fontSize="14" fill={getElementColor(item1.zhi)} fontWeight="bold">{item1.zhi}</text>
                                        <circle cx={x2} cy={y} r="16" fill="hsl(var(--background))" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
                                        <text x={x2} y={y} dy="5" textAnchor="middle" fontSize="14" fill={getElementColor(item2.zhi)} fontWeight="bold">{item2.zhi}</text>
                                    </g>
                                );
                            })}

                            {/* 2.3 第三层：所有标签 */}
                            {chartData.diZhiData.relationsWithTracks.map((rel: any, idx: number) => {
                                const y = getDiZhiTrackY(rel.trackIndex);
                                const color = UNIFIED_COLOR;
                                const positions = rel.positions.map((p: string) => parseInt(p)).sort((a: number, b: number) => a - b);

                                const fullText = rel.description || rel.type;
                                // 三合/三会的描述直接使用完整文字
                                const labelText = rel.isTriple ? fullText : (fullText.length > 3 ? fullText.slice(2) : fullText);
                                const textWidth = labelText.length * 14 + 16;

                                // 三点关系：标签放在整体中间位置
                                if (positions.length === 3) {
                                    const x1 = getX(positions[0]);
                                    const x3 = getX(positions[2]);
                                    const midX = (x1 + x3) / 2;
                                    const labelY = y + 35; // 标签放在连接线下方
                                    return (
                                        <g key={`dz-labels-${idx}`}>
                                            <line x1={midX} y1={y} x2={midX} y2={labelY - 12} stroke={color} strokeWidth="1" strokeDasharray="2 2" />
                                            <g transform={`translate(${midX}, ${labelY})`}>
                                                <rect x={-textWidth / 2} y="-12" width={textWidth} height="24" rx="4" fill="hsl(var(--card))" stroke={color} strokeWidth="1" />
                                                <text dy="5" textAnchor="middle" fontSize="12" fill={color} fontWeight="500">{labelText}</text>
                                            </g>
                                        </g>
                                    );
                                }

                                // 两点关系：原有逻辑
                                const x1 = getX(rel.start);
                                const x2 = getX(rel.end);
                                const nodeDistance = Math.abs(x2 - x1);
                                const midX = (x1 + x2) / 2;
                                const span = rel.span || Math.abs(rel.end - rel.start);

                                if ((span === 1 && labelText.length > 2) || textWidth > nodeDistance - 40) {
                                    const labelY = y + 35;
                                    return (
                                        <g key={`dz-labels-${idx}`}>
                                            <line x1={midX} y1={y} x2={midX} y2={labelY - 12} stroke={color} strokeWidth="1" strokeDasharray="2 2" />
                                            <g transform={`translate(${midX}, ${labelY})`}>
                                                <rect x={-textWidth / 2} y="-12" width={textWidth} height="24" rx="4" fill="hsl(var(--card))" stroke={color} strokeWidth="1" />
                                                <text dy="5" textAnchor="middle" fontSize="12" fill={color} fontWeight="500">{labelText}</text>
                                            </g>
                                        </g>
                                    );
                                }
                                return (
                                    <g key={`dz-labels-${idx}`} transform={`translate(${midX}, ${y})`}>
                                        <rect x={-textWidth / 2} y="-12" width={textWidth} height="24" rx="4" fill="hsl(var(--card))" stroke={color} strokeWidth="1" />
                                        <text dy="5" textAnchor="middle" fontSize="12" fill={color} fontWeight="500">{labelText}</text>
                                    </g>
                                );
                            })}

                            {/* 3. 中间文字区域 (Central Pillars) */}
                            {chartData.items.map((item: any, index: number) => {
                                const x = getX(index);
                                const isDynamic = item.label === '流年' || item.label === '大运';

                                return (
                                    <g key={index}>
                                        <text
                                            x={x}
                                            y={labelY}
                                            textAnchor="middle"
                                            fontSize="12"
                                            fill="hsl(var(--muted-foreground))"
                                            className="select-none"
                                        >
                                            {item.label}
                                        </text>
                                        <text
                                            x={x}
                                            y={ganTextY}
                                            dy="5"
                                            textAnchor="middle"
                                            fontSize="24"
                                            fontWeight="bold"
                                            fill={getElementColor(item.gan)}
                                            className="select-none font-display"
                                            style={{ opacity: isDynamic ? 0.9 : 1 }}
                                        >
                                            {item.gan}
                                        </text>
                                        <text
                                            x={x}
                                            y={zhiTextY}
                                            dy="5"
                                            textAnchor="middle"
                                            fontSize="24"
                                            fontWeight="bold"
                                            fill={getElementColor(item.zhi)}
                                            className="select-none font-display"
                                            style={{ opacity: isDynamic ? 0.9 : 1 }}
                                        >
                                            {item.zhi}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                )}
            </div>
        </BaseModal>
    );
}
