/**
 * authService - 应用源码层
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
 * - `AuthError`, `authService`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `supabase`、外部依赖 `@supabase/supabase-js`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthError {
    message: string;
    code?: string;
}

export const authService = {
    /**
     * 邮箱密码注册
     */
    async signUp(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            return { user: null, error: { message: error.message, code: error.code } };
        }

        return { user: data.user, error: null };
    },

    /**
     * 邮箱密码登录
     */
    async signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { user: null, error: { message: error.message, code: error.code } };
        }

        return { user: data.user, error: null };
    },

    /**
     * 登出
     */
    async signOut(): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return { error: { message: error.message, code: error.code } };
        }

        return { error: null };
    },

    /**
     * 获取当前登录用户
     */
    async getCurrentUser(): Promise<User | null> {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    /**
     * 获取当前会话
     */
    async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    /**
     * 监听认证状态变化
     */
    onAuthStateChange(callback: (user: User | null) => void) {
        return supabase.auth.onAuthStateChange((_event, session) => {
            callback(session?.user ?? null);
        });
    },

    /**
     * 重置密码（发送重置邮件）
     */
    async resetPassword(email: string): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            return { error: { message: error.message, code: error.code } };
        }

        return { error: null };
    },

    /**
     * 发送邮箱 OTP 验证码
     */
    async sendOtp(email: string): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true, // 如果用户不存在则创建
            },
        });

        if (error) {
            return { error: { message: error.message, code: error.code } };
        }

        return { error: null };
    },

    /**
     * 验证 OTP 并登录
     */
    async verifyOtp(email: string, token: string): Promise<{ user: User | null; error: AuthError | null }> {
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
        });

        if (error) {
            return { user: null, error: { message: error.message, code: error.code } };
        }

        return { user: data.user, error: null };
    },
};
