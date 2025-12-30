const dayunPeriods = [
  { age: '1-3岁', stem: '庚', branch: '申', years: '2000' },
  { age: '4岁', stem: '辛', branch: '酉', years: '2001' },
  { age: '14岁', stem: '壬', branch: '戌', years: '2011' },
  { age: '24岁', stem: '癸', branch: '亥', years: '2021' },
  { age: '34岁', stem: '甲', branch: '子', years: '2031' },
  { age: '44岁', stem: '乙', branch: '丑', years: '2041' },
  { age: '54岁', stem: '丙', branch: '寅', years: '2051' },
  { age: '64岁', stem: '丁', branch: '卯', years: '2061' },
  { age: '74岁', stem: '戊', branch: '辰', years: '2071' },
  { age: '84岁', stem: '己', branch: '巳', years: '2081' },
];

const liunianYears = [
  { year: 2018, stem: '戊', branch: '戌', xiaoyun: '己未' },
  { year: 2019, stem: '己', branch: '亥', xiaoyun: '戊午' },
  { year: 2020, stem: '庚', branch: '子', xiaoyun: '丁巳' },
  { year: 2021, stem: '辛', branch: '丑', xiaoyun: '丙辰' },
  { year: 2022, stem: '壬', branch: '寅', xiaoyun: '乙卯' },
  { year: 2023, stem: '癸', branch: '卯', xiaoyun: '甲寅' },
  { year: 2024, stem: '甲', branch: '辰', xiaoyun: '癸丑' },
  { year: 2025, stem: '乙', branch: '巳', xiaoyun: '壬子' },
  { year: 2026, stem: '丙', branch: '午', xiaoyun: '辛亥' },
  { year: 2027, stem: '丁', branch: '未', xiaoyun: '庚戌' },
];

const liuyueMonths = [
  { month: '2/3', label: '立春', stem: '戊', branch: '寅' },
  { month: '3/5', label: '惊蛰', stem: '己', branch: '卯' },
  { month: '4/4', label: '清明', stem: '庚', branch: '辰' },
  { month: '5/5', label: '立夏', stem: '辛', branch: '巳' },
  { month: '6/5', label: '芒种', stem: '壬', branch: '午' },
  { month: '7/7', label: '小暑', stem: '癸', branch: '未' },
  { month: '8/7', label: '立秋', stem: '甲', branch: '申' },
  { month: '9/7', label: '白露', stem: '乙', branch: '酉' },
  { month: '10/8', label: '寒露', stem: '丙', branch: '戌' },
  { month: '11/7', label: '立冬', stem: '丁', branch: '亥' },
];

const elementMeta: Record<string, { element: string; polarity: 'yang' | 'yin' }> = {
  甲: { element: 'wood', polarity: 'yang' },
  乙: { element: 'wood', polarity: 'yin' },
  丙: { element: 'fire', polarity: 'yang' },
  丁: { element: 'fire', polarity: 'yin' },
  戊: { element: 'earth', polarity: 'yang' },
  己: { element: 'earth', polarity: 'yin' },
  庚: { element: 'metal', polarity: 'yang' },
  辛: { element: 'metal', polarity: 'yin' },
  壬: { element: 'water', polarity: 'yang' },
  癸: { element: 'water', polarity: 'yin' },
  子: { element: 'water', polarity: 'yang' },
  丑: { element: 'earth', polarity: 'yin' },
  寅: { element: 'wood', polarity: 'yang' },
  卯: { element: 'wood', polarity: 'yin' },
  辰: { element: 'earth', polarity: 'yang' },
  巳: { element: 'fire', polarity: 'yin' },
  午: { element: 'fire', polarity: 'yang' },
  未: { element: 'earth', polarity: 'yin' },
  申: { element: 'metal', polarity: 'yang' },
  酉: { element: 'metal', polarity: 'yin' },
  戌: { element: 'earth', polarity: 'yang' },
  亥: { element: 'water', polarity: 'yin' },
};

const generates: Record<string, string> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

const controls: Record<string, string> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};

const dayMaster = '丙';

const inverseMap = (map: Record<string, string>) =>
  Object.entries(map).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[value] = key;
    return acc;
  }, {});

const generatedBy = inverseMap(generates);
const controlledBy = inverseMap(controls);

