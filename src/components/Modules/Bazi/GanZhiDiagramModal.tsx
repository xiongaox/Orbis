/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { GitBranch } from 'lucide-react';
import BaseModal from '../../UI/BaseModal';
import { createDefaultGanZhiLiuYiSetting } from '../../../lib/xuan-bazi/settings/baziGanZhiLiuYiSetting';
import {
    calculateTianGanLiuYi,
    calculateDiZhiLiuYi
} from '../../../lib/xuan-bazi/utils/baziGanZhiLiuYiUtil';
import { getElementColor } from '../../../lib/xuan-bazi/maps/baziStyleMap';
import {
    assignTracks,
    calculateActualHeight,
    calculateTrackY,
    getX,
    ITEM_WIDTH,
    GAP,
} from './hooks/useGanZhiLayout';
import { RelationsLayer } from './components/GanZhiRender/RelationsLayer';
import { NodesLayer } from './components/GanZhiRender/NodesLayer';
import { TextLabelsLayer } from './components/GanZhiRender/TextLabelsLayer';

interface GanZhiDiagramModalProps {
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    baziData: any; // Using any for flexibility as types might need update
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    currentYear?: number;
}

const CENTER_AREA_HEIGHT = 200; // 中间文字区域高度

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

    // 移动端捏合缩放 - 使用 callback ref 确保 DOM 变化时重新绑定
    const [scale, setScale] = useState(1);
    const lastDistRef = useRef<number | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    const containerRef = useCallback((el: HTMLDivElement | null) => {
        // 清理旧事件
        cleanupRef.current?.();
        cleanupRef.current = null;

        if (!el) return;

        const getDist = (e: TouchEvent) => {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            return Math.hypot(dx, dy);
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                lastDistRef.current = getDist(e);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && lastDistRef.current !== null) {
                e.preventDefault();
                const dist = getDist(e);
                const ratio = dist / lastDistRef.current;
                setScale(prev => Math.min(3, Math.max(0.5, prev * ratio)));
                lastDistRef.current = dist;
            }
        };

        const handleTouchEnd = () => {
            lastDistRef.current = null;
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);

        cleanupRef.current = () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    // 双击重置缩放
    const onDoubleClick = useCallback(() => {
        setScale(1);
    }, []);

    const chartData = useMemo(() => {
        if (!baziData) return null;

        const { pillars, daYun, liuNian } = baziData;

        // 1. 准备天干地支数据
        const staticGans = pillars.map((p: any) => p.tiangan);
        const staticZhis = pillars.map((p: any) => p.dizhi);

        // 确定大运
        let activeDaYun = null;
        if (selectedDaYunIndex !== null && daYun && daYun[selectedDaYunIndex]) {
            activeDaYun = daYun[selectedDaYunIndex];
        } else if (daYun) {
            activeDaYun = daYun.find((dy: any) => currentYear >= dy.startYear && currentYear <= dy.endYear);
            if (!activeDaYun && daYun.length > 1) {
                activeDaYun = daYun[1];
            } else if (!activeDaYun && daYun.length > 0) {
                activeDaYun = daYun[0];
            }
        }
        const currentDaYun = activeDaYun;

        // 确定流年
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
        // 开启天干关系
        setting.tianGanXiangHe = 0;
        setting.tianGanXiangChong = 0;
        setting.tianGanXiangKe = 1;
        setting.tianGanXiangSheng = 1;

        // 开启地支关系
        setting.diZhiLiuHe = 0;
        setting.diZhiBanHe = 0;
        setting.diZhiXiangChong = 0;
        setting.diZhiXiangXing = 0;
        setting.diZhiXiangPo = 0;
        setting.diZhiXiangHai = 0;
        setting.diZhiSanHe = 0;
        setting.diZhiSanHui = 0;
        setting.hideBanHeWhenFullSanHe = 0;

        const tianGanRelations = calculateTianGanLiuYi(setting, staticGans, dynamicGans);
        const diZhiRelations = calculateDiZhiLiuYi(setting, staticZhis, dynamicZhis);

        // 3. 布局项
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

        const orderedItems = [...dynamicItems.reverse(), ...baseItems];

        const indexMap: Record<number, number> = {};
        orderedItems.forEach((item, idx) => {
            indexMap[item.originalIndex] = idx;
        });

        const mapRelations = (relations: any[]) => {
            return relations.map(r => {
                const mappedPositions = r.positions.map((p: string) => indexMap[parseInt(p)]);
                return {
                    ...r,
                    positions: mappedPositions
                };
            }).filter(r => r.positions.every((p: number | undefined) => p !== undefined));
        };

        const mappedTianGan = mapRelations(tianGanRelations);
        const mappedDiZhi = mapRelations(diZhiRelations);

        const tianGanTracks = assignTracks(mappedTianGan);
        const diZhiTracks = assignTracks(mappedDiZhi);

        return {
            items: orderedItems,
            tianGanData: tianGanTracks,
            diZhiData: diZhiTracks
        };

    }, [baziData, selectedDaYunIndex, selectedLiuNianYear, showDaYun, showLiuNian]);

    if (!isOpen || !mounted) return null;

    const TOTAL_WIDTH = (chartData?.items.length || 0) * ITEM_WIDTH + ((chartData?.items.length || 1) - 1) * GAP;
    const SVG_WIDTH = TOTAL_WIDTH + 80;

    const topHeight = chartData ? calculateActualHeight(chartData.tianGanData.relationsWithTracks) : 40;
    const bottomHeight = chartData ? calculateActualHeight(chartData.diZhiData.relationsWithTracks) : 40;
    const totalHeight = topHeight + CENTER_AREA_HEIGHT + bottomHeight;

    const centerY = topHeight + CENTER_AREA_HEIGHT / 2;
    const ganTextY = centerY - 50;
    const zhiTextY = centerY + 50;
    const labelY = centerY;

    const getGanTrackY = chartData ? calculateTrackY(chartData.tianGanData.relationsWithTracks, ganTextY - 50, true) : () => 0;
    const getDiZhiTrackY = chartData ? calculateTrackY(chartData.diZhiData.relationsWithTracks, zhiTextY + 50, false) : () => 0;

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
            <div
                ref={containerRef}
                className="flex-1 overflow-auto p-4 sm:p-8 flex"
                onDoubleClick={onDoubleClick}
                style={{ touchAction: 'pan-x pan-y' }}
            >
                {chartData && (
                    <div
                        className="relative m-auto transition-all duration-300"
                        style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
                    >
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
                            <defs>
                                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.1" />
                                </filter>
                            </defs>

                            {/* 1. 天干关系 */}
                            <RelationsLayer
                                relations={chartData.tianGanData.relationsWithTracks}
                                getTrackY={getGanTrackY}
                                textY={ganTextY}
                                isTop={true}
                            />
                            <NodesLayer
                                relations={chartData.tianGanData.relationsWithTracks}
                                items={chartData.items}
                                getTrackY={getGanTrackY}
                                useGan={true}
                            />
                            <TextLabelsLayer
                                relations={chartData.tianGanData.relationsWithTracks}
                                getTrackY={getGanTrackY}
                                isTop={true}
                            />

                            {/* 2. 地支关系 */}
                            <RelationsLayer
                                relations={chartData.diZhiData.relationsWithTracks}
                                getTrackY={getDiZhiTrackY}
                                textY={zhiTextY}
                                isTop={false}
                            />
                            <NodesLayer
                                relations={chartData.diZhiData.relationsWithTracks}
                                items={chartData.items}
                                getTrackY={getDiZhiTrackY}
                                useGan={false}
                            />
                            <TextLabelsLayer
                                relations={chartData.diZhiData.relationsWithTracks}
                                getTrackY={getDiZhiTrackY}
                                isTop={false}
                            />

                            {/* 3. 中间文字区域 */}
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
