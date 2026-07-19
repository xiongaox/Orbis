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
