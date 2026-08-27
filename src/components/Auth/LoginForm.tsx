/**
 * LoginForm - 应用源码层
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
 * - `default LoginForm`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `useAuth` 等 4 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useState } from 'react';
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { type AuthMode } from './AuthModal';

interface LoginFormProps {
    onSwitchMode: (mode: AuthMode) => void;
    onClose: () => void;
}

export default function LoginForm({ onSwitchMode, onClose }: LoginFormProps) {
    const { signIn } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!username.trim() || !password) {
            setError('请填写用户名和密码');
            return;
        }

        setLoading(true);
        try {
            const { error: signInError } = await signIn(username, password);
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
                <label className="modal-label">用户名</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="请输入用户名"
                        className="modal-input with-left-icon focus-ring"
                        autoComplete="username"
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
                        placeholder="请输入密码"
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

            {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            <div className="flex justify-end !mt-1">
                <button type="button" onClick={() => onSwitchMode('forgot')} className="text-xs text-muted-foreground hover:text-primary focus:outline-none focus:underline">
                    忘记密码？
                </button>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="modal-btn primary w-full flex items-center justify-center gap-2 focus-ring"
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                登录
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
