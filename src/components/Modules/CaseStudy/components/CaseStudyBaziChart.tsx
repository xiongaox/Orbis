/**
 * 案例学习专用八字排盘组件 - 精简版
 * 与 Tab 菜单的八字模块独立，可自定义样式
 * 特性：去掉神煞行，支持动态显示大运/流年柱
 */
import { useMemo } from 'react';
import type { BaziApiResponse, PillarData } from '../../../../types/bazi';
import { getElementColor } from '../../../../lib/xuan-bazi/maps/baziStyleMap';
import { calculateWuxingStatus } from '../../../../lib/xuan-bazi/utils/wuxingStatusUtil';
import { computePillarDetails } from '../../../Modules/Bazi/utils/baziChartUtils';

interface CaseStudyBaziChartProps {
    data: BaziApiResponse | null;
    loading?: boolean;
    selectedDaYunIndex?: number | null;
    selectedLiuNianYear?: number | null;
    isMobile?: boolean;
}

/** 精简版柱位卡片 - 不显示神煞 */
function SimplePillarCard({
    pillar,
    isDayMaster = false,
    genderLabel = '日主',
    isYunPillar = false,
    isMobile = false,
}: {
    pillar: PillarData;
    isDayMaster?: boolean;
    genderLabel?: string;
    isYunPillar?: boolean;
    isMobile?: boolean;
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
    const pillars = data?.pillars || [];
    const daYun = data?.daYun || [];
    const liuNian = data?.liuNian || [];
    const monthBranch = pillars[1]?.dizhi || '';
    const dayGan = pillars[2]?.tiangan || '';

    // 计算五行旺衰状态
    const wuxingStatus = useMemo(() => {
        return calculateWuxingStatus(monthBranch);
    }, [monthBranch]);

    // 获取选中的大运
    const selectedDaYun = useMemo(() => {
        if (selectedDaYunIndex === null || selectedDaYunIndex === undefined) return null;
        return daYun.find(dy => dy.index === selectedDaYunIndex);
    }, [daYun, selectedDaYunIndex]);

    // 获取选中的流年
    const selectedLiuNian = useMemo(() => {
        if (selectedLiuNianYear === null || selectedLiuNianYear === undefined) return null;
        return liuNian.find(ln => ln.year === selectedLiuNianYear);
    }, [liuNian, selectedLiuNianYear]);

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
                    </div>

                    {/* 流年柱（如果选中） */}
                    {liuNianPillar && (
                        <div className="flex-1 border-r border-border">
                            <SimplePillarCard pillar={liuNianPillar} isYunPillar isMobile={isMobile} />
                        </div>
                    )}

                    {/* 大运柱（如果选中） */}
                    {daYunPillar && (
                        <div className="flex-1 border-r border-border">
                            <SimplePillarCard pillar={daYunPillar} isYunPillar isMobile={isMobile} />
                        </div>
                    )}

                    {/* 四柱 */}
                    {pillars.map((pillar, index) => (
                        <div key={pillar.label} className="flex-1 border-r border-border last:border-r-0">
                            <SimplePillarCard
                                pillar={pillar}
                                isDayMaster={index === 2}
                                genderLabel={index === 2 ? genderLabel : undefined}
                                isMobile={isMobile}
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
