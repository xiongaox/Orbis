/**
 * 奇门遁甲模块 - 九宫盘式组件
 * 显示 3x3 九宫格布局，按洛书顺序排列
 * 宫位内采用 3行x3列 网格布局，参照 Figma 设计稿
 */

// 九宫数据结构
export interface QimenPalace {
    position: number;       // 1-9 宫位编号（洛书数）
    gongName: string;       // 宫名（坎、坤、震、巽、中、乾、兑、艮、离）
    tianPan: string;        // 天盘干
    diPan: string;          // 地盘干
    men: string;            // 八门
    xing: string;           // 九星
    shen: string;           // 八神
    anGan?: string;         // 暗干
    // 旺相休囚废状态
    shenWang?: string;      // 八神旺相
    xingWang?: string;      // 九星旺相
    menWang?: string;       // 八门旺相
    // 十二长生
    anGanShiErCS?: string;  // 暗干十二长生
    tianPanShiErCS?: string; // 天盘干十二长生
    diPanShiErCS?: string;  // 地盘干十二长生
}

interface QimenChartProps {
    palaces: QimenPalace[];
    selectedPalace: number | null;
    onSelectPalace: (position: number) => void;
    header: {
        solarDate: string;
        lunarDate: string;
        ju: string;
        xunShou: string;
        zhiFu: string;
        zhiShi: string;
        maXing: string;
        kongWang: string;
        siZhu: {
            year: string;
            month: string;
            day: string;
            hour: string;
        };
    };
}

// Mock 数据 - 静态展示用
const MOCK_PALACES: QimenPalace[] = [
    { position: 4, gongName: '巽', tianPan: '丁', diPan: '乙', men: '生门', xing: '禽芮', shen: '六合', anGan: '庚', shenWang: '马', xingWang: '囚|月相', menWang: '死|月旺', anGanShiErCS: '刑养胎', tianPanShiErCS: '袁旺', diPanShiErCS: '冠沐' },
    { position: 9, gongName: '离', tianPan: '戊', diPan: '戊', men: '惊门', xing: '天禽', shen: '值符', anGan: '壬', shenWang: '旺', xingWang: '月旺', menWang: '休|旺', anGanShiErCS: '死', tianPanShiErCS: '旺', diPanShiErCS: '旺' },
    { position: 2, gongName: '坤', tianPan: '庚', diPan: '丁', men: '开门', xing: '天柱', shen: '腾蛇', anGan: '癸', shenWang: '衰', xingWang: '月相', menWang: '相|月旺', anGanShiErCS: '绝', tianPanShiErCS: '冠', diPanShiErCS: '墓' },
    { position: 3, gongName: '震', tianPan: '辛', diPan: '乙', men: '景门', xing: '天辅', shen: '九地', anGan: '丙', shenWang: '相', xingWang: '休|月休', menWang: '旺|月旺', anGanShiErCS: '沐', tianPanShiErCS: '胎', diPanShiErCS: '旺' },
    { position: 5, gongName: '中', tianPan: '癸', diPan: '癸', men: '', xing: '', shen: '', anGan: '' },
    { position: 7, gongName: '兑', tianPan: '丙', diPan: '己', men: '休门', xing: '天心', shen: '太阴', anGan: '己', shenWang: '休', xingWang: '相|月度', menWang: '囚|月死', anGanShiErCS: '衰', tianPanShiErCS: '冠', diPanShiErCS: '养' },
    { position: 8, gongName: '艮', tianPan: '乙', diPan: '丙', men: '杜门', xing: '天冲', shen: '玄武', anGan: '丁', shenWang: '死', xingWang: '休|月休', menWang: '相|月相', anGanShiErCS: '长', tianPanShiErCS: '胎', diPanShiErCS: '沐' },
    { position: 1, gongName: '坎', tianPan: '丁', diPan: '庚', men: '伤门', xing: '天任', shen: '白虎', anGan: '戊', shenWang: '囚', xingWang: '死|月死', menWang: '休|月休', anGanShiErCS: '墓', tianPanShiErCS: '冠', diPanShiErCS: '绝' },
    { position: 6, gongName: '乾', tianPan: '己', diPan: '辛', men: '生门', xing: '天蓬', shen: '六合', anGan: '庚', shenWang: '马', xingWang: '囚|月因', menWang: '死|月旺', anGanShiErCS: '刑养胎', tianPanShiErCS: '养胎', diPanShiErCS: '冠沐' },
];

