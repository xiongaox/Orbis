/**
 * 认证上下文
 * 全局提供用户认证状态
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
