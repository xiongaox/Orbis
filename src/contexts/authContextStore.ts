import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: string | null }>;
    sendOtp: (email: string) => Promise<{ error: string | null }>;
    verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
    isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
