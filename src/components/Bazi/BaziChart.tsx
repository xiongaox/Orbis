const elementColors: Record<string, string> = {
  wood: 'text-[#22c55e]',
  fire: 'text-[#ef4444]',
  earth: 'text-[#f59e0b]',
  metal: 'text-[#e5e7eb]',
  water: 'text-[#3b82f6]',
};

const shenSha = {
  liunian: ['天厨贵人', '勾绞煞'],
  dayun: ['天乙贵人', '太极贵人'],
  year: ['福星贵人', '太极贵人', '德秀贵人', '红艳煞'],
  month: ['十恶大败', '文昌贵人', '华盖'],
  day: ['天德贵人', '福星贵人', '德秀贵人'],
  hour: ['福星贵人', '童子煞', '天德贵人', '飞刃'],
};

// Data layout: liunian/dayun are the first two columns after the row headers,
// followed by the year/month/day/hour pillars.
const baziData = {
  info: {
    date: '日期',
    solar: '1998年10月16日',
    lunar: '八月廿八 子时',
    gender: '坤造',
  },
  liunian: {
    label: '流年',
    tiangan: '乙',
    dizhi: '巳',
    zhuxing: '正印',
    zanggan: [
      { gan: '丙', shishen: '比肩', element: 'fire' },
      { gan: '庚', shishen: '偏财', element: 'metal' },
      { gan: '戊', shishen: '食神', element: 'earth' },
    ],
    xingyun: '临官',
    zizuo: '临官',
    kongwang: '寅卯',
    nayin: '覆灯火',
  },
  dayun: {
    label: '大运',
    tiangan: '己',
    dizhi: '未',
    zhuxing: '伤官',
    zanggan: [
      { gan: '己', shishen: '伤官', element: 'earth' },
      { gan: '丁', shishen: '劫财', element: 'fire' },
      { gan: '乙', shishen: '正印', element: 'wood' },
    ],
    xingyun: '衰',
    zizuo: '衰',
    kongwang: '子丑',
    nayin: '天上火',
  },
  pillars: [
    {
      label: '年柱',
      tiangan: '戊',
      tianganElement: 'earth',
      dizhi: '寅',
      dizhiElement: 'wood',
      zanggan: [
        { gan: '甲', shishen: '比肩', element: 'wood' },
        { gan: '丙', shishen: '偏财', element: 'fire' },
        { gan: '戊', shishen: '食神', element: 'earth' },
      ],
      xingyun: '长生',
      zizuo: '长生',
      kongwang: '申酉',
      nayin: '城头土',
      zhuxing: '食神',
    },
    {
      label: '月柱',
      tiangan: '壬',
      tianganElement: 'water',
      dizhi: '戌',
      dizhiElement: 'earth',
      zanggan: [
        { gan: '辛', shishen: '正财', element: 'metal' },
        { gan: '丁', shishen: '劫财', element: 'fire' },
      ],
      xingyun: '墓',
      zizuo: '冠带',
      kongwang: '子丑',
      nayin: '大海水',
      zhuxing: '七杀',
    },
    {
      label: '日柱',
      tiangan: '丙',
      tianganElement: 'fire',
      dizhi: '申',
      dizhiElement: 'metal',
      zanggan: [
        { gan: '戊', shishen: '偏财', element: 'earth' },
        { gan: '壬', shishen: '七杀', element: 'water' },
        { gan: '庚', shishen: '食神', element: 'metal' },
      ],
      xingyun: '病',
      zizuo: '病',
      kongwang: '辰巳',
      nayin: '山下火',
      zhuxing: '元女',
    },
    {
      label: '时柱',
      tiangan: '戊',
      tianganElement: 'earth',
      dizhi: '子',
      dizhiElement: 'water',
      zanggan: [{ gan: '癸', shishen: '正官', element: 'water' }],
      xingyun: '胎',
      zizuo: '胎',
      kongwang: '午未',
      nayin: '霹雳火',
      zhuxing: '食神',
    },
  ],
};

interface PillarData {
  label: string;
  tiangan: string;
  tianganElement: string;
  dizhi: string;
  dizhiElement: string;
  zanggan: { gan: string; shishen: string; element: string }[];
  xingyun: string;
  zizuo: string;
  kongwang: string;
  nayin: string;
  zhuxing: string;
}

function DetailedPillarCard({ pillar, isDayMaster = false }: { pillar: PillarData; isDayMaster?: boolean }) {
  return (
    <div className={`h-full ${isDayMaster ? 'bg-primary/5' : ''}`}>
      <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30">
        <span className="text-xs text-muted-foreground">{pillar.label}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{pillar.zhuxing}</span>
      </div>
      <div className="h-14 flex items-center justify-center border-b border-border">
        <span className={`text-3xl font-display font-semibold ${elementColors[pillar.tianganElement]}`}>
          {pillar.tiangan}
        </span>
      </div>
      <div className="h-14 flex items-center justify-center border-b border-border">
        <span className={`text-3xl font-display font-semibold ${elementColors[pillar.dizhiElement]}`}>
          {pillar.dizhi}
        </span>
      </div>
      <div className="min-h-[90px] p-2 border-b border-border flex flex-col justify-start gap-1">
        {pillar.zanggan.map((item, index) => (
          <div key={`${item.gan}-${index}`} className="flex items-center justify-center gap-1 text-sm">
            <span className={`font-medium ${elementColors[item.element]}`}>{item.gan}</span>
            <span className="text-muted-foreground">{item.shishen}</span>
          </div>
        ))}
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{pillar.xingyun}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-foreground">{pillar.zizuo}</span>
      </div>
      <div className="h-10 flex items-center justify-center border-b border-border">
        <span className="text-sm text-muted-foreground">{pillar.kongwang}</span>
      </div>
      <div className="h-10 flex items-center justify-center">
        <span className="text-sm text-muted-foreground">{pillar.nayin}</span>
      </div>
    </div>
  );
}

