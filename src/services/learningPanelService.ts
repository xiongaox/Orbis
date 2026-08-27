import { localPrivateStore } from './localPrivateStore';

export interface CaseFavorite { id: string; user_id: string; article_id: string; created_at: string; }
export interface CaseProgress { id: string; user_id: string; article_id: string; progress_percent: number; last_read_at: string; }
export interface PaginatedResult<T> { data: T[]; count: number; hasMore: boolean; }
const ITEMS_PER_PAGE = 10;
const RECENT_READS_LIMIT = 5;
const FAVORITES_LIMIT = 50;

const paginate = <T>(items: T[], page: number, limit: number): PaginatedResult<T> => {
  const start = (page - 1) * limit;
  return { data: items.slice(start, start + limit), count: items.length, hasMore: items.length > start + limit };
};

export const learningPanelService = {
  async getFavorites(userId: string, page = 1, limit = ITEMS_PER_PAGE) {
    const records = await localPrivateStore.list(userId, 'case_favorite');
    const items = records.map((record) => record.payload as unknown as CaseFavorite).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return paginate(items, page, limit);
  },
  async addFavorite(userId: string, articleId: string) {
    const id = `${userId}:${articleId}`;
    const existing = await localPrivateStore.get(userId, 'case_favorite', id);
    if (!existing) {
      const now = new Date().toISOString();
      const records = await localPrivateStore.list(userId, 'case_favorite');
      if (records.length >= FAVORITES_LIMIT) await localPrivateStore.remove(userId, 'case_favorite', records.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0].id);
      await localPrivateStore.put(userId, 'case_favorite', { id, user_id: userId, article_id: articleId, created_at: now }, id);
    }
    return true;
  },
  async removeFavorite(userId: string, articleId: string) { await localPrivateStore.remove(userId, 'case_favorite', `${userId}:${articleId}`); return true; },
  async isFavorited(userId: string, articleId: string) { return Boolean(await localPrivateStore.get(userId, 'case_favorite', `${userId}:${articleId}`)); },
  async getFavoritesCount(userId: string) { return (await localPrivateStore.list(userId, 'case_favorite')).length; },
  async getProgress(userId: string, articleId: string) {
    const record = await localPrivateStore.get(userId, 'case_progress', `${userId}:${articleId}`);
    return (record?.payload as unknown as CaseProgress | undefined) ?? null;
  },
  async upsertProgress(userId: string, articleId: string, progressPercent: number) {
    const progress = Math.max(0, Math.min(100, Math.round(progressPercent)));
    const payload = { id: `${userId}:${articleId}`, user_id: userId, article_id: articleId, progress_percent: progress, last_read_at: new Date().toISOString() };
    await localPrivateStore.put(userId, 'case_progress', payload, payload.id);
    return true;
  },
  async getRecentReads(userId: string) {
    const records = await localPrivateStore.list(userId, 'case_progress');
    return records.map((record) => record.payload as unknown as CaseProgress).sort((a, b) => b.last_read_at.localeCompare(a.last_read_at)).slice(0, RECENT_READS_LIMIT);
  },
  async getReadingList(userId: string, page = 1, limit = ITEMS_PER_PAGE) {
    const records = await localPrivateStore.list(userId, 'case_progress');
    return paginate(records.map((record) => record.payload as unknown as CaseProgress).filter((item) => item.progress_percent > 0 && item.progress_percent < 90).sort((a, b) => b.last_read_at.localeCompare(a.last_read_at)), page, limit);
  },
  async getFinishedList(userId: string, page = 1, limit = ITEMS_PER_PAGE) {
    const records = await localPrivateStore.list(userId, 'case_progress');
    return paginate(records.map((record) => record.payload as unknown as CaseProgress).filter((item) => item.progress_percent >= 90).sort((a, b) => b.last_read_at.localeCompare(a.last_read_at)), page, limit);
  },
  async clearAllProgress(userId: string) {
    await localPrivateStore.clear(userId, 'case_progress');
    // 以读取结果确认删除已落盘；若底层实现存在残留，逐条补删一次。
    const remaining = await localPrivateStore.list(userId, 'case_progress');
    for (const record of remaining) {
      await localPrivateStore.remove(userId, 'case_progress', record.id);
    }
    if ((await localPrivateStore.list(userId, 'case_progress')).length > 0) {
      throw new Error('最近阅读记录未能完全清空');
    }
    return true;
  },
};

export { ITEMS_PER_PAGE, RECENT_READS_LIMIT, FAVORITES_LIMIT };
