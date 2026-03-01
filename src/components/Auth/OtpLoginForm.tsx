/**
 * OtpLoginForm - 应用源码层
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
 * - `default OtpLoginForm`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `useAuth` 等 4 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useState, useEffect } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { type AuthMode } from './AuthModal';

interface OtpLoginFormProps {
    onSwitchMode: (mode: AuthMode) => void;
    onClose: () => void;
}

export default function OtpLoginForm({ onSwitchMode, onClose }: OtpLoginFormProps) {
    const { sendOtp, verifyOtp } = useAuth();
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleSendOtp = async () => {
        setError(null);
        if (!email) {
            setError('请填写邮箱');
            return;
        }

        setLoading(true);
        try {
            const { error: sendError } = await sendOtp(email);
            if (sendError) {
                setError(sendError);
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

    const handleSubmit = async (e: React.FormEvent) => {
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
            const { error: verifyError } = await verifyOtp(email, otpCode);
            if (verifyError) {
                setError(verifyError);
            } else {
                onClose();
            }
        } catch {
            setError('验证失败，请稍后重试');
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
                        disabled={loading || otpSent}
                    />
                </div>
            </div>

            {!otpSent ? (
                <>
                    {error && (
                        <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="modal-btn primary w-full flex items-center justify-center gap-2 focus-ring"
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
                                className="modal-input flex-1 text-center tracking-widest focus-ring"
                                maxLength={6}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={loading || countdown > 0}
                                className="px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 whitespace-nowrap focus-ring"
                            >
                                {countdown > 0 ? `${countdown}s` : '重新发送'}
                            </button>
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
                        disabled={loading || otpCode.length !== 6}
                        className="modal-btn primary w-full flex items-center justify-center gap-2 focus-ring"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        登录
                    </button>
                </>
            )}

            <div className="text-center mt-4">
                <button
                    type="button"
                    onClick={() => onSwitchMode('login')}
                    className="text-sm text-muted-foreground hover:text-primary focus:outline-none focus:underline"
                >
                    使用密码登录
                </button>
            </div>
        </form>
    );
}
