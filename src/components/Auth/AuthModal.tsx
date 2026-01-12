/**
 * 登录/注册 Modal
 * 支持：密码登录、注册、忘记密码、验证码登录
 */
import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'otp';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { signIn, signUp, resetPassword, sendOtp, verifyOtp } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // 倒计时效果
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    if (!isOpen) return null;

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
        setError(null);
        setSuccess(null);
        setOtpSent(false);
        setCountdown(0);
    };

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        setError(null);
        setSuccess(null);
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
        setOtpSent(false);
    };

    // 密码登录/注册
    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

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
        } catch {
            setError('操作失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 忘记密码
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!email) {
            setError('请填写邮箱');
            return;
        }

        setLoading(true);

        try {
            const { error } = await resetPassword(email);
            if (error) {
                setError(error);
            } else {
                setSuccess('重置密码邮件已发送，请查收邮箱。');
            }
        } catch {
            setError('发送失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 发送验证码
    const handleSendOtp = async () => {
        setError(null);

        if (!email) {
            setError('请填写邮箱');
            return;
        }

        setLoading(true);

        try {
            const { error } = await sendOtp(email);
            if (error) {
                setError(error);
            } else {
                setOtpSent(true);
                setCountdown(60);
                setSuccess('验证码已发送到您的邮箱');
            }
        } catch {
            setError('发送失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 验证码登录
    const handleOtpLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!email || !otpCode) {
            setError('请填写邮箱和验证码');
            return;
        }

        if (otpCode.length !== 6) {
            setError('请输入6位验证码');
            return;
        }

        setLoading(true);

        try {
            const { error } = await verifyOtp(email, otpCode);
            if (error) {
                setError(error);
            } else {
                onClose();
                resetForm();
            }
        } catch {
            setError('验证失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (mode) {
            case 'login': return '登录';
            case 'register': return '注册';
            case 'forgot': return '找回密码';
            case 'otp': return '验证码登录';
        }
    };

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card" style={{ maxWidth: '380px' }}>
                {/* 标题和返回按钮 */}
                <div className="flex items-center justify-center relative mb-6">
                    {(mode === 'forgot' || mode === 'otp') && (
                        <button
                            type="button"
                            onClick={() => switchMode('login')}
                            className="absolute left-0 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <h2 className="modal-title text-center m-0">{getTitle()}</h2>
                </div>

                {/* ========== 登录模式 ========== */}
                {mode === 'login' && (
                    <form onSubmit={handlePasswordSubmit}>
                        <div className="modal-field">
                            <label className="modal-label">邮箱</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="modal-input with-left-icon"
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
                                    className="modal-input with-left-icon with-right-icon"
                                    autoComplete="current-password"
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

                        {/* 忘记密码链接 */}
                        <div className="flex justify-end mb-4">
                            <button
                                type="button"
                                onClick={() => switchMode('forgot')}
                                className="text-xs text-muted-foreground hover:text-primary"
                            >
                                忘记密码？
                            </button>
                        </div>

                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="text-sm text-accent bg-accent/10 rounded-lg px-3 py-2 mb-4">
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="modal-btn primary w-full flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            登录
                        </button>

                        {/* 分隔线 */}
                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground">或</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* 验证码登录按钮 */}
                        <button
                            type="button"
                            onClick={() => switchMode('otp')}
                            className="w-full py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted flex items-center justify-center gap-2"
                        >
                            <KeyRound className="w-4 h-4" />
                            验证码登录
                        </button>

                        <div className="text-center mt-4">
                            <span className="text-sm text-muted-foreground">还没有账号？</span>
                            <button
                                type="button"
                                onClick={() => switchMode('register')}
                                className="text-sm text-primary hover:underline ml-1"
                            >
                                立即注册
                            </button>
                        </div>
                    </form>
                )}

                {/* ========== 注册模式 ========== */}
                {mode === 'register' && (
                    <form onSubmit={handlePasswordSubmit}>
                        <div className="modal-field">
                            <label className="modal-label">邮箱</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="modal-input with-left-icon"
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
                                    className="modal-input with-left-icon with-right-icon"
                                    autoComplete="new-password"
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

                        <div className="modal-field">
                            <label className="modal-label">确认密码</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="再次输入密码"
                                    className="modal-input with-left-icon"
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="text-sm text-accent bg-accent/10 rounded-lg px-3 py-2 mb-4">
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="modal-btn primary w-full flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            注册
                        </button>

                        <div className="text-center mt-4">
                            <span className="text-sm text-muted-foreground">已有账号？</span>
                            <button
                                type="button"
                                onClick={() => switchMode('login')}
                                className="text-sm text-primary hover:underline ml-1"
                            >
                                去登录
                            </button>
                        </div>
                    </form>
                )}

                {/* ========== 忘记密码模式 ========== */}
                {mode === 'forgot' && (
                    <form onSubmit={handleForgotPassword}>
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
                                    className="modal-input with-left-icon"
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="text-sm text-accent bg-accent/10 rounded-lg px-3 py-2 mb-4">
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="modal-btn primary w-full flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            发送重置邮件
                        </button>

                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => switchMode('login')}
                                className="text-sm text-muted-foreground hover:text-primary"
                            >
                                返回登录
                            </button>
                        </div>
                    </form>
                )}

                {/* ========== 验证码登录模式 ========== */}
                {mode === 'otp' && (
                    <form onSubmit={handleOtpLogin}>
                        <div className="modal-field">
                            <label className="modal-label">邮箱</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="modal-input with-left-icon"
                                    autoComplete="email"
                                    disabled={loading || otpSent}
                                />
                            </div>
                        </div>

                        {!otpSent ? (
                            <>
                                {error && (
                                    <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={loading}
                                    className="modal-btn primary w-full flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    发送验证码
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="modal-field">
                                    <label className="modal-label">验证码</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="6位数字验证码"
                                            className="modal-input flex-1 text-center tracking-widest"
                                            maxLength={6}
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSendOtp}
                                            disabled={loading || countdown > 0}
                                            className="px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {countdown > 0 ? `${countdown}s` : '重新发送'}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="text-sm text-accent bg-accent/10 rounded-lg px-3 py-2 mb-4">
                                        {success}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || otpCode.length !== 6}
                                    className="modal-btn primary w-full flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    登录
                                </button>
                            </>
                        )}

                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => switchMode('login')}
                                className="text-sm text-muted-foreground hover:text-primary"
                            >
                                使用密码登录
                            </button>
                        </div>
                    </form>
                )}

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
