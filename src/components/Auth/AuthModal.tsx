/**
 * 登录/注册 Modal
 * 支持切换登录和注册模式
 */
import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthMode = 'login' | 'register';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { signIn, signUp } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // 验证
        if (!email || !password) {
            setError('请填写邮箱和密码');
            return;
        }

        if (mode === 'register' && password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        if (password.length < 6) {
            setError('密码长度至少6位');
            return;
        }

        setLoading(true);

        try {
            if (mode === 'login') {
                const { error } = await signIn(email, password);
                if (error) {
                    setError(error);
                } else {
                    onClose();
                    resetForm();
                }
            } else {
                const { error } = await signUp(email, password);
                if (error) {
                    setError(error);
                } else {
                    setSuccess('注册成功！请查收验证邮件后登录。');
                    setMode('login');
                    setPassword('');
                    setConfirmPassword('');
                }
            }
        } catch (err) {
            setError('操作失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError(null);
        setSuccess(null);
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError(null);
        setSuccess(null);
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card" style={{ maxWidth: '380px' }}>
                <h2 className="modal-title text-center">
                    {mode === 'login' ? '登录' : '注册'}
                </h2>

                <form onSubmit={handleSubmit}>
                    {/* 邮箱 */}
                    <div className="modal-field">
                        <label className="modal-label">邮箱</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="modal-input pl-10"
                                autoComplete="email"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* 密码 */}
                    <div className="modal-field">
                        <label className="modal-label">密码</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="至少6位字符"
                                className="modal-input pl-10 pr-10"
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* 确认密码 (仅注册模式) */}
                    {mode === 'register' && (
                        <div className="modal-field">
                            <label className="modal-label">确认密码</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="再次输入密码"
                                    className="modal-input pl-10"
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    )}

                    {/* 错误提示 */}
                    {error && (
                        <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                            {error}
                        </div>
                    )}

                    {/* 成功提示 */}
                    {success && (
                        <div className="text-sm text-accent bg-accent/10 rounded-lg px-3 py-2 mb-4">
                            {success}
                        </div>
                    )}

                    {/* 提交按钮 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="modal-btn primary w-full flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {mode === 'login' ? '登录' : '注册'}
                    </button>
                </form>

                {/* 切换模式 */}
                <div className="text-center mt-4">
                    <span className="text-sm text-muted-foreground">
                        {mode === 'login' ? '还没有账号？' : '已有账号？'}
                    </span>
                    <button
                        type="button"
                        onClick={switchMode}
                        className="text-sm text-primary hover:underline ml-1"
                    >
                        {mode === 'login' ? '立即注册' : '去登录'}
                    </button>
                </div>

                {/* 关闭按钮 */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
