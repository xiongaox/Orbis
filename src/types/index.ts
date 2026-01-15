export interface BaziChartData {
    // Pillars (GanZhi)
    year_pillar?: string;
    month_pillar?: string;
    day_pillar?: string;
    hour_pillar?: string;

    // Main Stars (Shi Shen) - Year, Month, Day, Hour
    main_stars?: string[]; // [Year, Month, Day, Hour]

    // Hidden Stems (Cang Gan)
    // Structure: [Year, Month, Day, Hour], each containing an array of stems
    hidden_stems?: { stem: string; god: string }[][];

    // Star Luck (Shi Er Zhang Sheng) - Relative to Day Master
    star_lucks?: string[]; // [Year, Month, Day, Hour]

    // Self Sitting (Zi Zuo) - Life stage of the pillar itself
    self_sitting?: string[]; // [Year, Month, Day, Hour]

    // Na Yin (Melodic Element)
    na_yin?: string[]; // [Year, Month, Day, Hour]

    // Void (Kong Wang)
    kong_wang?: string[]; // [Year, Month, Day, Hour]

    // Shen Sha (Gods and Evils) - Grouped for display
    shen_sha?: string[];
}

export interface Case extends BaziChartData {
    id: string;
    name: string;
    gender: 'male' | 'female';
    birth_date: string; // ISO string
    created_at: string;
    solar_date?: string;
    lunar_date?: string;
    zodiac?: string; // Animal sign
}

// 排盘类型
export type ChartType =
    | 'bazi'
    | 'qimen'
    | 'liuyao'
    | 'ziwei'
    | 'daliuren'
    | 'xiaoliuren'
    | 'meihua'
    | 'wannianli'
    | 'sanyuan';

