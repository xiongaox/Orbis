/**
 * 八字案例服务 (Supabase 版本)
 * 提供案例的 CRUD 操作
 */
import { supabase } from '../lib/supabase';

// 预定义标签
export const CASE_TAGS = [
    '家人', '恋人', '自己', '朋友',
    '父母', '孩子', '亲友', '同事', '领导',
    '老师', '学生', '案例', '名人', '其他'
] as const;

export type CaseTag = typeof CASE_TAGS[number];

export interface BaziCase {
    id: string;
    user_id: string;
    name: string;
    gender: 'male' | 'female';
    birth_date: string;
    tags: CaseTag[];
    notes?: string;
    bazi_data?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export type CreateCaseInput = Omit<BaziCase, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateCaseInput = Partial<CreateCaseInput>;

export const baziCaseService = {
    /**
     * 获取当前用户的所有案例
     */
    async getCases(): Promise<BaziCase[]> {
        const { data, error } = await supabase
            .from('bazi_cases')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch cases:', error);
            throw new Error(error.message);
        }

        return data || [];
    },

    /**
     * 根据 ID 获取单个案例
     */
    async getCaseById(id: string): Promise<BaziCase | null> {
        const { data, error } = await supabase
            .from('bazi_cases')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // 未找到
            }
            console.error('Failed to fetch case:', error);
            throw new Error(error.message);
        }

        return data;
    },

    /**
     * 创建新案例
     */
    async createCase(input: CreateCaseInput): Promise<BaziCase> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('请先登录');
        }

        const { data, error } = await supabase
            .from('bazi_cases')
            .insert({
                ...input,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to create case:', error);
            throw new Error(error.message);
        }

        return data;
    },

    /**
     * 批量创建案例
     */
    async createCases(inputs: CreateCaseInput[]): Promise<BaziCase[]> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('请先登录');
        }

        if (inputs.length === 0) {
            return [];
        }

        const records = inputs.map(input => ({
            ...input,
            user_id: user.id,
        }));

        const { data, error } = await supabase
            .from('bazi_cases')
            .insert(records)
            .select();

        if (error) {
            console.error('Failed to create cases:', error);
            throw new Error(error.message);
        }

        return data || [];
    },

    /**
     * 更新案例
     */
    async updateCase(id: string, input: UpdateCaseInput): Promise<BaziCase> {
        const { data, error } = await supabase
            .from('bazi_cases')
            .update(input)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Failed to update case:', error);
            throw new Error(error.message);
        }

        return data;
    },

    /**
     * 删除案例
     */
    async deleteCase(id: string): Promise<void> {
        const { error } = await supabase
            .from('bazi_cases')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Failed to delete case:', error);
            throw new Error(error.message);
        }
    },

    /**
     * 按标签筛选案例
     */
    async getCasesByTags(tags: CaseTag[]): Promise<BaziCase[]> {
        const { data, error } = await supabase
            .from('bazi_cases')
            .select('*')
            .overlaps('tags', tags)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch cases by tags:', error);
            throw new Error(error.message);
        }

        return data || [];
    },

    /**
     * 搜索案例（按名称）
     */
    async searchCases(query: string): Promise<BaziCase[]> {
        const { data, error } = await supabase
            .from('bazi_cases')
            .select('*')
            .ilike('name', `%${query}%`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to search cases:', error);
            throw new Error(error.message);
        }

        return data || [];
    },
};
