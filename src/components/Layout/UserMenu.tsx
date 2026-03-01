import { useState, useEffect, useRef } from 'react';
import { Compass, User, Calendar, Key, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { getUserAvatar } from '../../utils/userUtil';

interface UserMenuProps {
    onLoginClick: () => void;
    onShowContact: () => void;
    onShowBirthday: () => void;
    onShowPassword: () => void;
    birthDate?: Date;
}

export default function UserMenu({
    onLoginClick,
    onShowContact,
    onShowBirthday,
    onShowPassword,
    birthDate
}: UserMenuProps) {
    const { user, isAuthenticated, signOut, loading } = useAuth();
    const { isPadLandscape } = useLayoutMode();
    const [menuOpen, setMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭菜单
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) { document.addEventListener('mousedown', handleClickOutside); }
        return () => { document.removeEventListener('mousedown', handleClickOutside); };
    }, [menuOpen]);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await signOut();
            setMenuOpen(false);
        } finally {
            setLoggingOut(false);
        }
    };

    const displayName = user?.email?.split('@')[0] || '用户';
    const avatarPath = getUserAvatar(user?.email, birthDate?.getFullYear());

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="inline-flex items-center justify-center md:justify-start gap-0 md:gap-2 w-9 h-9 md:w-auto md:h-auto p-0 md:px-3 md:py-2 rounded-xl md:rounded-lg border border-border/60 md:border-transparent bg-card/55 md:bg-transparent hover:bg-secondary/50 transition-colors"
                disabled={loading}
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                ) : isAuthenticated ? (
                    <img src={avatarPath} alt={displayName} className="w-[22px] h-[22px] md:w-4 md:h-4 rounded-full object-cover" />
                ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="hidden md:inline text-sm text-muted-foreground max-w-[120px] truncate">
                    {loading ? '加载中...' : isAuthenticated ? displayName : '未登录'}
                </span>
            </button>
            {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 animate-fade-in z-50">
                    {isAuthenticated ? (
                        <>
                            {/* GitHub 和联系作者：移动端 + Pad 端显示，桌面端隐藏 */}
                            <button
                                type="button"
                                onClick={() => {
                                    window.open('https://github.com/xiongaox/Orbis', '_blank', 'noopener,noreferrer');
                                    setMenuOpen(false);
                                }}
                                className={`${isPadLandscape ? '' : 'md:hidden'} w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2`}
                            >
                                <Compass className="w-4 h-4" />
                                GitHub 仓库
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onShowContact();
                                    setMenuOpen(false);
                                }}
                                className={`${isPadLandscape ? '' : 'md:hidden'} w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2`}
                            >
                                <User className="w-4 h-4" />
                                联系作者
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onShowBirthday();
                                    setMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"
                            >
                                <Calendar className="w-4 h-4" />
                                设置生日
                            </button>
                            <button
                                onClick={() => {
                                    onShowPassword();
                                    setMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"
                            >
                                <Key className="w-4 h-4" />
                                修改密码
                            </button>
                            <button
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                            >
                                {loggingOut ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <LogOut className="w-4 h-4" />
                                )}
                                退出登录
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    window.open('https://github.com/xiongaox/Orbis', '_blank', 'noopener,noreferrer');
                                    setMenuOpen(false);
                                }}
                                className={`${isPadLandscape ? '' : 'md:hidden'} w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2`}
                            >
                                <Compass className="w-4 h-4" />
                                GitHub 仓库
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onShowContact();
                                    setMenuOpen(false);
                                }}
                                className={`${isPadLandscape ? '' : 'md:hidden'} w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2`}
                            >
                                <User className="w-4 h-4" />
                                联系作者
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onLoginClick();
                                    setMenuOpen(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"
                            >
                                <User className="w-4 h-4" />
                                登录 / 注册
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
