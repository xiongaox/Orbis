/**
 * 八字 API 相关类型定义
 */

// 藏干结构
export interface HiddenStem {
    gan: string;       // 天干
    shiShen: string;   // 十神
    element: string;   // 五行 (wood/fire/earth/metal/water)
}

// 单柱数据（年/月/日/时）
export interface PillarData {
    label: string;            // 年柱/月柱/日柱/时柱
    ganZhi: string;           // 干支，如 "戊寅"
    tiangan: string;          // 天干
    dizhi: string;            // 地支
    tianganElement: string;   // 天干五行
    dizhiElement: string;     // 地支五行
    tianganShiShen: string;   // 天干十神
    dizhiShiShen: string[];   // 地支十神（藏干对应）
    zanggan: HiddenStem[];    // 藏干列表
    diShi: string;            // 十二长生（地势）
    ziZuo?: string;           // 自坐
    naYin: string;            // 纳音
    kongWang: string;         // 空亡
}

// 起运信息
export interface YunInfo {
    startYear: number;        // 起运年数
    startMonth: number;       // 起运月数
    startDay: number;         // 起运天数
    startHour?: number;       // 起运小时数
    startSolarDate: string;   // 起运阳历日期
    isForward: boolean;       // 是否顺行
}

// 大运周期
export interface DaYunPeriod {
    index: number;       // 第几轮（0为出生年）
    startYear: number;   // 起始年份
    endYear: number;     // 结束年份
    startAge: number;    // 起始年龄
    endAge: number;      // 结束年龄
    ganZhi: string;      // 干支
    tiangan: string;     // 天干
    dizhi: string;       // 地支
    xunKong?: string;    // 空亡
}

// 流月
export interface LiuYue {
    month: string;   // 中文月份
    index: number;   // 月份索引 0-11
    ganZhi: string;
    tiangan: string;
    dizhi: string;
}

// 流年
export interface LiuNian {
    year: number;
    age: number;
    ganZhi: string;
    tiangan: string;
    dizhi: string;
    dayunIndex?: number;  // 所属大运索引
    liuYue?: LiuYue[];    // 流月列表
}

// 小运
export interface XiaoYun {
    year: number;
    age: number;
    ganZhi: string;
    dayunIndex?: number;  // 所属大运索引
}

// 额外信息
export interface ExtraInfo {
    taiYuan: string;   // 胎元
    mingGong: string;  // 命宫
    shenGong: string;  // 身宫
}

// 神煞信息
export interface ShenShaInfo {
    jiShen: string[];    // 吉神
    xiongSha: string[];  // 凶煞
}

// 动态柱（大运/流年）详细数据
export interface DynamicYunPillar {
    label: string;
    ganZhi: string;
    tiangan: string;
    dizhi: string;
    tianganElement: string;
    dizhiElement: string;
    tianganShiShen: string;
    zanggan: HiddenStem[];
    diShi: string;
    ziZuo?: string;
    naYin: string;
    kongWang: string;
    index?: number;
}

// API 完整响应
export interface BaziApiResponse {
    // 日期信息
    solarDate: string;
    lunarDate: string;
    zodiac: string;
    gender: string;

    // 四柱
    pillars: PillarData[];  // [年柱, 月柱, 日柱, 时柱]

    // 起运信息
    yunInfo: YunInfo;

    // 大运列表
    daYun: DaYunPeriod[];

    // 所有流年
    liuNian: LiuNian[];

    // 当前大运的小运
    currentXiaoYun: XiaoYun[];

    // 神煞
    shenSha?: ShenShaInfo;

    // 额外信息
    extra: ExtraInfo;

    // 当前详细大运/流年 (用于填充详细列)
    currentDaYun?: DynamicYunPillar;
    currentLiuNian?: DynamicYunPillar;
}

// API 请求参数
export interface FetchBaziParams {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute?: number;
    gender: 'male' | 'female';
}
