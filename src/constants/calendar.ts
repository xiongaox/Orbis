/**
 * calendar - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：定义全局静态常量和配置
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `JIEQI_LABELS`, `WEEK_DAYS_SUN_FIRST`, `WEEK_DAYS_MON_FIRST`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

export const JIEQI_LABELS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'] as const;

export const WEEK_DAYS_SUN_FIRST = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;

export const WEEK_DAYS_MON_FIRST = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;
