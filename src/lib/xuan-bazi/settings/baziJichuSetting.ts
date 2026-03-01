/**
 * baziJichuSetting - 应用底层设施
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
 * - `BaziJichuSetting`, `createDefaultBaziJichuSetting`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

export interface BaziJichuSetting {
    /** 姓名 */
    name?: string;

    /** 占事 */
    occupy?: string;

    /** 性别（0:女。1:男） */
    sex?: 0 | 1;

    /** 日期（格式：yyyy-MM-dd HH:mm:ss） */
    date: string;

    /** 日期类型（0:公历。1:农历） */
    dateType?: 0 | 1;

    /** 闰月类型，日期类型为1时生效（0:不使用闰月。1:使用闰月） */
    leapMonthType?: 0 | 1;

    /** 虚实岁类型（0:虚岁。1:实岁） */
    xuShiSuiType?: 0 | 1;

    /** 节气类型（0:按天计算。1:按分钟计算） */
    jieQiType?: 0 | 1;

    /** 起运流派类型（0:按天数和时辰数计算。1:按分钟数计算） */
    qiYunLiuPaiType?: 0 | 1;

    /** 人元司令分野类型（0-5，对应不同法诀） */
    renYuanType?: 0 | 1 | 2 | 3 | 4 | 5;

    /** 大运轮数（最小10轮，最大16轮） */
    daYunLunShu?: number;

    /** 年干支类型（0:正月初一。1:立春当天。2:立春交接时刻） */
    yearGanZhiType?: 0 | 1 | 2;

    /** 月干支类型（0:以节交接当天起算。1:以节交接时刻起算） */
    monthGanZhiType?: 0 | 1;

    /** 日干支类型（0:晚子时日干支按当天。1:晚子时日干支按明天） */
    dayGanZhiType?: 0 | 1;
}

/** 创建默认的基础设置 */
export function createDefaultBaziJichuSetting(date: string): BaziJichuSetting {
    return {
        name: '',
        occupy: '',
        sex: 1,
        date,
        dateType: 0,
        leapMonthType: 0,
        xuShiSuiType: 0,
        jieQiType: 1,
        qiYunLiuPaiType: 1,
        renYuanType: 0,
        daYunLunShu: 10,
        yearGanZhiType: 2,
        monthGanZhiType: 1,
        dayGanZhiType: 0,
    };
}
