/**
 * duanfaCategories - 应用底层设施
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
 * - `ShuShuCategory`, `SHU_SHU_CATEGORIES`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
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
