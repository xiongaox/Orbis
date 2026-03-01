/**
 * profileService - 应用源码层
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
 * - `UserProfile`, `profileService`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `supabase`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { supabase } from '../lib/supabase';

export interface UserProfile {
    id: string;
    email?: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
    website?: string;
    birth_date?: string; // ISO String
    updated_at?: string;
}

export const profileService = {
    /**
     * 获取用户档案
     */
    async getProfile(userId: string) {
        try {
            if (!supabase) throw new Error('Supabase not configured');

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data as UserProfile;
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    },

    /**
     * 更新用户档案
     */
    async updateProfile(userId: string, updates: Partial<UserProfile>) {
        try {
            if (!supabase) throw new Error('Supabase not configured');

            const { data, error } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    updated_at: new Date().toISOString(),
                    ...updates,
                })
                .select()
                .single();

            if (error) throw error;
            return data as UserProfile;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }
};
