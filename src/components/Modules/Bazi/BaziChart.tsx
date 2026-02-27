/**
 * BaziChart - 重构后的精简版本
 * 八字排盘主图表组件
 */
import { useState, useMemo } from 'react';
import { cn } from '../../../lib/utils';

import type { BaziApiResponse } from '../../../types/bazi';
import { calculateShenSha, calculateDynamicShenSha, getJiJie, type ShenShaContext } from '../../../lib/xuan-bazi/utils/baziShenShaUtil';
import { createDefaultShenShaSetting } from '../../../lib/xuan-bazi/settings/baziShenShaSetting';
import GanZhiDiagramModal from './GanZhiDiagramModal';

// 导入提取的工具函数和组件
import { computePillarDetails } from './utils/baziChartUtils';
import { DetailedPillarCard, YunPillar } from './components/PillarCards';

interface BaziChartProps {
  data: BaziApiResponse | null;
  loading?: boolean;
  currentYear?: number;
  selectedDaYunIndex?: number | null;
  selectedLiuNianYear?: number | null;
  showTaiMingShen?: boolean;
  isMobileLayout?: boolean;
  hideDetails?: boolean;
}

export default function BaziChart({
  data,
  loading = false,
  currentYear = new Date().getFullYear(),
  selectedDaYunIndex,
  selectedLiuNianYear,
  showTaiMingShen = false,
  isMobileLayout = false,
  hideDetails = false,
}: BaziChartProps) {
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);

  // 提取数据
  const pillars = data?.pillars || [];
  const daYun = data?.daYun || [];
  const dayGan = pillars[2]?.tiangan || '';

  // 是否显示大运/流年列
  const showDaYunLiuNian = selectedDaYunIndex !== null || selectedLiuNianYear !== null;

  // 确定当前显示的大运和流年
  const activeDaYunIndex = selectedDaYunIndex ?? daYun.find(dy =>
    currentYear >= dy.startYear && currentYear <= dy.endYear
  )?.index ?? 1;
  const activeLiuNianYear = selectedLiuNianYear ?? currentYear;

  // 获取当前流年和大运
  const currentLiuNian = (data && showDaYunLiuNian) ? data.liuNian.find(ln => ln.year === activeLiuNianYear) : null;
  const currentDaYun = (data && showDaYunLiuNian) ? daYun.find(dy => dy.index === activeDaYunIndex) : null;

  // 神煞计算上下文
  const shenShaContext = useMemo((): ShenShaContext | null => {
    if (!data || !pillars || pillars.length < 4) return null;
    return {
      sex: (data.gender === '男' || data.gender === 'male') ? 1 : 0,
      jiJie: getJiJie(pillars[1]?.dizhi || ''),
      yearNaYinWuXing: pillars[0]?.naYin || '',
      yearGan: pillars[0]?.tiangan || '', yearZhi: pillars[0]?.dizhi || '',
      monthGan: pillars[1]?.tiangan || '', monthZhi: pillars[1]?.dizhi || '',
      dayGan: pillars[2]?.tiangan || '', dayZhi: pillars[2]?.dizhi || '',
      hourGan: pillars[3]?.tiangan || '', hourZhi: pillars[3]?.dizhi || '',
      dayGanZhi: pillars[2]?.ganZhi || '', hourGanZhi: pillars[3]?.ganZhi || '',
    };
  }, [data, pillars]);

  const shenShaSetting = useMemo(() => createDefaultShenShaSetting(), []);

  // 流年详情
  const liuNianDetails = useMemo(() => {
    if (!currentLiuNian?.ganZhi || !shenShaContext) return null;
    const details = computePillarDetails(currentLiuNian.ganZhi, dayGan);
    const shenshaResult = calculateDynamicShenSha(shenShaContext, shenShaSetting, currentLiuNian.ganZhi[0], currentLiuNian.ganZhi[1], '流年');
    return { ...details, shensha: shenshaResult.map(r => r.name) };
  }, [currentLiuNian?.ganZhi, dayGan, shenShaContext, shenShaSetting]);

  // 大运详情
  const daYunDetails = useMemo(() => {
    if (!currentDaYun?.ganZhi || !shenShaContext) return null;
    const details = computePillarDetails(currentDaYun.ganZhi, dayGan);
    const shenshaResult = calculateDynamicShenSha(shenShaContext, shenShaSetting, currentDaYun.ganZhi[0], currentDaYun.ganZhi[1], '大运');
    return { ...details, shensha: shenshaResult.map(r => r.name) };
  }, [currentDaYun?.ganZhi, dayGan, shenShaContext, shenShaSetting]);

  // 胎命身详情
  const taiMingShenDetails = useMemo(() => {
    if (!data?.extra || !showTaiMingShen) return null;
    const { taiYuan, mingGong, shenGong } = data.extra;
    return {
      tai: { ganZhi: taiYuan, tiangan: taiYuan[0], dizhi: taiYuan[1], ...computePillarDetails(taiYuan, dayGan) },
      ming: { ganZhi: mingGong, tiangan: mingGong[0], dizhi: mingGong[1], ...computePillarDetails(mingGong, dayGan) },
      shen: { ganZhi: shenGong, tiangan: shenGong[0], dizhi: shenGong[1], ...computePillarDetails(shenGong, dayGan) },
    };
  }, [data?.extra, showTaiMingShen, dayGan]);

  // 柱神煞
  const pillarShenSha = useMemo(() => {
    if (!shenShaContext) return null;
    return calculateShenSha(shenShaContext, shenShaSetting);
  }, [shenShaContext, shenShaSetting]);

  // Loading / 无数据状态
  if (loading) {
    return <div className="min-h-0 min-w-0 overflow-y-auto flex items-center justify-center"><div className="text-muted-foreground">加载中...</div></div>;
  }
  if (!data) {
    return <div className="min-h-0 min-w-0 overflow-y-auto flex items-center justify-center"><div className="text-muted-foreground">请选择案例</div></div>;
  }

  const genderLabel = (data.gender === '男' || data.gender === 'male' || data.gender === '乾造') ? '元男' : '元女';

  return (
    <div className={isMobileLayout ? 'min-w-0' : 'min-h-0 min-w-0 overflow-y-auto'}>
      {/* 主排盘表格 */}
      <div className={`bg-card rounded-xl border border-border overflow-hidden ${isMobileLayout ? 'mb-0' : 'mb-4'} w-full`}>


        <div className="flex">
          {/* 行标题 */}
          <div className={`${isMobileLayout ? 'w-12' : 'w-16'} flex-shrink-0 border-r border-border flex flex-col`}>
            {['日期', '主星', '天干', '地支'].map((label, i) => {
              const heightClass = i < 2 ? (i === 0 ? 'h-8' : 'h-10') : 'h-14';
              return (
                <div
                  key={label}
                  className={cn(
                    heightClass,
                    "flex items-center justify-center border-b border-border",
                    i === 0 ? 'bg-secondary/30' : 'bg-muted/30'
                  )}
                >
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              );
            })}
            <div className={`${isMobileLayout ? 'h-[72px]' : 'h-[90px]'} flex items-center justify-center ${!(isMobileLayout && hideDetails) ? 'border-b border-border' : ''} bg-muted/30`}><span className="text-xs text-muted-foreground">藏干</span></div>
            {!(isMobileLayout && hideDetails) && (
              <>
                {['星运', '自坐', '空亡', '纳音'].map(label => (
                  <div key={label} className="h-10 flex items-center justify-center border-b border-border bg-muted/30"><span className="text-xs text-muted-foreground">{label}</span></div>
                ))}
                <div className="flex-1 flex items-center justify-center min-h-[100px] bg-muted/30"><span className="text-xs text-muted-foreground">神煞</span></div>
              </>
            )}
          </div>

          {/* 胎命身柱 */}
          {showTaiMingShen && taiMingShenDetails && (
            <>
              <YunPillar label="胎元" tiangan={taiMingShenDetails.tai.tiangan} dizhi={taiMingShenDetails.tai.dizhi} zhuxing={taiMingShenDetails.tai.tianganShiShen} zanggan={taiMingShenDetails.tai.zanggan} xingyun={taiMingShenDetails.tai.diShi} zizuo={taiMingShenDetails.tai.ziZuo} kongwang={taiMingShenDetails.tai.kongWang} nayin={taiMingShenDetails.tai.naYin} isAccent shensha={[]} isMobileLayout={isMobileLayout} hideDetails={hideDetails} />
              <YunPillar label="命宫" tiangan={taiMingShenDetails.ming.tiangan} dizhi={taiMingShenDetails.ming.dizhi} zhuxing={taiMingShenDetails.ming.tianganShiShen} zanggan={taiMingShenDetails.ming.zanggan} xingyun={taiMingShenDetails.ming.diShi} zizuo={taiMingShenDetails.ming.ziZuo} kongwang={taiMingShenDetails.ming.kongWang} nayin={taiMingShenDetails.ming.naYin} isAccent shensha={[]} isMobileLayout={isMobileLayout} hideDetails={hideDetails} />
              <YunPillar label="身宫" tiangan={taiMingShenDetails.shen.tiangan} dizhi={taiMingShenDetails.shen.dizhi} zhuxing={taiMingShenDetails.shen.tianganShiShen} zanggan={taiMingShenDetails.shen.zanggan} xingyun={taiMingShenDetails.shen.diShi} zizuo={taiMingShenDetails.shen.ziZuo} kongwang={taiMingShenDetails.shen.kongWang} nayin={taiMingShenDetails.shen.naYin} isAccent shensha={[]} isMobileLayout={isMobileLayout} hideDetails={hideDetails} />
            </>
          )}

          {/* 流年/大运柱 */}
          {!showTaiMingShen && (
            <>
              {currentLiuNian && liuNianDetails && (
                <YunPillar label="流年" tiangan={currentLiuNian.tiangan} dizhi={currentLiuNian.dizhi} zhuxing={liuNianDetails.tianganShiShen} zanggan={liuNianDetails.zanggan} xingyun={liuNianDetails.diShi} zizuo={liuNianDetails.ziZuo} kongwang={liuNianDetails.kongWang} nayin={liuNianDetails.naYin} isAccent shensha={liuNianDetails.shensha} isMobileLayout={isMobileLayout} hideDetails={hideDetails} />
              )}
              {currentDaYun && currentDaYun.index > 0 && daYunDetails && (
                <YunPillar label="大运" tiangan={currentDaYun.tiangan} dizhi={currentDaYun.dizhi} zhuxing={daYunDetails.tianganShiShen} zanggan={daYunDetails.zanggan} xingyun={daYunDetails.diShi} zizuo={daYunDetails.ziZuo} kongwang={daYunDetails.kongWang} nayin={daYunDetails.naYin} isAccent shensha={daYunDetails.shensha} isMobileLayout={isMobileLayout} hideDetails={hideDetails} />
              )}
            </>
          )}

          {/* 四柱 */}
          {pillars.map((pillar, index) => {
            const shenshaList = pillarShenSha ? (
              index === 0 ? pillarShenSha.year : index === 1 ? pillarShenSha.month : index === 2 ? pillarShenSha.day : pillarShenSha.hour
            ).map(s => s.name) : [];
            return (
              <div key={pillar.label} className="flex-1 border-r border-border last:border-r-0">
                <DetailedPillarCard pillar={pillar} isDayMaster={index === 2} shensha={shenshaList} genderLabel={index === 2 ? genderLabel : undefined} isMobileLayout={isMobileLayout} hideDetails={hideDetails} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 干支图解模态框 */}
      <GanZhiDiagramModal isOpen={isDiagramOpen} onClose={() => setIsDiagramOpen(false)} baziData={data} selectedDaYunIndex={selectedDaYunIndex ?? null} selectedLiuNianYear={selectedLiuNianYear ?? null} currentYear={currentYear} />

    </div>
  );
}

