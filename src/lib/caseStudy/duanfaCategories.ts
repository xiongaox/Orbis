/**
 * 断法 - 术数分类定义
 */

export interface ShuShuCategory {
    id: string;
    label: string;
}

export const SHU_SHU_CATEGORIES: ShuShuCategory[] = [
    { id: 'qimen', label: '奇门断法' },
    { id: 'bazi', label: '八字断法' },
    { id: 'ziwei', label: '紫微斗数' },
    { id: 'liuyao', label: '六爻预测' },
];
