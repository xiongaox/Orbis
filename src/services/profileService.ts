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
