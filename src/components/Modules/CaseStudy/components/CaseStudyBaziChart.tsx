import { useMemo } from 'react';
import type { BaziApiResponse, PillarData } from '../../../../types/bazi';
import { getElementColor } from '../../../../lib/xuan-bazi/maps/baziStyleMap';
import { calculateWuxingStatus } from '../../../../lib/xuan-bazi/utils/wuxingStatusUtil';
import { computePillarDetails } from '../../../Modules/Bazi/utils/baziChartUtils';
import { calculateShenSha, calculateDynamicShenSha, getJiJie, type ShenShaContext } from '../../../../lib/xuan-bazi/utils/baziShenShaUtil';
import { createDefaultShenShaSetting } from '../../../../lib/xuan-bazi/settings/baziShenShaSetting';

interface CaseStudyBaziChartProps {
    data: BaziApiResponse | null;
    loading?: boolean;
    selectedDaYunIndex?: number | null;
    selectedLiuNianYear?: number | null;
    isMobile?: boolean;
}

/** 精简版柱位卡片 */
function SimplePillarCard({
    pillar,
    isDayMaster = false,
    genderLabel = '日主',
    isYunPillar = false,
    isMobile = false,
    shensha = [],
}: {
    pillar: PillarData;
    isDayMaster?: boolean;
    genderLabel?: string;
    isYunPillar?: boolean;
    isMobile?: boolean;
    shensha?: string[];
}) {
    return (
        <div className={`h-full flex flex-col ${isDayMaster ? 'bg-primary/5' : ''} ${isYunPillar ? 'bg-accent/5' : ''}`}>
            <div className={`${isMobile ? 'h-6' : 'h-8'} flex items-center justify-center border-b border-border ${isYunPillar ? 'bg-accent/10' : 'bg-secondary/30'}`}>
                <span className={`${isMobile ? 'text-[12px]' : 'text-xs'} ${isYunPillar ? 'text-foreground/70 font-medium' : 'text-muted-foreground'}`}>{pillar.label}</span>
            </div>
            <div className={`${isMobile ? 'h-7' : 'h-10'} flex items-center justify-center border-b border-border`}>
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground`}>{isDayMaster ? genderLabel : pillar.tianganShiShen}</span>
            </div>
            <div className={`${isMobile ? 'h-10' : 'h-14'} flex items-center justify-center border-b border-border`}>
                <span
                    className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-display font-semibold`}
                    style={{ color: getElementColor(pillar.tiangan) }}
                >
                    {pillar.tiangan}
                </span>
            </div>
            <div className={`${isMobile ? 'h-10' : 'h-14'} flex items-center justify-center border-b border-border`}>
                <span
                    className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-display font-semibold`}
                    style={{ color: getElementColor(pillar.dizhi) }}
                >
                    {pillar.dizhi}
                </span>
            </div>
            <div className={`${isMobile ? 'min-h-[70px] px-[2px] py-1.5' : 'min-h-[90px] p-1.5'} border-b border-border flex flex-col justify-start gap-0.5`}>
                {pillar.zanggan.map((item, index) => (
                    <div key={`${item.gan}-${index}`} className={`flex items-center justify-center ${isMobile ? 'gap-0' : 'gap-1'} ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        <span className="font-medium" style={{ color: getElementColor(item.gan) }}>
                            {item.gan}
                        </span>
                        <span className="text-muted-foreground">{item.shiShen}</span>
                    </div>
                ))}
            </div>
            <div className={`${isMobile ? 'h-7' : 'h-10'} flex items-center justify-center border-b border-border`}>
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground`}>{pillar.diShi}</span>
            </div>
            <div className={`${isMobile ? 'h-7' : 'h-10'} flex items-center justify-center border-b border-border`}>
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground`}>{pillar.ziZuo}</span>
            </div>
            <div className={`${isMobile ? 'h-7' : 'h-10'} flex items-center justify-center border-b border-border`}>
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground text-center line-clamp-1`}>{pillar.kongWang}</span>
            </div>
            <div className={`${isMobile ? 'h-7' : 'h-10'} flex items-center justify-center`}>
                <span className={`${isMobile ? 'text-[12px]' : 'text-sm'} text-muted-foreground text-center line-clamp-1`}>{pillar.naYin}</span>
            </div>
            <div className={`flex-1 ${isMobile ? 'min-h-[70px] py-1 px-0.5 gap-1' : 'min-h-[100px] px-1 py-1 gap-2'} flex flex-col items-center justify-start`}>
                {shensha.map((s, i) => (
                    <span key={i} className={`${isMobile ? 'text-[11px]' : 'text-xs'} text-foreground text-center`}>{s}</span>
                ))}
            </div>
        </div>
    );
}

export default function CaseStudyBaziChart({
    data,
    loading = false,
    selectedDaYunIndex,
    selectedLiuNianYear,
    isMobile = false,
}: CaseStudyBaziChartProps) {
    const pillars = data?.pillars;
    const daYun = data?.daYun;
    const liuNian = data?.liuNian;
    const monthBranch = pillars?.[1]?.dizhi || '';
    const dayGan = pillars?.[2]?.tiangan || '';
    const displayPillars = pillars ?? [];

    // 计算五行旺衰状态
    const wuxingStatus = useMemo(() => {
        return calculateWuxingStatus(monthBranch);
    }, [monthBranch]);

    // 获取选中的大运
    const selectedDaYun = useMemo(() => {
        if (selectedDaYunIndex === null || selectedDaYunIndex === undefined) return null;
        return daYun?.find(dy => dy.index === selectedDaYunIndex) ?? null;
    }, [daYun, selectedDaYunIndex]);

    // 获取选中的流年
    const selectedLiuNian = useMemo(() => {
        if (selectedLiuNianYear === null || selectedLiuNianYear === undefined) return null;
        return liuNian?.find(ln => ln.year === selectedLiuNianYear) ?? null;
    }, [liuNian, selectedLiuNianYear]);

    // 神煞计算上下文（与主模块 BaziChart 同源）
    const shenShaContext = useMemo((): ShenShaContext | null => {
        if (!data || !pillars || pillars.length < 4) return null;
        return {
            sex: (data.gender === '男' || data.gender === 'male' || data.gender === '乾造') ? 1 : 0,
            jiJie: getJiJie(monthBranch),
            yearNaYinWuXing: pillars[0]?.naYin || '',
            yearGan: pillars[0]?.tiangan || '', yearZhi: pillars[0]?.dizhi || '',
            monthGan: pillars[1]?.tiangan || '', monthZhi: pillars[1]?.dizhi || '',
            dayGan: pillars[2]?.tiangan || '', dayZhi: pillars[2]?.dizhi || '',
            hourGan: pillars[3]?.tiangan || '', hourZhi: pillars[3]?.dizhi || '',
            dayGanZhi: pillars[2]?.ganZhi || '', hourGanZhi: pillars[3]?.ganZhi || '',
        };
    }, [data, pillars, monthBranch]);

    const shenShaSetting = useMemo(() => createDefaultShenShaSetting(), []);

    // 四柱神煞（按柱位序：年/月/日/时）
    const pillarShenSha = useMemo(() => {
        if (!shenShaContext) return [] as string[][];
        const result = calculateShenSha(shenShaContext, shenShaSetting);
        return [result.year, result.month, result.day, result.hour].map(list => list.map(r => r.name));
    }, [shenShaContext, shenShaSetting]);

    // 大运/流年列动态神煞
    const yunShenSha = useMemo(() => {
        if (!shenShaContext) return { daYun: [] as string[], liuNian: [] as string[] };
        return {
            daYun: selectedDaYun?.ganZhi ? calculateDynamicShenSha(shenShaContext, shenShaSetting, selectedDaYun.ganZhi[0], selectedDaYun.ganZhi[1], '大运').map(r => r.name) : [],
            liuNian: selectedLiuNian?.ganZhi ? calculateDynamicShenSha(shenShaContext, shenShaSetting, selectedLiuNian.ganZhi[0], selectedLiuNian.ganZhi[1], '流年').map(r => r.name) : [],
        };
    }, [shenShaContext, shenShaSetting, selectedDaYun, selectedLiuNian]);

    // 构造大运柱数据
    const daYunPillar = useMemo((): PillarData | null => {
        if (!selectedDaYun || !dayGan) return null;
        const ganZhi = selectedDaYun.ganZhi;
        const details = computePillarDetails(ganZhi, dayGan);
        return {
            label: '大运',
            ganZhi,
            tiangan: ganZhi[0],
            dizhi: ganZhi[1],
            tianganElement: '',
            dizhiElement: '',
            tianganShiShen: details.tianganShiShen,
            dizhiShiShen: [],
            zanggan: details.zanggan,
            diShi: details.diShi,
            ziZuo: details.ziZuo,
            naYin: details.naYin,
            kongWang: details.kongWang,
        };
    }, [selectedDaYun, dayGan]);

    // 构造流年柱数据
    const liuNianPillar = useMemo((): PillarData | null => {
        if (!selectedLiuNian || !dayGan) return null;
        const ganZhi = selectedLiuNian.ganZhi;
        const details = computePillarDetails(ganZhi, dayGan);
        return {
            label: '流年',
            ganZhi,
            tiangan: ganZhi[0],
            dizhi: ganZhi[1],
            tianganElement: '',
            dizhiElement: '',
            tianganShiShen: details.tianganShiShen,
            dizhiShiShen: [],
            zanggan: details.zanggan,
            diShi: details.diShi,
            ziZuo: details.ziZuo,
            naYin: details.naYin,
            kongWang: details.kongWang,
        };
    }, [selectedLiuNian, dayGan]);

    // Loading 状态
    if (loading) {
        return (
            <div className="min-h-0 min-w-0 overflow-y-auto flex items-center justify-center">
                <div className="text-muted-foreground">加载中...</div>
            </div>
        );
    }

    // 无数据状态
    if (!data) {
        return (
            <div className="min-h-0 min-w-0 overflow-y-auto flex items-center justify-center">
                <div className="text-muted-foreground">请选择案例</div>
            </div>
        );
    }

    const genderLabel = (data.gender === '男' || data.gender === 'male' || data.gender === '乾造') ? '元男' : '元女';

    return (
        <div className="min-h-0 min-w-0 overflow-y-auto">
            {/* 主排盘表格 - 无圆角无描边 */}
            <div className="overflow-hidden w-full">
                <div className="flex">
                    {/* 行标题 */}
                    <div className={`${isMobile ? 'w-10' : 'w-16'} flex-shrink-0 border-r border-border flex flex-col`}>
                        {['日期', '主星', '天干', '地支'].map((label, i) => (
                            <div
                                key={label}
                                className={`
                                    ${i < 2 ? (isMobile ? (i === 0 ? 'h-6' : 'h-7') : (i === 0 ? 'h-8' : 'h-10')) : (isMobile ? 'h-10' : 'h-14')} 
                                    flex items-center justify-center border-b border-border ${i === 0 ? 'bg-secondary/30' : 'bg-muted/30'}
                                `}
                            >
                                <span className={`${isMobile ? 'text-[12px]' : 'text-xs'} text-muted-foreground`}>{label}</span>
                            </div>
                        ))}
                        <div className={`${isMobile ? 'min-h-[70px]' : 'min-h-[90px]'} flex items-center justify-center border-b border-border bg-muted/30`}>
                            <span className={`${isMobile ? 'text-[12px]' : 'text-xs'} text-muted-foreground`}>藏干</span>
                        </div>
                        {['星运', '自坐', '空亡', '纳音'].map((label, idx) => (
                            <div
                                key={label}
                                className={`${isMobile ? 'h-7' : 'h-10'} flex items-center justify-center bg-muted/30 ${idx < 3 ? 'border-b border-border' : ''}`}
                            >
                                <span className={`${isMobile ? 'text-[12px]' : 'text-xs'} text-muted-foreground`}>{label}</span>
                            </div>
                        ))}
                        <div className="flex-1 min-h-[70px] flex items-start justify-center bg-muted/30">
                            <span className={`${isMobile ? 'text-[12px]' : 'text-xs'} text-muted-foreground`}>神煞</span>
                        </div>
                    </div>

                    {/* 流年柱（如果选中） */}
                    {liuNianPillar && (
                        <div className="flex-1 border-r border-border">
                            <SimplePillarCard pillar={liuNianPillar} isYunPillar isMobile={isMobile} shensha={yunShenSha.liuNian} />
                        </div>
                    )}

                    {/* 大运柱（如果选中） */}
                    {daYunPillar && (
                        <div className="flex-1 border-r border-border">
                            <SimplePillarCard pillar={daYunPillar} isYunPillar isMobile={isMobile} shensha={yunShenSha.daYun} />
                        </div>
                    )}

                    {/* 四柱 */}
                    {displayPillars.map((pillar, index) => (
                        <div key={pillar.label} className="flex-1 border-r border-border last:border-r-0">
                            <SimplePillarCard
                                pillar={pillar}
                                isDayMaster={index === 2}
                                genderLabel={index === 2 ? genderLabel : undefined}
                                isMobile={isMobile}
                                shensha={pillarShenSha[index] ?? []}
                            />
                        </div>
                    ))}
                </div>

                {/* 五行旺衰状态行 - 固定五等分 */}
                <div className="grid grid-cols-5 border-t border-border bg-muted/10">
                    {wuxingStatus.map((item, index) => (
                        <div key={item.element} className={`flex items-center justify-center py-2 ${index < 4 ? 'border-r border-border' : ''}`}>
                            <span
                                className={`${isMobile ? 'text-[14px]' : 'text-sm'} font-medium`}
                                style={{ color: item.color }}
                            >
                                {item.element}
                            </span>
                            <span className={`${isMobile ? 'text-[14px]' : 'text-sm'} text-muted-foreground`}>
                                {item.state}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
