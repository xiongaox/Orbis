/**
 * AuthModal - 应用源码层
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
 * - `default AuthModal`, `AuthMode`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `BaseModal` 等 7 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState } from 'react';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import OtpLoginForm from './OtpLoginForm';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export type AuthMode = 'login' | 'register' | 'forgot' | 'otp';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>('login');

    const handleClose = () => {
        setMode('login');
        onClose();
    };

    if (!isOpen) return null;

    const getTitle = () => {
        switch (mode) {
            case 'login': return '登录';
            case 'register': return '注册';
            case 'forgot': return '找回密码';
            case 'otp': return '验证码登录';
        }
    };

    const getTitleIcon = () => {
        // 当有返回按钮时（forgot/otp 模式），返回按钮作为图标位置
        if (mode === 'forgot' || mode === 'otp') {
            return (
                <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="p-1 -ml-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors"
                    aria-label="返回登录"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
            );
        }
        // 登录/注册模式显示对应图标
        switch (mode) {
            case 'login': return <LogIn className="w-5 h-5" />;
            case 'register': return <UserPlus className="w-5 h-5" />;
            default: return null;
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={getTitle()}
            titleIcon={getTitleIcon()}
            maxWidth="max-w-[380px]"
        >
            {mode === 'login' && <LoginForm onSwitchMode={setMode} onClose={handleClose} />}
            {mode === 'register' && <RegisterForm onSwitchMode={setMode} />}
            {mode === 'forgot' && <ForgotPasswordForm onSwitchMode={setMode} />}
            {mode === 'otp' && <OtpLoginForm onSwitchMode={setMode} onClose={handleClose} />}
        </BaseModal>
    );
}
