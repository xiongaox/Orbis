import { useState, useMemo } from 'react';
import type { PillarData, BaziApiResponse, HiddenStem } from '../../../types/bazi';
import {
  getElement,
  getElementColor,
  getXunKong,
  SHI_SHEN_MAP,
  ZANG_GAN_MAP,
  NA_YIN_MAP,
  CHANG_SHENG_MAP
} from '../../../utils/metaphysics';
import { calculateShenSha, calculateDynamicShenSha, getJiJie, type ShenShaContext } from '../../../lib/xuan-bazi/utils/baziShenShaUtil';
import { createDefaultShenShaSetting } from '../../../lib/xuan-bazi/settings/baziShenShaSetting';
import GanZhiDiagramModal from './GanZhiDiagramModal';

/**
 * 动态计算柱的详细信息
 * 对于大运/流年：自坐使用日干查地支
 */
function computePillarDetails(ganZhi: string, dayGan: string) {
  if (!ganZhi || ganZhi.length < 2) {
    return { tianganShiShen: '', zanggan: [], diShi: '', ziZuo: '', kongWang: '', naYin: '' };
  }

  const tiangan = ganZhi[0];
  const dizhi = ganZhi[1];

  const tianganShiShen = SHI_SHEN_MAP[dayGan]?.[tiangan] || '';

  const hideGans = ZANG_GAN_MAP[dizhi] || [];
  const zanggan: HiddenStem[] = hideGans.map(gan => ({
    gan,
    shiShen: SHI_SHEN_MAP[dayGan]?.[gan] || '',
    element: getElement(gan)
  }));

  const diShi = CHANG_SHENG_MAP[dayGan]?.[dizhi] || '';
  // 自坐：用该柱天干查该柱地支的十二长生
  const ziZuo = CHANG_SHENG_MAP[tiangan]?.[dizhi] || '';
  const naYin = NA_YIN_MAP[ganZhi] || '';
  const kongWang = getXunKong(ganZhi);

  return { tianganShiShen, zanggan, diShi, ziZuo, kongWang, naYin };
}

interface DetailedPillarCardProps {
  pillar: PillarData;
  isDayMaster?: boolean;
  shensha?: string[];
  genderLabel?: string; // 日主显示标签：元男/元女
}

function DetailedPillarCard({ pillar, isDayMaster = false, shensha = [], genderLabel = '日主' }: DetailedPillarCardProps) {
  return (
    <div className={`h-full flex flex-col ${isDayMaster ? 'bg-primary/5' : ''}`}>
      <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30">
        <span className="text-xs text-muted-foreground">{pillar.label}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{pillar.tianganShiShen || genderLabel}</span>
      </div>
      <div className="h-14 flex items-center justify-center border-b border-border">
        <span
          className="text-3xl font-display font-semibold"
          style={{ color: getElementColor(pillar.tiangan) }}
        >
          {pillar.tiangan}
        </span>
      </div>
      <div className="h-14 flex items-center justify-center border-b border-border">
        <span
          className="text-3xl font-display font-semibold"
          style={{ color: getElementColor(pillar.dizhi) }}
        >
          {pillar.dizhi}
        </span>
      </div>
      <div className="min-h-[90px] p-2 border-b border-border flex flex-col justify-start gap-1">
        {pillar.zanggan.map((item, index) => (
          <div key={`${item.gan}-${index}`} className="flex items-center justify-center gap-1 text-sm">
            <span
              className="font-medium"
              style={{ color: getElementColor(item.gan) }}
            >
              {item.gan}
            </span>
            <span className="text-muted-foreground">{item.shiShen}</span>
          </div>
        ))}
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{pillar.diShi}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{pillar.ziZuo}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-muted-foreground">{pillar.kongWang}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-muted-foreground">{pillar.naYin}</span>
      </div>
      <div className="flex-1 p-2 flex flex-col items-center justify-start gap-2 min-h-[100px]">
        {shensha.map((s, i) => (
          <span key={i} className="text-xs text-foreground text-center">{s}</span>
        ))}
      </div>
    </div>
  );
}

// 流年/大运柱组件
interface YunPillarProps {
  label: string;
  tiangan: string;
  dizhi: string;
  zhuxing?: string;
  zanggan?: { gan: string; shiShen: string; element: string }[];
  xingyun?: string;
  zizuo?: string;
  kongwang?: string;
  nayin?: string;
  isAccent?: boolean;
  shensha?: string[];
}

