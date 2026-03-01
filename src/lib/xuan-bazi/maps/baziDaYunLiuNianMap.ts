/**
 * baziDaYunLiuNianMap - 应用底层设施
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
 * - `SHI_ER_JIE`, `SHI_ER_SOLAR_MONTH`, `SHI_ER_SHI`, `SHI_ER_SHI_2`, `DI_ZHI_HAN_MING`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

/**
 * 十二节
 */
export const SHI_ER_JIE: readonly string[] = [
    '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
    '立秋', '白露', '寒露', '立冬', '大雪', '小寒'
] as const;

/**
 * 十二公历月
 */
export const SHI_ER_SOLAR_MONTH: readonly string[] = [
    '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '1'
] as const;

/**
 * 十二时（时间段描述）
 */
export const SHI_ER_SHI: readonly string[] = [
    '23~1时', '1~3时', '3~5时', '5~7时', '7~9时', '9~11时',
    '11~13时', '13~15时', '15~17时', '17~19时', '19~21时', '21~23时'
] as const;

/**
 * 十二时（起始小时）
 */
export const SHI_ER_SHI_2: readonly number[] = [
    23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21
] as const;

/**
 * 十二地支汉代命名
 */
export const DI_ZHI_HAN_MING: readonly string[] = [
    '夜半', '鸡鸣', '平旦', '日出', '食时', '隅中',
    '日中', '日昳', '晡时', '日入', '黄昏', '人定'
] as const;