export default function BaziChart() {
  return (
    <div className="min-h-0 min-w-0 overflow-y-auto">
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-4 w-full">
        <div className="flex">
          <div className="w-16 flex-shrink-0 border-r border-border">
            <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30">
              <span className="text-xs text-muted-foreground">{baziData.info.date}</span>
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
          <div className="flex-1 border-r border-border">
            <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30">
              <span className="text-xs text-muted-foreground">{baziData.liunian.label}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
              <span className="text-sm text-foreground">{baziData.liunian.zhuxing}</span>
            </div>
            <div className="h-14 flex items-center justify-center border-b border-border">
              <span className="text-3xl font-display text-accent">{baziData.liunian.tiangan}</span>
            </div>
            <div className="h-14 flex items-center justify-center border-b border-border">
              <span className="text-3xl font-display text-accent">{baziData.liunian.dizhi}</span>
            </div>
            <div className="min-h-[90px] p-2 border-b border-border flex flex-col justify-start gap-1">
              {baziData.liunian.zanggan.map((item, index) => (
                <div key={`${item.gan}-${index}`} className="flex items-center justify-center gap-1 text-sm">
                  <span className={`font-medium ${elementColors[item.element]}`}>{item.gan}</span>
                  <span className="text-muted-foreground">{item.shishen}</span>
                </div>
              ))}
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
              <span className="text-sm text-foreground">{baziData.liunian.xingyun}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
              <span className="text-sm text-foreground">{baziData.liunian.zizuo}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
              <span className="text-sm text-muted-foreground">{baziData.liunian.kongwang}</span>
            </div>
            <div className="h-10 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">{baziData.liunian.nayin}</span>
            </div>
          </div>
          {/* 大运柱 */}
          <div className="flex-1 border-r border-border">
            <div className="h-8 flex items-center justify-center border-b border-border bg-secondary/30">
              <span className="text-xs text-muted-foreground">{baziData.dayun.label}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
              <span className="text-sm text-foreground">{baziData.dayun.zhuxing}</span>
            </div>
            <div className="h-14 flex items-center justify-center border-b border-border">
              <span className="text-3xl font-display text-accent">{baziData.dayun.tiangan}</span>
            </div>
            <div className="h-14 flex items-center justify-center border-b border-border">
              <span className="text-3xl font-display text-accent">{baziData.dayun.dizhi}</span>
            </div>
            <div className="min-h-[90px] p-2 border-b border-border flex flex-col justify-start gap-1">
              {baziData.dayun.zanggan.map((item, index) => (
                <div key={`${item.gan}-${index}`} className="flex items-center justify-center gap-1 text-sm">
                  <span className={`font-medium ${elementColors[item.element]}`}>{item.gan}</span>
                  <span className="text-muted-foreground">{item.shishen}</span>
                </div>
              ))}
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
              <span className="text-sm text-foreground">{baziData.dayun.xingyun}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
              <span className="text-sm text-foreground">{baziData.dayun.zizuo}</span>
            </div>
            <div className="h-10 flex items-center justify-center border-b border-border">
              <span className="text-sm text-muted-foreground">{baziData.dayun.kongwang}</span>
            </div>
            <div className="h-10 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">{baziData.dayun.nayin}</span>
            </div>
          </div>
          {/* 年柱 / 月柱 / 日柱 / 时柱 */}
          {baziData.pillars.map((pillar) => (
            <div
              key={pillar.label}
              className="flex-1 border-r border-border last:border-r-0"
            >
              <DetailedPillarCard pillar={pillar} isDayMaster={pillar.label === '日柱'} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border overflow-hidden w-full">
        <div className="flex">
          <div className="w-16 flex-shrink-0 border-r border-border bg-muted/30 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">神煞</span>
          </div>
          <div className="flex-1 border-r border-border px-2 py-3">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2.5">
              {shenSha.liunian.map((item) => (
                <span
                  key={`liunian-${item}`}
                  className="text-xs text-foreground text-center"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 border-r border-border px-2 py-3">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2.5">
              {shenSha.dayun.map((item) => (
                <span
                  key={`dayun-${item}`}
                  className="text-xs text-foreground text-center"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 border-r border-border px-2 py-3">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2.5">
              {shenSha.year.map((item) => (
                <span
                  key={`year-${item}`}
                  className="text-xs text-foreground text-center"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 border-r border-border px-2 py-3">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2.5">
              {shenSha.month.map((item) => (
                <span
                  key={`month-${item}`}
                  className="text-xs text-foreground text-center"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 border-r border-border px-2 py-3">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2.5">
              {shenSha.day.map((item) => (
                <span
                  key={`day-${item}`}
                  className="text-xs text-foreground text-center"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 px-2 py-3">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2.5">
              {shenSha.hour.map((item) => (
                <span
                  key={`hour-${item}`}
                  className="text-xs text-foreground text-center"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
