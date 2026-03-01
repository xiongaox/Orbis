import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { type AuthMode } from './AuthModal';

interface LoginFormProps {
    onSwitchMode: (mode: AuthMode) => void;
    onClose: () => void;
}

export default function LoginForm({ onSwitchMode, onClose }: LoginFormProps) {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError('请填写邮箱和密码');
            return;
        }
        if (password.length < 6) {
            setError('密码长度至少6位');
            return;
        }

        setLoading(true);
        try {
            const { error: signInError } = await signIn(email, password);
            if (signInError) {
                setError(signInError);
            } else {
                onClose();
            }
        } catch {
            setError('操作失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="modal-field">
                <label className="modal-label">邮箱</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="modal-input with-left-icon focus-ring"
                        autoComplete="email"
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="modal-field">
                <label className="modal-label">密码</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="至少6位字符"
                        className="modal-input with-left-icon with-right-icon focus-ring"
                        autoComplete="current-password"
                        disabled={loading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:text-primary"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="flex justify-end !mt-1">
                <button
                    type="button"
                    onClick={() => onSwitchMode('forgot')}
                    className="text-xs text-muted-foreground hover:text-primary focus:outline-none focus:underline"
                >
                    忘记密码？
                </button>
            </div>

            {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="modal-btn primary w-full flex items-center justify-center gap-2 focus-ring"
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                登录
            </button>

            <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">或</span>
                <div className="flex-1 h-px bg-border" />
            </div>

            <button
                type="button"
                onClick={() => onSwitchMode('otp')}
                className="w-full py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted flex items-center justify-center gap-2 transition-colors focus-ring"
            >
                <KeyRound className="w-4 h-4" />
                验证码登录
            </button>

            <div className="text-center mt-4">
                <span className="text-sm text-muted-foreground">还没有账号？</span>
                <button
                    type="button"
                    onClick={() => onSwitchMode('register')}
                    className="text-sm text-primary hover:underline ml-1 focus:outline-none focus:underline"
                >
                    立即注册
                </button>
            </div>
        </form>
    );
}
