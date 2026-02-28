/**
 * 登录/注册 Modal
 * 支持：密码登录、注册、忘记密码、验证码登录
 */
import { useState, useEffect } from 'react';
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

    if (!isOpen) return null;

    useEffect(() => {
        if (!isOpen) {
            setMode('login'); // 弹窗关闭时恢复初始状态
        }
    }, [isOpen]);

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
            onClose={onClose}
            title={getTitle()}
            titleIcon={getTitleIcon()}
            maxWidth="max-w-[380px]"
        >
            {mode === 'login' && <LoginForm onSwitchMode={setMode} onClose={onClose} />}
            {mode === 'register' && <RegisterForm onSwitchMode={setMode} />}
            {mode === 'forgot' && <ForgotPasswordForm onSwitchMode={setMode} />}
            {mode === 'otp' && <OtpLoginForm onSwitchMode={setMode} onClose={onClose} />}
        </BaseModal>
    );
}
