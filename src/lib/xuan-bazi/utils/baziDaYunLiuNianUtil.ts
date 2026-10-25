

// ==================== 类型定义 ====================

/**
 * 大运信息
 */
export interface DaYunInfo {
    /** 主星（十神） */
    zhuXing: string;
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
    /** 藏干 */
    cangGan: string[];
    /** 副星（藏干十神） */
    fuXing: string[];
    /** 自坐（日干对大运支的十二长生） */
    ziZuo: string;
    /** 星运（日干对大运干的十二长生） */
    xingYun: string;
    /** 空亡 */
    kongWang: string;
    /** 纳音 */
    naYin: string;
    /** 神煞 */
    shenSha: string[];
    /** 公历年 */
    solarYear: number;
    /** 年龄 */
    age: number;
    /** 公历日期描述 */
    solarDate: string;
}

/**
 * 流年信息
 */
export interface LiuNianInfo {
    /** 主星（十神） */
    zhuXing: string;
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
    /** 藏干 */
    cangGan: string[];
    /** 副星（藏干十神） */
    fuXing: string[];
    /** 自坐 */
    ziZuo: string;
    /** 星运 */
    xingYun: string;
    /** 空亡 */
    kongWang: string;
    /** 纳音 */
    naYin: string;
    /** 神煞 */
    shenSha: string[];
    /** 公历年 */
    solarYear: number;
    /** 年龄 */
    age: number;
}

/**
 * 流月信息
 */
export interface LiuYueInfo {
    /** 主星 */
    zhuXing: string;
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
    /** 藏干 */
    cangGan: string[];
    /** 纳音 */
    naYin: string;
    /** 公历月日 */
    solarMonthDay: string;
    /** 农历月 */
    lunarMonth: string;
    /** 节气 */
    jieQi: string;
}

/**
 * 流日信息
 */
export interface LiuRiInfo {
    /** 主星 */
    zhuXing: string;
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
    /** 藏干 */
    cangGan: string[];
    /** 纳音 */
    naYin: string;
    /** 公历日 */
    solarDay: number;
    /** 农历日 */
    lunarDay: string;
}

/**
 * 流时信息
 */
export interface LiuShiInfo {
    /** 主星 */
    zhuXing: string;
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
    /** 藏干 */
    cangGan: string[];
    /** 纳音 */
    naYin: string;
    /** 公历时 */
    solarHour: string;
    /** 汉代命名 */
    hanMing: string;
}

// ==================== 工具函数 ====================

/**
 * 获取干支的天干
 */
export function getGan(ganZhi: string): string {
    return ganZhi.charAt(0);
}

/**
 * 获取干支的地支
 */
export function getZhi(ganZhi: string): string {
    return ganZhi.charAt(1);
}

