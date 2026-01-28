/**
 * 学习面板服务
 * 封装收藏、进度、最近阅读等 Supabase 操作
 */
import { supabase } from '../lib/supabaseClient';

// 类型定义
export interface CaseFavorite {
    id: string;
    user_id: string;
    article_id: string;
    created_at: string;
}

export interface CaseProgress {
    id: string;
    user_id: string;
    article_id: string;
    progress_percent: number;
    last_read_at: string;
}

// 分页结果类型
export interface PaginatedResult<T> {
    data: T[];
    count: number;
    hasMore: boolean;
}

const ITEMS_PER_PAGE = 10;
const RECENT_READS_LIMIT = 5;
const FAVORITES_LIMIT = 50;

export const learningPanelService = {
    // ==================== 收藏相关 ====================

    /**
     * 获取用户收藏列表（分页）
     */
    async getFavorites(
        userId: string,
        page: number = 1,
        limit: number = ITEMS_PER_PAGE
    ): Promise<PaginatedResult<CaseFavorite>> {
        if (!supabase) {
            return { data: [], count: 0, hasMore: false };
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('case_favorites')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('获取收藏列表失败:', error);
            return { data: [], count: 0, hasMore: false };
        }

        return {
            data: data || [],
            count: count || 0,
            hasMore: (count || 0) > to + 1,
        };
    },

    /**
     * 添加收藏
     * 注意：数据库触发器会自动处理超过 50 条的情况
     */
    async addFavorite(userId: string, articleId: string): Promise<boolean> {
        if (!supabase) return false;

        const { error } = await supabase
            .from('case_favorites')
            .insert({ user_id: userId, article_id: articleId });

        if (error) {
            // 如果是重复收藏，忽略错误
            if (error.code === '23505') {
                return true;
            }
            console.error('添加收藏失败:', error);
            return false;
        }

        return true;
    },

    /**
     * 移除收藏
     */
    async removeFavorite(userId: string, articleId: string): Promise<boolean> {
        if (!supabase) return false;

        const { error } = await supabase
            .from('case_favorites')
            .delete()
            .eq('user_id', userId)
            .eq('article_id', articleId);

        if (error) {
            console.error('移除收藏失败:', error);
            return false;
        }

        return true;
    },

    /**
     * 检查是否已收藏
     */
    async isFavorited(userId: string, articleId: string): Promise<boolean> {
        if (!supabase) return false;

        const { data, error } = await supabase
            .from('case_favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('article_id', articleId)
            .maybeSingle();

        if (error) {
            console.error('检查收藏状态失败:', error);
            return false;
        }

        return !!data;
    },

    /**
     * 获取用户收藏数量
     */
    async getFavoritesCount(userId: string): Promise<number> {
        if (!supabase) return 0;

        const { count, error } = await supabase
            .from('case_favorites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) {
            console.error('获取收藏数量失败:', error);
            return 0;
        }

        return count || 0;
    },

    // ==================== 进度相关 ====================

    /**
     * 获取单篇文章进度
     */
    async getProgress(userId: string, articleId: string): Promise<CaseProgress | null> {
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('case_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('article_id', articleId)
            .maybeSingle();

        if (error) {
            console.error('获取进度失败:', error);
            return null;
        }

        return data;
    },

    /**
     * 更新进度（upsert）
     */
    async upsertProgress(
        userId: string,
        articleId: string,
        progressPercent: number
    ): Promise<boolean> {
        if (!supabase) return false;

        // 确保进度在 0-100 之间
        const clampedProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));

        const { error } = await supabase
            .from('case_progress')
            .upsert(
                {
                    user_id: userId,
                    article_id: articleId,
                    progress_percent: clampedProgress,
                    last_read_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,article_id' }
            );

        if (error) {
            console.error('更新进度失败:', error);
            return false;
        }

        return true;
    },

    // ==================== 最近阅读 ====================

    /**
     * 获取最近阅读列表（固定 5 条）
     */
    async getRecentReads(userId: string): Promise<CaseProgress[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('case_progress')
            .select('*')
            .eq('user_id', userId)
            .order('last_read_at', { ascending: false })
            .limit(RECENT_READS_LIMIT);

        if (error) {
            console.error('获取最近阅读失败:', error);
            return [];
        }

        return data || [];
    },

    // ==================== 阅读进度列表 ====================

    /**
     * 获取在读列表（0 < progress_percent < 90）
     */
    async getReadingList(
        userId: string,
        page: number = 1,
        limit: number = ITEMS_PER_PAGE
    ): Promise<PaginatedResult<CaseProgress>> {
        if (!supabase) {
            return { data: [], count: 0, hasMore: false };
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('case_progress')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .gt('progress_percent', 0)
            .lt('progress_percent', 90)
            .order('last_read_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('获取在读列表失败:', error);
            return { data: [], count: 0, hasMore: false };
        }

        return {
            data: data || [],
            count: count || 0,
            hasMore: (count || 0) > to + 1,
        };
    },

    /**
     * 获取已读列表（progress_percent >= 90）
     */
    async getFinishedList(
        userId: string,
        page: number = 1,
        limit: number = ITEMS_PER_PAGE
    ): Promise<PaginatedResult<CaseProgress>> {
        if (!supabase) {
            return { data: [], count: 0, hasMore: false };
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('case_progress')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .gte('progress_percent', 90)
            .order('last_read_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('获取已读列表失败:', error);
            return { data: [], count: 0, hasMore: false };
        }

        return {
            data: data || [],
            count: count || 0,
            hasMore: (count || 0) > to + 1,
        };
    },

    /**
     * 清空所有阅读进度
     */
    async clearAllProgress(userId: string): Promise<boolean> {
        if (!supabase) return false;

        const { error } = await supabase
            .from('case_progress')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('清空进度失败:', error);
            return false;
        }

        return true;
    },
};

// 导出常量供外部使用
export { ITEMS_PER_PAGE, RECENT_READS_LIMIT, FAVORITES_LIMIT };
