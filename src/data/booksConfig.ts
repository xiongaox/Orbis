/**
 * booksConfig - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载前端具体功能
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `DEFAULT_BOOK_ID`, `INSIGHT_BOOKS`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `InsightPanel`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import type { InsightBook } from '../components/Modules/Bazi/InsightPanel';

/**
 * 默认选中的书籍 ID
 */
export const DEFAULT_BOOK_ID = 'qiongtong';

/**
 * 可用书籍列表
 */
export const INSIGHT_BOOKS: InsightBook[] = [
    { id: 'qiongtong', name: '穷通宝鉴', category: 'classic' },
    { id: 'ditiansui', name: '滴天髓', category: 'classic' },
    { id: 'sanming', name: '三命通会', category: 'classic' },
];
