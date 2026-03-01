import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { type AuthMode } from './AuthModal';

interface RegisterFormProps {
    onSwitchMode: (mode: AuthMode) => void;
}

export default function RegisterForm({ onSwitchMode }: RegisterFormProps) {
    const { signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!email || !password || !confirmPassword) {
            setError('请填写所有必填字段');
            return;
        }
        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }
        if (password.length < 6) {
            setError('密码长度至少6位');
            return;
        }

        setLoading(true);
        try {
            const { error: signUpError } = await signUp(email, password);
            if (signUpError) {
                setError(signUpError);
            } else {
                setSuccess('注册成功！请查收验证邮件后登录。');
                setTimeout(() => onSwitchMode('login'), 2000);
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
                        autoComplete="new-password"
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

            <div className="modal-field">
                <label className="modal-label">确认密码</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="再次输入密码"
                        className="modal-input with-left-icon focus-ring"
                        autoComplete="new-password"
                        disabled={loading}
                    />
                </div>
            </div>

            {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            {success && (
                <div className="text-sm text-accent bg-accent/10 rounded-lg px-3 py-2">
                    {success}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="modal-btn primary w-full flex items-center justify-center gap-2 focus-ring"
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                注册
            </button>

            <div className="text-center mt-4">
                <span className="text-sm text-muted-foreground">已有账号？</span>
                <button
                    type="button"
                    onClick={() => onSwitchMode('login')}
                    className="text-sm text-primary hover:underline ml-1 focus:outline-none focus:underline"
                >
                    去登录
                </button>
            </div>
        </form>
    );
}
