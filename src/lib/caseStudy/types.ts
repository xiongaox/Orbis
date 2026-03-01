/**
 * types - 应用底层设施
 *
 * 模块定位：
 * - 所在层级：应用底层设施
 * - 主要目标：封装第三方库或核心底层能力
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `CaseMetadata`, `ParsedBaziInfo`, `SimplePillarCardProps`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `bazi`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
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
