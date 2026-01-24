/**
 * CaseStudy 模块 - 类型定义与常量
 */
import type { HiddenStem, BaziApiResponse } from '../../types/bazi';

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

// ====== 常量定义 ======

// 模块分类列表
export const CATEGORIES = [
    { id: 'bazi', label: '命理', name: '八字' },
    { id: 'qimen', label: '预测', name: '奇门' },
    { id: 'duanfa', label: '断法', name: '断法' },
    { id: 'liuyao', label: '预测', name: '六爻' },
    { id: 'ziwei', label: '命理', name: '紫薇' },
];

// 农历月份映射
export const LUNAR_MONTH_MAP: Record<string, number> = {
    '正': 1, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
    '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '冬': 11, '十二': 12, '腊': 12
};

// 农历日期映射
export const LUNAR_DAY_MAP: Record<string, number> = {
    '初一': 1, '初二': 2, '初三': 3, '初四': 4, '初五': 5, '初六': 6, '初七': 7, '初八': 8, '初九': 9, '初十': 10,
    '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15, '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
    '廿一': 21, '廿二': 22, '廿三': 23, '廿四': 24, '廿五': 25, '廿六': 26, '廿七': 27, '廿八': 28, '廿九': 29, '三十': 30,
    '三十一': 31
};

// 时辰映射
export const HOUR_MAP: Record<string, number> = {
    '子': 0, '丑': 2, '寅': 4, '卯': 6, '辰': 8, '巳': 10,
    '午': 12, '未': 14, '申': 16, '酉': 18, '戌': 20, '亥': 22
};

// 天干地支表
export const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 作者映射
// 作者映射
export const AUTHOR_MAP: Record<string, string> = {
    'lishuanglin': '李双林',
    'nanxuanzi': '南玄子',
    'buchuiniu': '不吹牛',
    'zhangzhichun': '张志春',
};

// 日主分类列表
export const DAY_MASTER_CATEGORIES = [
    { id: 'all', label: '全部' },
    { id: '甲日命造', label: '甲日' },
    { id: '乙日命造', label: '乙日' },
    { id: '丙日命造', label: '丙日' },
    { id: '丁日命造', label: '丁日' },
    { id: '戊日命造', label: '戊日' },
    { id: '己日命造', label: '己日' },
    { id: '庚日命造', label: '庚日' },
    { id: '辛日命造', label: '辛日' },
    { id: '壬日命造', label: '壬日' },
    { id: '癸日命造', label: '癸日' },
    { id: '特殊格局', label: '特殊格局' },
];

// 奇门分类列表
export const QIMEN_CATEGORIES = [
    { id: 'all', label: '全部' },
    { id: '恋爱婚姻', label: '恋爱婚姻' },
    { id: '工作事业', label: '工作事业' },
    { id: '经营求财', label: '经营求财' },
    { id: '出行出国', label: '出行出国' },
    { id: '失物丢人', label: '失物丢人' },
    { id: '怀孕分娩', label: '怀孕分娩' },
    { id: '官司诉讼', label: '官司诉讼' },
    { id: '求学考试', label: '求学考试' },
    { id: '人体疾病', label: '人体疾病' },
    { id: '人生机遇', label: '人生机遇' },
    { id: '体育竞赛', label: '体育竞赛' },
    { id: '其他杂项', label: '其他杂项' },
    { id: '军事事件', label: '军事事件' },
    { id: '地理环境', label: '地理环境' },
    { id: '天时气象', label: '天时气象' },
];
