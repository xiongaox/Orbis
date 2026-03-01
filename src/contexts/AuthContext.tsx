/**
 * AuthContext - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载前端具体功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `AuthProvider`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `authService`、外部依赖 `@supabase/supabase-js` 等 4 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { authService } from '../services/authService';
import type { User } from '@supabase/supabase-js';
import { AuthContext } from './authContextStore';
import type { AuthContextType } from './authContextStore';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 初始化时获取当前用户
        const initAuth = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                console.error('Failed to get current user:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // 监听认证状态变化
        const { data: { subscription } } = authService.onAuthStateChange((user) => {
            setUser(user);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        const { user, error } = await authService.signIn(email, password);
        if (error) {
            return { error: error.message };
        }
        setUser(user);
        return { error: null };
    }, []);

    const signUp = useCallback(async (email: string, password: string) => {
        const { user, error } = await authService.signUp(email, password);
        if (error) {
            return { error: error.message };
        }
        setUser(user);
        return { error: null };
    }, []);

    const signOut = useCallback(async () => {
        await authService.signOut();
        setUser(null);
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        const { error } = await authService.resetPassword(email);
        if (error) {
            return { error: error.message };
        }
        return { error: null };
    }, []);

    const sendOtp = useCallback(async (email: string) => {
        const { error } = await authService.sendOtp(email);
        if (error) {
            return { error: error.message };
        }
        return { error: null };
    }, []);

    const verifyOtp = useCallback(async (email: string, token: string) => {
        const { user, error } = await authService.verifyOtp(email, token);
        if (error) {
            return { error: error.message };
        }
        setUser(user);
        return { error: null };
    }, []);

    const value: AuthContextType = {
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        sendOtp,
        verifyOtp,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
