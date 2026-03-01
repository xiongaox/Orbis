/**
 * CaseStudy 模块 - 类型定义与常量
 */
import type { HiddenStem, BaziApiResponse } from '../../types/bazi';
export {
    TIAN_GAN,
    DI_ZHI,
    CATEGORIES,
    LUNAR_MONTH_MAP,
    LUNAR_DAY_MAP,
    HOUR_MAP,
    AUTHOR_MAP,
    DAY_MASTER_CATEGORIES,
    QIMEN_CATEGORIES,
} from './constants';

// ====== 接口定义 ======

export interface CaseMetadata {
    birthDateTime: string | null;  // 1985/07/14 08:00
    gender: '乾造' | '坤造' | null;
    dayMasterElement: string | null;  // 甲木
    pattern: string | null;  // 身弱
    seasonStatus: string | null;  // 失令 得地
}

export interface ParsedBaziInfo {
    gender: '乾造' | '坤造' | null;
    pillars: { ganZhi: string; tiangan: string; dizhi: string; label: string }[];
    daYun: string[];
    birthYear: number | null;
    birthMonth: number | null;
    birthDay: number | null;
    birthHour: number | null;
    isLunar: boolean;
    baziData: BaziApiResponse | null;
}

export interface SimplePillarCardProps {
    label: string;
    tiangan: string;
    dizhi: string;
    tianganShiShen: string;
    zanggan: HiddenStem[];
    diShi: string;
    ziZuo: string;
    kongWang: string;
    naYin: string;
    isDayMaster?: boolean;
    genderLabel?: string;
}
