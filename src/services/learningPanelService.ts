import { localPrivateStore } from './localPrivateStore';

export interface CaseFavorite { id: string; article_id: string; created_at: string; }
export interface CaseProgress { id: string; article_id: string; progress_percent: number; last_read_at: string; }
export interface PaginatedResult<T> { data: T[]; count: number; hasMore: boolean; }
const ITEMS_PER_PAGE = 10;
const RECENT_READS_LIMIT = 5;
const FAVORITES_LIMIT = 50;

const paginate = <T>(items: T[], page: number, limit: number): PaginatedResult<T> => {
  const start = (page - 1) * limit;
  return { data: items.slice(start, start + limit), count: items.length, hasMore: items.length > start + limit };
};

export const learningPanelService = {
  async getFavorites( page = 1, limit = ITEMS_PER_PAGE) {
    const records = await localPrivateStore.list('case_favorite');
    const items = records.map((record) => record.payload as unknown as CaseFavorite).sort((a, b) => b.created_at.localeCompare(a.created_at));
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
  async removeFavorite(articleId: string) { await localPrivateStore.remove('case_favorite', articleId); return true; },
  async isFavorited(articleId: string) { return Boolean(await localPrivateStore.get('case_favorite', articleId)); },
  async getFavoritesCount() { return (await localPrivateStore.list('case_favorite')).length; },
  async getProgress(articleId: string) {
    const record = await localPrivateStore.get('case_progress', articleId);
    return (record?.payload as unknown as CaseProgress | undefined) ?? null;
  },
  async upsertProgress(articleId: string, progressPercent: number) {
    const progress = Math.max(0, Math.min(100, Math.round(progressPercent)));
    const payload = { id: articleId, article_id: articleId, progress_percent: progress, last_read_at: new Date().toISOString() };
    await localPrivateStore.put('case_progress', payload, payload.id);
    return true;
  },
  async getRecentReads() {
    const records = await localPrivateStore.list('case_progress');
    return records.map((record) => record.payload as unknown as CaseProgress).sort((a, b) => b.last_read_at.localeCompare(a.last_read_at)).slice(0, RECENT_READS_LIMIT);
  },
  async getReadingList(page = 1, limit = ITEMS_PER_PAGE) {
    const records = await localPrivateStore.list('case_progress');
    return paginate(records.map((record) => record.payload as unknown as CaseProgress).filter((item) => item.progress_percent > 0 && item.progress_percent < 90).sort((a, b) => b.last_read_at.localeCompare(a.last_read_at)), page, limit);
  },
  async getFinishedList(page = 1, limit = ITEMS_PER_PAGE) {
    const records = await localPrivateStore.list('case_progress');
    return paginate(records.map((record) => record.payload as unknown as CaseProgress).filter((item) => item.progress_percent >= 90).sort((a, b) => b.last_read_at.localeCompare(a.last_read_at)), page, limit);
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
