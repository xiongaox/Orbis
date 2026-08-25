import {
  changeLocalPassword,
  clearLocalSession,
  createLocalAccount,
  createLocalOtp,
  getLocalSession,
  signInLocalAccount,
  subscribeLocalAuth,
  verifyLocalOtp,
} from './localAuthStore';
import type { LocalUser } from './localAuthStore';

export type User = LocalUser;

export interface AuthError {
  message: string;
  code?: string;
}

function toError(error: unknown): AuthError {
  return { message: error instanceof Error ? error.message : '本地认证失败' };
}

export const authService = {
  async signUp(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
    if (!email.trim() || password.length < 6) return { user: null, error: { message: '请输入邮箱，且密码至少 6 位' } };
    try { return { user: await createLocalAccount(email, password), error: null }; } catch (error) { return { user: null, error: toError(error) }; }
  },
  async signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
    try { return { user: await signInLocalAccount(email, password), error: null }; } catch (error) { return { user: null, error: toError(error) }; }
  },
  async signOut(): Promise<{ error: AuthError | null }> {
    clearLocalSession();
    window.dispatchEvent(new Event('orbis-auth-change'));
    return { error: null };
  },
  async getCurrentUser(): Promise<User | null> { return getLocalSession(); },
  async getSession(): Promise<{ user: User } | null> {
    const user = getLocalSession();
    return user ? { user } : null;
  },
  onAuthStateChange(callback: (user: User | null) => void) { return { data: { subscription: subscribeLocalAuth(callback) } }; },
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const token = createLocalOtp(email);
    console.info(`本地验证码（仅作为凭证）：${token}`);
    return { error: null };
  },
  async sendOtp(email: string): Promise<{ error: AuthError | null }> {
    const token = createLocalOtp(email);
    console.info(`本地验证码（仅作为凭证）：${token}`);
    return { error: null };
  },
  async verifyOtp(email: string, token: string): Promise<{ user: User | null; error: AuthError | null }> {
    try { return { user: await verifyLocalOtp(email, token), error: null }; } catch (error) { return { user: null, error: toError(error) }; }
  },
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ error: AuthError | null }> {
    try { await changeLocalPassword(userId, currentPassword, newPassword); return { error: null }; } catch (error) { return { error: toError(error) }; }
  },
};
