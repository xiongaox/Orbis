import { useMemo, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { BaziApiResponse } from '../../../types/bazi';
import { createDefaultGanZhiLiuYiSetting } from '../../../lib/xuan-bazi/settings/baziGanZhiLiuYiSetting';
import {
    calculateTianGanLiuYi,
    calculateDiZhiLiuYi
} from '../../../lib/xuan-bazi/utils/baziGanZhiLiuYiUtil';
import { getElementColor } from '../../../utils/metaphysics';

interface GanZhiDiagramModalProps {
    isOpen: boolean;
    onClose: () => void;
    baziData: BaziApiResponse | null;
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    currentYear?: number;
}

// 关系颜色映射
const RELATION_COLORS: Record<string, string> = {
    '相生': '#d8b4fe', // 紫色
    '相克': '#fca5a5', // 红色
    '相冲': '#f87171', // 红色
    '相合': '#fcd34d', //由于金色
    '六合': '#fcd34d', // 金色
    '半合': '#86efac', // 绿色
    '三合': '#4ade80', // 绿色
    '暗合': '#94a3b8', // 灰色
    '相刑': '#fbbf24', // 橙色
    '相害': '#c084fc', // 紫色
    '相破': '#a78bfa', // 紫色
};

// 连线组件
const RelationshipLine = ({
    start,
    end,
    label,
    type,
    isTop,
    totalHeight = 200,
}: {
    start: number;
    end: number;
    label: string;
    type: string;
    isTop: boolean;
    totalHeight?: number;
}) => {
    // 计算贝塞尔曲线控制点
    const x1 = start;
    const x2 = end;

    // 基础高度偏移
    const baseY = isTop ? 40 : totalHeight - 40;

    // 弧度高度：根据距离动态调整，距离越远弧度越高
    const dist = Math.abs(x2 - x1);
    const arcHeight = Math.min(60, 30 + dist * 0.15);
    const controlY = isTop ? baseY + arcHeight : baseY - arcHeight;

    // 颜色
    const color = RELATION_COLORS[type] || '#cbd5e1';

    // 标签位置（曲线顶点）
    const labelX = (x1 + x2) / 2;
    const labelY = isTop ? baseY + arcHeight * 0.7 : baseY - arcHeight * 0.7;

    return (
        <g>
            <path
                d={`M ${x1} ${baseY} Q ${labelX} ${controlY} ${x2} ${baseY}`}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                className="transition-all duration-500 ease-in-out"
            />
            <rect
                x={labelX - 14}
                y={labelY - 10}
                width="28"
                height="20"
                fill="var(--background)"
                rx="4"
                className="stroke-border stroke-1"
            />
            <text
                x={labelX}
                y={labelY + 4}
                textAnchor="middle"
                fontSize="10"
                fill="var(--foreground)"
                className="pointer-events-none select-none"
            >
                {label === '相克' || label === '相冲' ? label : type}
            </text>
        </g>
    );
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

    const chartData = useMemo(() => {
        if (!baziData) return null;

        const { pillars, daYun, liuNian } = baziData;

        // 1. 准备天干地支数据
        const staticGans = pillars.map(p => p.tiangan);
        const staticZhis = pillars.map(p => p.dizhi);

        // 确定大运
        const activeDaYunIndex = selectedDaYunIndex ?? daYun.find(dy =>
            currentYear >= dy.startYear && currentYear <= dy.endYear
        )?.index ?? 1;
        const currentDaYun = daYun.find(dy => dy.index === activeDaYunIndex);

        // 确定流年
        const activeLiuNianYear = selectedLiuNianYear ?? currentYear;
        const currentLiuNian = liuNian.find(ln => ln.year === activeLiuNianYear);

        const dynamicGans: string[] = [];
        const dynamicZhis: string[] = [];
        const dynamicLabels: string[] = [];

        if (currentDaYun?.ganZhi) {
            dynamicGans.push(currentDaYun.ganZhi[0]);
            dynamicZhis.push(currentDaYun.ganZhi[1]);
            dynamicLabels.push('大运');
        }

        if (currentLiuNian?.ganZhi) {
            dynamicGans.push(currentLiuNian.ganZhi[0]);
            dynamicZhis.push(currentLiuNian.ganZhi[1]);
            dynamicLabels.push('流年');
        }

        // 2. 计算关系
        const setting = createDefaultGanZhiLiuYiSetting();
        // 开启天干相合相冲
        setting.tianGanXiangHe = 0;
        setting.tianGanXiangChong = 0;
        setting.tianGanXiangKe = 0;
        setting.tianGanXiangSheng = 1; // 默认关闭相生，避免太乱？参考截图是有相生的
        // 截图中有"相生"，所以开启相生
        setting.tianGanXiangSheng = 0;

        // 开启地支所有
        setting.diZhiLiuHe = 0;
        setting.diZhiBanHe = 0;
        setting.diZhiXiangChong = 0;
        setting.diZhiXiangXing = 0;
        setting.diZhiXiangPo = 0;
        setting.diZhiXiangHai = 0;

        const tianGanRelations = calculateTianGanLiuYi(setting, staticGans, dynamicGans);
        const diZhiRelations = calculateDiZhiLiuYi(setting, staticZhis, dynamicZhis);

        // 3. 布局计算
        // 总项数 = 4柱 + 动态柱数
        const items = [
            { label: '年柱', gan: pillars[0].tiangan, zhi: pillars[0].dizhi },
            { label: '月柱', gan: pillars[1].tiangan, zhi: pillars[1].dizhi },
            { label: '日柱', gan: pillars[2].tiangan, zhi: pillars[2].dizhi },
            { label: '时柱', gan: pillars[3].tiangan, zhi: pillars[3].dizhi },
        ];

        if (currentDaYun?.ganZhi) {
            items.push({ label: '大运', gan: currentDaYun.ganZhi[0], zhi: currentDaYun.ganZhi[1] });
        }
        if (currentLiuNian?.ganZhi) {
            items.push({ label: '流年', gan: currentLiuNian.ganZhi[0], zhi: currentLiuNian.ganZhi[1] });
        }

        return { items, tianGanRelations, diZhiRelations };
    }, [baziData, selectedDaYunIndex, selectedLiuNianYear, currentYear]);

    if (!isOpen || !mounted) return null;

    // 容器宽度
    const containerWidth = 800; // 假设模态框宽度
    const itemWidth = 80;
    const gap = (containerWidth - (itemWidth * (chartData?.items.length || 6))) / ((chartData?.items.length || 6) + 1);
    const centerX = (index: number) => gap + index * (itemWidth + gap) + itemWidth / 2;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-medium text-foreground">干支图解（年柱、月柱、日柱、时柱、大运、流年）</h2>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center min-h-[500px] relative select-none">
                    {chartData && (
                        <div className="relative w-full max-w-[800px] h-[500px]">

                            {/* SVG Layer */}
                            <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                                {/* 天干连线 */}
                                {chartData.tianGanRelations.map((rel, idx) => {
                                    const i = parseInt(rel.positions[0]);
                                    const j = parseInt(rel.positions[1]);
                                    return (
                                        <RelationshipLine
                                            key={`tg-${idx}`}
                                            start={centerX(i)}
                                            end={centerX(j)}
                                            label={rel.description}
                                            type={rel.type}
                                            isTop={true}
                                        />
                                    );
                                })}

                                {/* 地支连线 */}
                                {chartData.diZhiRelations.map((rel, idx) => {
                                    const i = parseInt(rel.positions[0]);
                                    const j = parseInt(rel.positions[1]);
                                    return (
                                        <RelationshipLine
                                            key={`dz-${idx}`}
                                            start={centerX(i)}
                                            end={centerX(j)}
                                            label={rel.description}
                                            type={rel.type}
                                            isTop={false}
                                            totalHeight={500}
                                        />
                                    );
                                })}
                            </svg>

                            {/* Elements Layer */}
                            <div className="absolute inset-0 z-20 flex justify-between px-[5%] items-center h-full pointer-events-none">
                                {/* 这里不用 flex 布局，而是用 absolute 定位以匹配 SVG 坐标 */}
                                {chartData.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="absolute top-0 bottom-0 w-[80px] flex flex-col items-center justify-center gap-12"
                                        style={{ left: centerX(index) - 40 }}
                                    >
                                        {/* 天干 */}
                                        <div className="flex flex-col items-center gap-2 mt-[60px]">
                                            <span className="text-3xl font-display font-bold" style={{ color: getElementColor(item.gan) }}>
                                                {item.gan}
                                            </span>
                                        </div>

                                        {/* 标签 */}
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-xs text-muted-foreground">{item.label}</span>
                                        </div>

                                        {/* 地支 */}
                                        <div className="flex flex-col items-center gap-2 mb-[60px]">
                                            <span className="text-3xl font-display font-bold" style={{ color: getElementColor(item.zhi) }}>
                                                {item.zhi}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Middle Divider Line */}
                            {/* 淡淡的分割线 */}
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-border/50 -translate-y-1/2" />

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