function YunPillar({
  label,
  tiangan,
  dizhi,
  zhuxing = '',
  zanggan = [],
  xingyun = '',
  zizuo = '',
  kongwang = '',
  nayin = '',
  isAccent = false,
  shensha = [],
}: YunPillarProps) {
  return (
    <div className={`flex-1 border-r border-border last:border-r-0 flex flex-col ${isAccent ? 'bg-accent/5' : ''}`}>
      <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30">
        <span className={`text-xs ${isAccent ? 'text-foreground/70 font-medium' : 'text-muted-foreground'}`}>{label}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{zhuxing}</span>
      </div>
      <div className="h-14 flex items-center justify-center border-b border-border">
        <span
          className="text-3xl font-display font-semibold"
          style={{ color: getElementColor(tiangan) }}
        >
          {tiangan}
        </span>
      </div>
      <div className="h-14 flex items-center justify-center border-b border-border">
        <span
          className="text-3xl font-display font-semibold"
          style={{ color: getElementColor(dizhi) }}
        >
          {dizhi}
        </span>
      </div>
      <div className="min-h-[90px] p-2 border-b border-border flex flex-col justify-start gap-1">
        {zanggan.map((item, index) => (
          <div key={`${item.gan}-${index}`} className="flex items-center justify-center gap-1 text-sm">
            <span
              className="font-medium"
              style={{ color: getElementColor(item.gan) }}
            >
              {item.gan}
            </span>
            <span className="text-muted-foreground">{item.shiShen}</span>
          </div>
        ))}
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{xingyun}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{zizuo}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-muted-foreground">{kongwang}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-muted-foreground">{nayin}</span>
      </div>
      <div className="flex-1 p-2 flex flex-col items-center justify-start gap-2 min-h-[100px]">
        {shensha.map((s, i) => (
          <span key={i} className="text-xs text-foreground text-center">{s}</span>
        ))}
      </div>
    </div>
  );
}

interface BaziChartProps {
  data: BaziApiResponse | null;
  loading?: boolean;
  currentYear?: number;
  selectedDaYunIndex?: number | null;
  selectedLiuNianYear?: number | null;
}