const MOCK_HEADER = {
    solarDate: '2026年1月15日',
    lunarDate: '冬月廿七',
    ju: '阳遁五局',
    xunShou: '甲子戊',
    zhiFu: '天禽',
    zhiShi: '死门',
    maXing: '亥',
    kongWang: '申酉',
    siZhu: {
        year: '乙巳',
        month: '己丑',
        day: '壬申',
        hour: '壬申',
    },
};

// 洛书九宫布局顺序（按行从左到右，从上到下）
const LUOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];



export default function QimenChart({
    palaces = MOCK_PALACES,
    selectedPalace,
    onSelectPalace,
    header = MOCK_HEADER,
}: Partial<QimenChartProps> & { selectedPalace: number | null; onSelectPalace: (p: number) => void }) {
    const orderedPalaces = LUOSHU_ORDER.map(pos => palaces.find(p => p.position === pos)!);

    return (
        <div className="flex flex-col h-full overflow-hidden items-center p-2">
            {/* 九宫盘高度决定整体宽度的容器 */}
            <div className="flex flex-col flex-1 min-h-0 items-center w-full">
                {/* 内容容器：宽度由九宫盘决定 */}
                <div className="flex flex-col h-full items-center">
                    {/* 顶部信息栏 - 宽度 100% 跟随父容器 */}
                    <div className="w-full flex-shrink-0 mb-2">
                        <div className="w-full bg-card rounded-xl border border-border p-4 2xl:p-5 flex flex-col gap-3 2xl:gap-4">
                            {/* 第一行：日期时间 + 操作按钮 */}
                            <div className="flex items-center justify-between text-sm 2xl:text-xl">
                                <div className="flex items-baseline gap-1 2xl:gap-2">
                                    <span className="font-serif font-bold text-foreground">
                                        {header.solarDate.replace(/年|月|日/g, (match) => ` ${match} `)}
                                    </span>
                                    <span className="font-serif text-foreground">
                                        ({header.lunarDate})
                                    </span>
                                    <span className="font-serif font-bold text-foreground ml-1 2xl:ml-2">
                                        13:52
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 2xl:gap-2">
                                    <button className="px-2 2xl:px-3 py-0.5 2xl:py-1 text-xs 2xl:text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors font-serif">
                                        现在
                                    </button>
                                    <button className="px-2 2xl:px-3 py-0.5 2xl:py-1 text-xs 2xl:text-sm bg-secondary text-muted-foreground rounded-md hover:bg-secondary/80 transition-colors font-serif border border-border">
                                        重新选择
                                    </button>
                                </div>
                            </div>

                            {/* 第二行：四柱 + 信息 */}
                            <div className="flex items-center justify-start">
                                {/* 左侧：四柱 */}
                                <div className="flex gap-5 2xl:gap-6">
                                    {([
                                        { key: 'year', label: '年' },
                                        { key: 'month', label: '月' },
                                        { key: 'day', label: '日' },
                                        { key: 'hour', label: '时' }
                                    ] as const).map(({ key, label }) => (
                                        <div key={key} className="flex flex-col items-center relative pr-3 2xl:pr-4">
                                            <span className="text-base 2xl:text-2xl font-serif text-foreground leading-none mb-0.5 2xl:mb-1">
                                                {header.siZhu[key][0]}
                                            </span>
                                            <span className="text-base 2xl:text-2xl font-serif text-foreground leading-none">
                                                {header.siZhu[key][1]}
                                            </span>
                                            {/* 标签：绝对定位在右侧中间 */}
                                            <span className="absolute top-1/2 -translate-y-1/2 right-0 text-xs 2xl:text-sm text-muted-foreground/60 font-serif transform scale-90 origin-right">
                                                {label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* 分割线 - 调整间距以配合 justify-start */}
                                <div className="h-6 2xl:h-10 w-px bg-border/60 ml-4 2xl:ml-8 mr-4 2xl:mr-10" />

                                {/* 右侧：局数信息 */}
                                <div className="grid grid-cols-3 gap-y-0.5 2xl:gap-y-1 gap-x-3 2xl:gap-x-8 text-xs 2xl:text-base">
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            {header.ju.substring(0, 2)}:
                                        </span>
                                        <span className="text-foreground font-serif">
                                            {header.ju.substring(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            旬首:
                                        </span>
                                        <span className="text-foreground font-serif">
                                            {header.xunShou}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            马星:
                                        </span>
                                        <span className="text-foreground font-serif">
                                            {header.maXing}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            值符:
                                        </span>
                                        <span className="text-foreground font-serif">
                                            {header.zhiFu}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            值使:
                                        </span>
                                        <span className="text-foreground font-serif">
                                            {header.zhiShi}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 2xl:gap-2">
                                        <span className="text-muted-foreground font-light">
                                            空亡(时):
                                        </span>
                                        <span className="text-foreground font-serif">
                                            {header.kongWang}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 第三行：标签 + 操作按钮 */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 2xl:gap-2">
                                    <div className="px-2 2xl:px-3.5 py-0.5 rounded-full border border-border text-muted-foreground text-xs 2xl:text-sm font-serif">
                                        时家置润转盘
                                    </div>
                                    <div className="px-2 2xl:px-3.5 py-0.5 rounded-full border border-border text-muted-foreground text-xs 2xl:text-sm font-serif">
                                        天显
                                    </div>
                                    <div className="px-2 2xl:px-3.5 py-0.5 rounded-full border border-border text-muted-foreground text-xs 2xl:text-sm font-serif">
                                        五不
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 2xl:gap-2">
                                    <button className="px-2 2xl:px-3.5 py-0.5 text-xs 2xl:text-sm bg-secondary/80 text-muted-foreground rounded-full hover:bg-secondary transition-colors font-serif border border-border">
                                        上一局
                                    </button>
                                    <button className="px-2 2xl:px-3.5 py-0.5 text-xs 2xl:text-sm bg-secondary/80 text-muted-foreground rounded-full hover:bg-secondary transition-colors font-serif border border-border">
                                        下一局
                                    </button>
                                    <button className="px-2 2xl:px-3.5 py-0.5 text-xs 2xl:text-sm bg-secondary/80 text-muted-foreground rounded-full hover:bg-secondary transition-colors font-serif border border-border">
                                        高级设置
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 九宫格盘式 - 基于剩余高度自适应尺寸 */}
                    <div className="flex-1 flex items-center justify-center min-h-0 w-full">
                        <div className="h-full aspect-square max-w-full bg-card rounded-xl border border-border p-2">
                            <div className="grid grid-cols-3 gap-1 h-full">
                                {orderedPalaces.map((palace) => (
                                    <button
                                        key={palace.position}
                                        type="button"
                                        onClick={() => onSelectPalace(palace.position)}
                                        className={`relative rounded-lg border transition-all ${selectedPalace === palace.position
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border/50 hover:border-border hover:bg-muted/30'
                                            } ${palace.position === 5 ? 'bg-muted/20' : ''}`}
                                    >
                                        {/* 中宫特殊布局：左上暗干，右下地盘干 */}
                                        {palace.position === 5 ? (
                                            <>
                                                <div className="grid grid-cols-3 grid-rows-3 h-full p-1 2xl:p-1.5 gap-0">
                                                    {/* (1,1) 暗干 - 对应其他宫位的暗干位置 */}
                                                    <div className="flex items-center justify-center">
                                                        <span className="text-lg 2xl:text-xl font-serif text-muted-foreground">{palace.anGan}</span>
                                                    </div>
                                                    <div />
                                                    <div />

                                                    <div />
                                                    <div />
                                                    <div />

                                                    <div />
                                                    <div />
                                                    {/* (3,3) 地盘干 - 对应其他宫位的天盘干位置 */}
                                                    <div className="flex flex-col items-center justify-center leading-tight">
                                                        <span className="text-lg 2xl:text-xl font-serif text-foreground">{palace.diPan}</span>
                                                        {/* 如果地盘干也有十二长生，即使是空字符串也占位保持对齐 */}
                                                        <span className="text-xs 2xl:text-sm text-muted-foreground opacity-0">占位</span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* 宫位内 3x3 网格布局 */}
                                                <div className="h-full flex flex-col justify-center">
                                                    <div className="grid grid-cols-3 w-full p-1 2xl:p-1.5 gap-y-2 2xl:gap-y-4 gap-x-0">
                                                        {/* 第一行 - 底部对齐，减少与第二行九星的间距 */}
                                                        <div className="flex items-end justify-center pb-0.5 2xl:pb-1">
                                                            <span className="text-base 2xl:text-xl font-serif text-muted-foreground">{palace.anGan}</span>
                                                        </div>
                                                        <div className="flex items-end justify-center pb-0.5 2xl:pb-1">
                                                            {/* 八神：次大 */}
                                                            <span className="text-base 2xl:text-xl font-serif text-foreground/60">{palace.shen}</span>
                                                        </div>
                                                        <div className="flex items-end justify-center pb-0.5 2xl:pb-1">
                                                            <span className="text-base 2xl:text-xl font-serif text-muted-foreground">{palace.shenWang}</span>
                                                        </div>

                                                        {/* 第二行 - 底部对齐 */}
                                                        <div className="flex flex-col items-center justify-end leading-tight">
                                                            <div className="h-7 2xl:h-9 flex items-end">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.anGan}</span>
                                                            </div>
                                                            <span className="text-sm 2xl:text-sm text-muted-foreground mt-0.5">{palace.anGanShiErCS}</span>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-end leading-tight">
                                                            {/* 九星：最大，最醒目 */}
                                                            <div className="h-7 2xl:h-9 flex items-end">
                                                                <span className="text-2xl 2xl:text-3xl font-serif font-bold text-foreground">{palace.xing}</span>
                                                            </div>
                                                            <span className="text-sm 2xl:text-sm text-muted-foreground mt-0.5">{palace.xingWang}</span>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-end leading-tight">
                                                            <div className="h-7 2xl:h-9 flex items-end">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.diPan}</span>
                                                            </div>
                                                            <span className="text-sm 2xl:text-sm text-muted-foreground mt-0.5">{palace.diPanShiErCS}</span>
                                                        </div>

                                                        {/* 第三行 - 底部对齐 */}
                                                        <div className="flex items-center justify-center">
                                                            {/* 空位 */}
                                                        </div>
                                                        <div className="flex flex-col items-center justify-end leading-tight">
                                                            {/* 八门：次大 */}
                                                            <div className="h-6 2xl:h-8 flex items-end">
                                                                <span className="text-lg 2xl:text-2xl font-serif text-foreground">{palace.men}</span>
                                                            </div>
                                                            <span className="text-sm 2xl:text-sm text-muted-foreground mt-0.5">{palace.menWang}</span>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-end leading-tight">
                                                            <div className="h-6 2xl:h-8 flex items-end">
                                                                <span className="text-base 2xl:text-xl font-serif text-foreground">{palace.tianPan}</span>
                                                            </div>
                                                            <span className="text-sm 2xl:text-sm text-muted-foreground mt-0.5">{palace.tianPanShiErCS}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
