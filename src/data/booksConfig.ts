/**
 * 书籍配置
 * 定义智能咨询参考面板可选的经典书籍列表
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
