export const PALACE_NAMES = ['Qian', 'Dui', 'Gen', 'Li', 'Kan', 'Kun', 'Zhen', 'Xun'] as const;

export type PalaceName = (typeof PALACE_NAMES)[number];

export const MOUNTAINS = [
    '壬', '子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳',
    '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥',
] as const;

export type Mountain = (typeof MOUNTAINS)[number];
export type YuanPhase = 'upper' | 'lower';
export type PanType = 'xia' | 'ti';
export type FlightDirection = '顺飞' | '逆飞';

export interface SanYuanDirection {
    id: string;
    label: string;
    mountain: Mountain;
    facing: Mountain;
}

export interface SanYuanInput {
    mountain: Mountain;
    facing: Mountain;
    yun: number;
    panType: PanType;
    yuanPhase: YuanPhase;
}

export interface SanYuanPalace {
    name: PalaceName;
    label: string;
    bigXuanKong: number;
    yunStar: number;
    mountainStar: number;
    facingStar: number;
    earthStar: number;
    waterStar: number;
    heavenStar: number;
}

export interface SanYuanHeader {
    directionLabel: string;
    yun: number;
    panType: PanType;
    panTypeLabel: '下卦' | '替卦';
    yuanPhase: YuanPhase;
    yuanPhaseLabel: '上元' | '下元';
    mountainStart: number;
    facingStart: number;
    bigXuanKongStart: number;
    bigXuanKongFlight: FlightDirection;
    mountainFlight: FlightDirection;
    facingFlight: FlightDirection;
    mountainUsesReplacement: boolean;
    facingUsesReplacement: boolean;
    mountainNaJia: PalaceName;
    mountainFlippedNaJia: PalaceName;
    facingNaJia: PalaceName;
}

export interface SanYuanChart {
    input: SanYuanInput;
    header: SanYuanHeader;
    palaces: Record<PalaceName, SanYuanPalace>;
}

export type NineStarName = '贪狼' | '巨门' | '禄存' | '文曲' | '廉贞' | '武曲' | '破军' | '辅弼';
export type HumanStarRelation = '生气' | '天医' | '祸害' | '六煞' | '五鬼' | '延年' | '绝命' | '伏位';
export type PalaceVerificationLevel = 'priority' | 'verify' | 'caution';

/** 盘级格局四大局（按当运星与坐向的关系判定） */
export type SanYuanChartPatternId =
    | 'wang-shan-wang-xiang'   // 旺山旺向
    | 'shang-shan-xia-shui'    // 上山下水
    | 'shuang-xing-hui-zuo'    // 双星会坐
    | 'shuang-xing-hui-xiang'; // 双星会向

export interface SanYuanChartSummary {
    /** 四大局：当运山星/向星与坐山、向首的关系；九运等无当运旺山旺向组合时为 null */
    pattern: {
        id: SanYuanChartPatternId;
        title: string;
        /** 判定依据（如「山星九到坐山乾，向星九到向首丙」） */
        basis: string;
        /** 断语（形峦前提 + 吉凶取向，随格局固定） */
        verdict: string;
    } | null;
    /** 伏吟：山盘或向盘与元旦盘逐宫相同 */
    fuYin: { pan: '山盘' | '向盘'; palace: PalaceName }[] | null;
    /** 反吟：山盘或向盘与元旦盘逐宫合十 */
    fanYin: { pan: '山盘' | '向盘'; palace: PalaceName }[] | null;
    /** 合十：山盘或向盘与运盘逐宫合十 */
    heShi: { pan: '山盘' | '向盘' }[] | null;
    /** 当运旺星（山星/向星 = 运数）落宫 */
    wangStars: {
        kind: '山星' | '向星';
        palaces: { name: PalaceName; label: string }[];
    }[];
    /** 大玄空零神方（当元零神数所在宫） */
    zeroGodPalaces: { name: PalaceName; label: string; value: number }[];
    /** 山/向星五黄落宫（寄宫除外）；无则空数组 */
    wuHuang: { kind: '山星' | '向星'; palace: { name: PalaceName; label: string } }[];
}

/** 山星×向星组合断语（宫位详情用） */
export interface SanYuanStarPairInsight {
    mountainStar: number;
    facingStar: number;
    /** 组合通则名（如「二五交加」「一六共宗」）；无收录组合为 null */
    name: string | null;
    /** 组合断语；无收录组合为 null */
    meaning: string | null;
}

export interface SanYuanTalentInsight {
    title: string;
    alias: string;
    value: number;
    starName: NineStarName;
    relation?: HumanStarRelation;
    isFourAuspicious: boolean;
    guidance: string;
}

export interface SanYuanPalaceAnalysis {
    palace: PalaceName;
    palaceLabel: string;
    bigXuanKong: {
        value: number;
        role: '零神' | '正神';
    };
    timing: {
        mountainStar: number;
        facingStar: number;
        mountainAtCurrentYun: boolean;
        facingAtCurrentYun: boolean;
    };
    talents: {
        earthMother: SanYuanTalentInsight;
        heavenFather: SanYuanTalentInsight;
        humanChild: SanYuanTalentInsight;
        fourAuspiciousCount: number;
    };
    verification: {
        level: PalaceVerificationLevel;
        title: string;
        summary: string;
        actionTips: readonly string[];
        checklist: readonly string[];
    };
}