const toTenGod = (target: string) => {
  const day = elementMeta[dayMaster];
  const meta = elementMeta[target];
  if (!day || !meta) return '';

  const samePolarity = day.polarity === meta.polarity;
  if (meta.element === day.element) {
    return samePolarity ? '比肩' : '劫财';
  }
  if (meta.element === generates[day.element]) {
    return samePolarity ? '食神' : '伤官';
  }
  if (meta.element === controls[day.element]) {
    return samePolarity ? '偏财' : '正财';
  }
  if (meta.element === generatedBy[day.element]) {
    return samePolarity ? '偏印' : '正印';
  }
  if (meta.element === controlledBy[day.element]) {
    return samePolarity ? '七杀' : '正官';
  }
  return '';
};

const tenGodAbbr: Record<string, string> = {
  比肩: '比',
  劫财: '劫',
  食神: '食',
  伤官: '伤',
  正财: '财',
  偏财: '才',
  正印: '印',
  偏印: '枭',
  正官: '官',
  七杀: '杀',
};

const toTenGodAbbr = (target: string) => tenGodAbbr[toTenGod(target)] ?? '';

export default function DayunLiunianPanel() {
  return (
    <div className="min-h-0 min-w-0 overflow-hidden">
      <div className="bg-card rounded-xl border border-border overflow-hidden h-fit flex flex-col">
        <div className="border-b border-border">
          <div className="flex">
            <div className="w-10 bg-secondary/30 border-r border-border flex items-center justify-center">
              <div className="text-base text-muted-foreground font-medium leading-none flex flex-col items-center gap-1">
                <span>大</span>
                <span>运</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="grid grid-cols-10 min-w-0 w-full">
                {dayunPeriods.map((item, index) => (
                  <div
                    key={`${item.age}-${item.stem}`}
                    className={`min-w-0 p-3 border-r border-border last:border-r-0 ${
                      index === 3 ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-sm text-muted-foreground leading-snug">
                          {item.age}
                        </div>
                        <div className="text-sm text-muted-foreground leading-snug">
                          {item.years}
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex items-baseline justify-center gap-x-1">
                          <span className="font-display text-lg text-foreground leading-none">
                            {item.stem}
                          </span>
                          <span className="text-base text-muted-foreground leading-none">
                            {toTenGodAbbr(item.stem)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-center gap-x-1">
                          <span className="font-display text-lg text-foreground leading-none">
                            {item.branch}
                          </span>
                          <span className="text-base text-muted-foreground leading-none">
                            {toTenGodAbbr(item.branch)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="border-b border-border">
          <div className="flex">
            <div className="w-10 bg-secondary/30 border-r border-border flex items-center justify-center">
              <div className="flex flex-col items-center justify-between h-full py-3">
                <div className="text-base text-muted-foreground font-medium leading-none flex flex-col items-center gap-1">
                  <span>流</span>
                  <span>年</span>
                </div>
                <div className="text-base text-muted-foreground font-medium leading-none flex flex-col items-center gap-1">
                  <span>小</span>
                  <span>运</span>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="grid grid-cols-10 min-w-0 w-full">
                {liunianYears.map((item) => (
                  <div
                    key={item.year}
                    className={`min-w-0 p-3 border-r border-border last:border-r-0 ${
                      item.year === 2025 ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="text-sm text-foreground leading-snug">{item.year}</div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-baseline justify-center gap-x-1">
                          <span className="font-display text-lg text-foreground leading-none">
                            {item.stem}
                          </span>
                          <span className="text-base text-muted-foreground leading-none">
                            {toTenGodAbbr(item.stem)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-center gap-x-1">
                          <span className="font-display text-lg text-foreground leading-none">
                            {item.branch}
                          </span>
                          <span className="text-base text-muted-foreground leading-none">
                            {toTenGodAbbr(item.branch)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground leading-none">
                        {item.xiaoyun}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="flex">
            <div className="w-10 bg-secondary/30 border-r border-border flex items-center justify-center">
              <div className="text-base text-muted-foreground font-medium leading-none flex flex-col items-center gap-1">
                <span>流</span>
                <span>月</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="grid grid-cols-10 min-w-0 w-full">
                {liuyueMonths.map((item) => (
                <div
                  key={`${item.month}-${item.label}`}
                  className="min-w-0 p-3 border-r border-border last:border-r-0"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-xs text-muted-foreground leading-snug">
                        {item.label}
                      </div>
                      <div className="text-xs text-muted-foreground leading-snug">
                        {item.month}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-baseline justify-center gap-x-1">
                        <span className="font-display text-lg text-foreground leading-none">
                          {item.stem}
                        </span>
                        <span className="text-base text-muted-foreground leading-none">
                          {toTenGodAbbr(item.stem)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-center gap-x-1">
                        <span className="font-display text-lg text-foreground leading-none">
                          {item.branch}
                        </span>
                        <span className="text-base text-muted-foreground leading-none">
                          {toTenGodAbbr(item.branch)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
