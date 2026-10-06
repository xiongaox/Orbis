import { localPrivateStore } from './localPrivateStore';

export interface CaseFavorite { id: string; article_id: string; created_at: string; }
export interface CaseProgress { id: string; article_id: string; progress_percent: number; last_read_at: string; }
export interface PaginatedResult<T> { data: T[]; count: number; hasMore: boolean; }
const ITEMS_PER_PAGE = 10;
const RECENT_READS_LIMIT = 5;
const FAVORITES_LIMIT = 50;

// 云端时代遗留的 article_id 带旧工作区相对前缀（../../../../data/cases/），规整为当前语料 id
function normalizeArticleId(articleId: string): string {
  return articleId.replace(/^(?:\.\.\/)+data\/cases\//, '');
}

// 云端时代遗留记录可能缺时间戳（旧写入端字段不一致），回退到记录的 updatedAt 保证可排序；
// 同一文章可能存在新旧两套 id（旧 user_id: 前缀 + 新干净 id）的历史重复行，规整 id 后按文章去重取较新一条。
function withNormalizedRecords<T extends { article_id: string }>(records: { payload: unknown; updatedAt: string }[], timeField: 'created_at' | 'last_read_at'): T[] {
  return records.map((record) => {
    const item = { ...(record.payload as unknown as T) };
    const fields = item as unknown as Record<string, unknown>;
    fields.article_id = normalizeArticleId(String(fields.article_id ?? ''));
    if (!fields[timeField]) fields[timeField] = record.updatedAt;
    return item;
  });
}

function dedupeByArticle<T extends { article_id: string }>(items: T[], timeField: 'created_at' | 'last_read_at'): T[] {
  const byArticle = new Map<string, T>();
  for (const item of items) {
    const existing = byArticle.get(item.article_id);
    const current = String((item as unknown as Record<string, unknown>)[timeField] || '');
    const previous = String((existing as unknown as Record<string, unknown> | undefined)?.[timeField] || '');
    if (!existing || current > previous) byArticle.set(item.article_id, item);
  }
  return [...byArticle.values()];
}

const byTimeDesc = <T>(timeField: 'created_at' | 'last_read_at') =>
  (a: T, b: T) => {
    const av = String((a as unknown as Record<string, unknown>)[timeField] || '');
    const bv = String((b as unknown as Record<string, unknown>)[timeField] || '');
    return bv.localeCompare(av);
  };

const paginate = <T>(items: T[], page: number, limit: number): PaginatedResult<T> => {
  const start = (page - 1) * limit;
  return { data: items.slice(start, start + limit), count: items.length, hasMore: items.length > start + limit };
};

export const learningPanelService = {
  async getFavorites( page = 1, limit = ITEMS_PER_PAGE) {
    const records = await localPrivateStore.list('case_favorite');
    const items = dedupeByArticle(withNormalizedRecords<CaseFavorite>(records, 'created_at'), 'created_at').sort(byTimeDesc('created_at'));
    return paginate(items, page, limit);
  },
  async addFavorite(articleId: string) {
    const id = articleId;
    const existing = await localPrivateStore.get('case_favorite', id);
    if (!existing) {
      const now = new Date().toISOString();
      const records = await localPrivateStore.list('case_favorite');
      if (records.length >= FAVORITES_LIMIT) await localPrivateStore.remove('case_favorite', records.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0].id);
      await localPrivateStore.put('case_favorite', { id, article_id: articleId, created_at: now }, id);
    }
    return true;
  },
  async removeFavorite(articleId: string) {
    await localPrivateStore.remove('case_favorite', articleId);
    // 兼容旧 id 形态：一并清理规整后同文章的历史收藏行
    const records = await localPrivateStore.list('case_favorite');
    for (const record of records) {
      const favorite = record.payload as unknown as CaseFavorite;
      if (normalizeArticleId(String(favorite.article_id ?? '')) === articleId) {
        await localPrivateStore.remove('case_favorite', record.id);
      }
    }
    return true;
  },
  async isFavorited(articleId: string) {
    const records = await localPrivateStore.list('case_favorite');
    return records.some((record) => {
      const favorite = record.payload as unknown as CaseFavorite;
      return record.id === articleId || normalizeArticleId(String(favorite.article_id ?? '')) === articleId;
    });
  },
  async getFavoritesCount() { return (await localPrivateStore.list('case_favorite')).length; },
  async getProgress(articleId: string) {
    const records = await localPrivateStore.list('case_progress');
    const hit = records.find((record) => {
      const progress = record.payload as unknown as CaseProgress;
      return record.id === articleId || normalizeArticleId(String(progress.article_id ?? '')) === articleId;
    });
    return (hit?.payload as unknown as CaseProgress | undefined) ?? null;
  },
  async upsertProgress(articleId: string, progressPercent: number) {
    const progress = Math.max(0, Math.min(100, Math.round(progressPercent)));
    const payload = { id: articleId, article_id: articleId, progress_percent: progress, last_read_at: new Date().toISOString() };
    await localPrivateStore.put('case_progress', payload, payload.id);
    return true;
  },
  async getRecentReads() {
    const records = await localPrivateStore.list('case_progress');
    const items = dedupeByArticle(withNormalizedRecords<CaseProgress>(records, 'last_read_at'), 'last_read_at')
      .sort(byTimeDesc('last_read_at'))
      .slice(0, RECENT_READS_LIMIT);
    return items;
  },
  async getReadingList(page = 1, limit = ITEMS_PER_PAGE) {
    const records = await localPrivateStore.list('case_progress');
    const items = dedupeByArticle(withNormalizedRecords<CaseProgress>(records, 'last_read_at'), 'last_read_at')
      .filter((item) => item.progress_percent > 0 && item.progress_percent < 90)
      .sort(byTimeDesc('last_read_at'));
    return paginate(items, page, limit);
  },
  async getFinishedList(page = 1, limit = ITEMS_PER_PAGE) {
    const records = await localPrivateStore.list('case_progress');
    const items = dedupeByArticle(withNormalizedRecords<CaseProgress>(records, 'last_read_at'), 'last_read_at')
      .filter((item) => item.progress_percent >= 90)
      .sort(byTimeDesc('last_read_at'));
    return paginate(items, page, limit);
  },
  async clearAllProgress() {
    await localPrivateStore.clear('case_progress');
    // 以读取结果确认删除已落盘；若底层实现存在残留，逐条补删一次。
    const remaining = await localPrivateStore.list('case_progress');
    for (const record of remaining) {
      await localPrivateStore.remove('case_progress', record.id);
    }
    if ((await localPrivateStore.list('case_progress')).length > 0) {
      throw new Error('最近阅读记录未能完全清空');
    }
    return true;
  },
};

export { ITEMS_PER_PAGE, RECENT_READS_LIMIT, FAVORITES_LIMIT };
