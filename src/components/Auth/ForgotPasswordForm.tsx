/**
 * ForgotPasswordForm - 应用源码层
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
 * - `default ForgotPasswordForm`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `useAuth` 等 4 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useState } from 'react';
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { type AuthMode } from './AuthModal';

interface ForgotPasswordFormProps {
    onSwitchMode: (mode: AuthMode) => void;
}

export default function ForgotPasswordForm({ onSwitchMode }: ForgotPasswordFormProps) {
    const { resetPassword } = useAuth();
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!username.trim() || !newPassword || !confirmPassword) {
            setError('请填写用户名和新密码');
            return;
        }
        if (newPassword !== confirmPassword) { setError('两次输入的新密码不一致'); return; }

        setLoading(true);
        try {
            const { error: resetError } = await resetPassword(username, newPassword);
            if (resetError) {
                setError(resetError);
            } else {
                setSuccess('密码已重置，请返回登录。');
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
                输入注册时使用的用户名并设置新密码。
            </p>

            <div className="modal-field">
                <label className="modal-label">用户名</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="请输入用户名"
                        className="modal-input with-left-icon focus-ring"
                        autoComplete="email"
                        disabled={loading}
                    />
                </div>
            </div>
            <div className="modal-field">
                <label className="modal-label">新密码</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="请输入新密码" className="modal-input with-left-icon with-right-icon focus-ring" autoComplete="new-password" disabled={loading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="显示或隐藏密码">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
            </div>
            <div className="modal-field">
                <label className="modal-label">确认新密码</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="请再次输入新密码" className="modal-input focus-ring" autoComplete="new-password" disabled={loading} />
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
