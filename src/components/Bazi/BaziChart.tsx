import type { PillarData, BaziApiResponse } from '../../types/bazi';

const elementColors: Record<string, string> = {
  wood: 'text-[#22c55e]',
  fire: 'text-[#ef4444]',
  earth: 'text-[#f59e0b]',
  metal: 'text-[#e5e7eb]',
  water: 'text-[#3b82f6]',
};

interface DetailedPillarCardProps {
  pillar: PillarData;
  isDayMaster?: boolean;
}

function DetailedPillarCard({ pillar, isDayMaster = false }: DetailedPillarCardProps) {
  return (
    <div className={`h-full ${isDayMaster ? 'bg-primary/5' : ''}`}>
      <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30">
        <span className="text-xs text-muted-foreground">{pillar.label}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{pillar.tianganShiShen || '日主'}</span>
      </div>
      <div className="h-14 flex items-center justify-center border-b border-border">
        <span className={`text-3xl font-display font-semibold ${elementColors[pillar.tianganElement] || ''}`}>
          {pillar.tiangan}
        </span>
      </div>
      <div className="h-14 flex items-center justify-center border-b border-border">
        <span className={`text-3xl font-display font-semibold ${elementColors[pillar.dizhiElement] || ''}`}>
          {pillar.dizhi}
        </span>
      </div>
      <div className="min-h-[90px] p-2 border-b border-border flex flex-col justify-start gap-1">
        {pillar.zanggan.map((item, index) => (
          <div key={`${item.gan}-${index}`} className="flex items-center justify-center gap-1 text-sm">
            <span className={`font-medium ${elementColors[item.element] || ''}`}>{item.gan}</span>
            <span className="text-muted-foreground">{item.shiShen}</span>
          </div>
        ))}
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{pillar.diShi}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{pillar.diShi}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-muted-foreground">{pillar.kongWang}</span>
      </div>
      <div className="h-10 flex items-center justify-center">
        <span className="text-sm text-muted-foreground">{pillar.naYin}</span>
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
  kongwang?: string;
  nayin?: string;
  isAccent?: boolean;
}

function YunPillar({
  label,
  tiangan,
  dizhi,
  zhuxing = '',
  zanggan = [],
  xingyun = '',
  kongwang = '',
  nayin = '',
  isAccent = false,
}: YunPillarProps) {
  const textColorClass = isAccent ? 'text-accent' : 'text-foreground';

  return (
    <div className="flex-1 border-r border-border last:border-r-0">
      <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30">
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{zhuxing}</span>
      </div>
      <div className="h-14 flex items-center justify-center border-b border-border">
        <span className={`text-3xl font-display ${textColorClass}`}>{tiangan}</span>
      </div>
      <div className="h-14 flex items-center justify-center border-b border-border">
        <span className={`text-3xl font-display ${textColorClass}`}>{dizhi}</span>
      </div>
      <div className="min-h-[90px] p-2 border-b border-border flex flex-col justify-start gap-1">
        {zanggan.map((item, index) => (
          <div key={`${item.gan}-${index}`} className="flex items-center justify-center gap-1 text-sm">
            <span className={`font-medium ${elementColors[item.element] || ''}`}>{item.gan}</span>
            <span className="text-muted-foreground">{item.shiShen}</span>
          </div>
        ))}
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{xingyun}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{xingyun}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-muted-foreground">{kongwang}</span>
      </div>
      <div className="h-10 flex items-center justify-center">
        <span className="text-sm text-muted-foreground">{nayin}</span>
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

  const { pillars, daYun } = data;

  // 确定当前显示的大运：优先使用选中的，否则根据当前年份自动确定
  const activeDaYunIndex = selectedDaYunIndex ?? daYun.find(dy =>
    currentYear >= dy.startYear && currentYear <= dy.endYear
  )?.index ?? 1;

  // 确定当前显示的流年：优先使用选中的，否则使用当前年份
  const activeLiuNianYear = selectedLiuNianYear ?? currentYear;

  // 获取当前流年和大运
  const currentLiuNian = data.liuNian.find(ln => ln.year === activeLiuNianYear);
  const currentDaYun = daYun.find(dy => dy.index === activeDaYunIndex);

  return (
    <div className="min-h-0 min-w-0 overflow-y-auto">
      {/* 主排盘表格 */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-4 w-full">
        <div className="flex">
          {/* 行标题 */}
          <div className="w-16 flex-shrink-0 border-r border-border">
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
            <div className="h-10 flex items-center justify-center bg-muted/30">
              <span className="text-xs text-muted-foreground">纳音</span>
            </div>
          </div>

          {/* 流年柱 */}
          {currentLiuNian && (
            <YunPillar
              label="流年"
              tiangan={currentLiuNian.tiangan}
              dizhi={currentLiuNian.dizhi}
              isAccent={true}
            />
          )}

          {/* 大运柱 */}
          {currentDaYun && currentDaYun.index > 0 && (
            <YunPillar
              label="大运"
              tiangan={currentDaYun.tiangan}
              dizhi={currentDaYun.dizhi}
              kongwang={currentDaYun.xunKong}
              isAccent={true}
            />
          )}

          {/* 四柱 */}
          {pillars.map((pillar, index) => (
            <div
              key={pillar.label}
              className="flex-1 border-r border-border last:border-r-0"
            >
              <DetailedPillarCard pillar={pillar} isDayMaster={index === 2} />
            </div>
          ))}
        </div>
      </div>

      {/* 神煞区域 */}
      <div className="bg-card rounded-xl border border-border overflow-hidden w-full">
        <div className="flex">
          <div className="w-16 flex-shrink-0 border-r border-border bg-muted/30 flex items-center justify-center py-3">
            <span className="text-xs text-muted-foreground">神煞</span>
          </div>
          <div className="flex-1 px-4 py-3">
            {data.shenSha ? (
              <div className="flex flex-col gap-2">
                {/* 吉神 */}
                {data.shenSha.jiShen && data.shenSha.jiShen.length > 0 && data.shenSha.jiShen[0] !== '无' && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-green-500 shrink-0">吉神:</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {data.shenSha.jiShen.map((s, i) => (
                        <span key={`ji-${i}`} className="text-xs text-foreground">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* 凶煞 */}
                {data.shenSha.xiongSha && data.shenSha.xiongSha.length > 0 && data.shenSha.xiongSha[0] !== '无' && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-red-500 shrink-0">凶煞:</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {data.shenSha.xiongSha.map((s, i) => (
                        <span key={`xiong-${i}`} className="text-xs text-foreground">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
