import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { type AuthMode } from './AuthModal';

interface ForgotPasswordFormProps {
    onSwitchMode: (mode: AuthMode) => void;
}

export default function ForgotPasswordForm({ onSwitchMode }: ForgotPasswordFormProps) {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!email) {
            setError('请填写邮箱');
            return;
        }

        setLoading(true);
        try {
            const { error: resetError } = await resetPassword(email);
            if (resetError) {
                setError(resetError);
            } else {
                setSuccess('重置密码邮件已发送，请查收邮箱。');
            }
        } catch {
            setError('发送失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
                输入您的注册邮箱，我们将发送密码重置链接。
            </p>

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
                发送重置邮件
            </button>

            <div className="text-center mt-4">
                <button
                    type="button"
                    onClick={() => onSwitchMode('login')}
                    className="text-sm text-muted-foreground hover:text-primary focus:outline-none focus:underline"
                >
                    返回登录
                </button>
            </div>
        </form>
    );
}
