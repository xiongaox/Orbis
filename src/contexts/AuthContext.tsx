/**
 * 认证上下文
 * 全局提供用户认证状态
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { authService } from '../services/authService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

    const value: AuthContextType = {
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
