/**
 * Supabase 客户端初始化
 * 支持未配置时的降级模式
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// ESA 部署适配：支持分段 key
const getSupabaseAnonKey = () => {
    // 1. 优先尝试获取完整 key
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return import.meta.env.VITE_SUPABASE_ANON_KEY;
    }

    // 2. 尝试获取分段 key 并拼接
    const part1 = import.meta.env.VITE_SUPABASE_ANON_KEY_PART1 || '';
    const part2 = import.meta.env.VITE_SUPABASE_ANON_KEY_PART2 || '';
    const part3 = import.meta.env.VITE_SUPABASE_ANON_KEY_PART3 || '';

    if (part1) {
        return part1 + part2 + part3;
    }

    return '';
};

const supabaseAnonKey = getSupabaseAnonKey();

// 检查是否配置了 Supabase
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
    console.warn('Supabase 环境变量未配置，将以离线模式运行');
}

// 创建 Supabase 客户端（仅在配置后可用）
let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}

// 导出一个代理对象，在未配置时抛出友好错误
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        if (!supabaseInstance) {
            // 对于 auth 属性，返回一个模拟对象
            if (prop === 'auth') {
                return {
                    getUser: async () => ({ data: { user: null }, error: null }),
                    getSession: async () => ({ data: { session: null }, error: null }),
                    signUp: async () => ({ data: { user: null }, error: { message: '请先配置 Supabase' } }),
                    signInWithPassword: async () => ({ data: { user: null }, error: { message: '请先配置 Supabase' } }),
                    signOut: async () => ({ error: null }),
                    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
                };
            }
            // 对于 from 方法，返回模拟的查询构建器
            if (prop === 'from') {
                return () => ({
                    select: () => ({ data: [], error: null, order: () => ({ data: [], error: null }) }),
                    insert: () => ({ select: () => ({ single: () => ({ data: null, error: { message: '请先配置 Supabase' } }) }) }),
                    update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: { message: '请先配置 Supabase' } }) }) }) }),
                    delete: () => ({ eq: () => ({ error: { message: '请先配置 Supabase' } }) }),
                });
            }
            return undefined;
        }
        return supabaseInstance[prop as keyof SupabaseClient];
    },
});