export default function BaziChart({
  data,
  loading = false,
  currentYear = new Date().getFullYear(),
  selectedDaYunIndex,
  selectedLiuNianYear,
}: BaziChartProps) {
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);

  // 提取数据（安全访问）
  const pillars = data?.pillars || [];
  const daYun = data?.daYun || [];
  const dayGan = pillars[2]?.tiangan || '';

  // 是否显示大运/流年列
  const showDaYunLiuNian = selectedDaYunIndex !== null || selectedLiuNianYear !== null;

  // 确定当前显示的大运
  const activeDaYunIndex = selectedDaYunIndex ?? daYun.find(dy =>
    currentYear >= dy.startYear && currentYear <= dy.endYear
  )?.index ?? 1;

  // 确定当前显示的流年
  const activeLiuNianYear = selectedLiuNianYear ?? currentYear;

  // 获取当前流年和大运
  const currentLiuNian = (data && showDaYunLiuNian) ? data.liuNian.find(ln => ln.year === activeLiuNianYear) : null;
  const currentDaYun = (data && showDaYunLiuNian) ? daYun.find(dy => dy.index === activeDaYunIndex) : null;

  // 准备神煞计算上下文
  const shenShaContext = useMemo((): ShenShaContext | null => {
    if (!data || !pillars || pillars.length < 4) return null;

    return {
      sex: (data.gender === '男' || data.gender === 'male') ? 1 : 0,
      jiJie: getJiJie(pillars[1]?.dizhi || ''),
      yearNaYinWuXing: pillars[0]?.naYin || '',
      yearGan: pillars[0]?.tiangan || '',
      yearZhi: pillars[0]?.dizhi || '',
      monthGan: pillars[1]?.tiangan || '',
      monthZhi: pillars[1]?.dizhi || '',
      dayGan: pillars[2]?.tiangan || '',
      dayZhi: pillars[2]?.dizhi || '',
      hourGan: pillars[3]?.tiangan || '',
      hourZhi: pillars[3]?.dizhi || '',
      dayGanZhi: pillars[2]?.ganZhi || '',
      hourGanZhi: pillars[3]?.ganZhi || '',
    };
  }, [data, pillars]);

  const shenShaSetting = useMemo(() => createDefaultShenShaSetting(), []);

  // 动态计算流年和大运的详细信息
  const liuNianDetails = useMemo(() => {
    if (!currentLiuNian?.ganZhi || !shenShaContext) return null;
    const details = computePillarDetails(currentLiuNian.ganZhi, dayGan);

    const gan = currentLiuNian.ganZhi[0];
    const zhi = currentLiuNian.ganZhi[1];
    const shenshaResult = calculateDynamicShenSha(shenShaContext, shenShaSetting, gan, zhi, '流年');
    const shensha = shenshaResult.map(r => r.name);

    return { ...details, shensha };
  }, [currentLiuNian?.ganZhi, dayGan, shenShaContext, shenShaSetting]);

  const daYunDetails = useMemo(() => {
    if (!currentDaYun?.ganZhi || !shenShaContext) return null;
    const details = computePillarDetails(currentDaYun.ganZhi, dayGan);

    const gan = currentDaYun.ganZhi[0];
    const zhi = currentDaYun.ganZhi[1];
    const shenshaResult = calculateDynamicShenSha(shenShaContext, shenShaSetting, gan, zhi, '大运');
    const shensha = shenshaResult.map(r => r.name);

    return { ...details, shensha };
  }, [currentDaYun?.ganZhi, dayGan, shenShaContext, shenShaSetting]);

  // 计算按柱的神煞
  const pillarShenSha = useMemo(() => {
    if (!shenShaContext) return null;
    return calculateShenSha(shenShaContext, shenShaSetting);
  }, [shenShaContext, shenShaSetting]);

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

  return (
    <div className="min-h-0 min-w-0 overflow-y-auto">


      {/* 主排盘表格 */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-4 w-full">
        <div className="flex">
          {/* 行标题 */}
          <div className="w-16 flex-shrink-0 border-r border-border flex flex-col">
            <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30">
              <span className="text-xs text-muted-foreground">日期</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">主星</span>
            </div>
            <div className="h-14 flex items-center justify-center border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">天干</span>
            </div>
            <div className="h-14 flex items-center justify-center border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">地支</span>
            </div>
            <div className="min-h-[90px] flex items-center justify-center border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">藏干</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">星运</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">自坐</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">空亡</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">纳音</span>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-[100px] border-t-0 bg-muted/30">
              <span className="text-xs text-muted-foreground">神煞</span>
            </div>
          </div>

          {/* 流年柱 */}
          {currentLiuNian && liuNianDetails && (
            <YunPillar
              label="流年"
              tiangan={currentLiuNian.tiangan}
              dizhi={currentLiuNian.dizhi}
              zhuxing={liuNianDetails.tianganShiShen}
              zanggan={liuNianDetails.zanggan}
              xingyun={liuNianDetails.diShi}
              zizuo={liuNianDetails.ziZuo}
              kongwang={liuNianDetails.kongWang}
              nayin={liuNianDetails.naYin}
              isAccent={true}
              shensha={liuNianDetails.shensha}
            />
          )}

          {/* 大运柱 */}
          {currentDaYun && currentDaYun.index > 0 && daYunDetails && (
            <YunPillar
              label="大运"
              tiangan={currentDaYun.tiangan}
              dizhi={currentDaYun.dizhi}
              zhuxing={daYunDetails.tianganShiShen}
              zanggan={daYunDetails.zanggan}
              xingyun={daYunDetails.diShi}
              zizuo={daYunDetails.ziZuo}
              kongwang={daYunDetails.kongWang}
              nayin={daYunDetails.naYin}
              isAccent={true}
              shensha={daYunDetails.shensha}
            />
          )}

          {/* 四柱 */}
          {pillars.map((pillar, index) => {
            const shenshaList = pillarShenSha ? (
              index === 0 ? pillarShenSha.year :
                index === 1 ? pillarShenSha.month :
                  index === 2 ? pillarShenSha.day :
                    index === 3 ? pillarShenSha.hour : []
            ).map(s => s.name) : [];

            // 日柱显示：根据性别显示"元男"或"元女"
            const genderLabel = (data.gender === '男' || data.gender === 'male' || data.gender === '乾造')
              ? '元男'
              : '元女';

            return (
              <div
                key={pillar.label}
                className="flex-1 border-r border-border last:border-r-0"
              >
                <DetailedPillarCard
                  pillar={pillar}
                  isDayMaster={index === 2}
                  shensha={shenshaList}
                  genderLabel={index === 2 ? genderLabel : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 干支图解模态框 */}
      <GanZhiDiagramModal
        isOpen={isDiagramOpen}
        onClose={() => setIsDiagramOpen(false)}
        baziData={data}
        selectedDaYunIndex={selectedDaYunIndex ?? null}
        selectedLiuNianYear={selectedLiuNianYear ?? null}
        currentYear={currentYear}
      />
    </div>
  );
}
