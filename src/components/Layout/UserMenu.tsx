import { useState, useEffect, useRef } from 'react';
import { Bot, CalendarDays, Compass, User, Cloud } from 'lucide-react';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { getUserAvatar } from '../../utils/userUtil';

interface UserMenuProps {
    onShowContact: () => void;
    onShowProfile: () => void;
    onShowAiIntegration: () => void;
    onShowPrivateDataBackup: () => void;
    birthDate?: Date;
}

export default function UserMenu({ onShowContact, onShowProfile, onShowAiIntegration, onShowPrivateDataBackup, birthDate }: UserMenuProps) {
    const { isPadLandscape, useDesktopLayout } = useLayoutMode();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const avatarPath = getUserAvatar(undefined, birthDate?.getFullYear());

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
        };
        if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`inline-flex items-center justify-center w-9 h-9 md:w-auto md:h-auto p-0 ${useDesktopLayout ? 'lg:p-2' : 'md:p-2'} rounded-xl md:rounded-lg border border-border/60 md:border-transparent bg-card/55 md:bg-transparent hover:bg-secondary/50 transition-colors`}
                aria-label="设置与工具菜单"
                title="设置与工具"
            >
                <img src={avatarPath} alt="头像" className={`w-[22px] h-[22px] ${useDesktopLayout ? 'lg:w-[24px] lg:h-[24px]' : 'md:w-[22px] md:h-[22px]'} rounded-full object-cover`} />
            </button>
            {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 animate-fade-in z-50">
                    <button type="button" onClick={() => { window.open('https://github.com/xiongaox/Orbis', '_blank', 'noopener,noreferrer'); setMenuOpen(false); }} className={`${isPadLandscape ? '' : 'md:hidden'} w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2`}><Compass className="w-4 h-4" />GitHub 仓库</button>
                    <button type="button" onClick={() => { onShowContact(); setMenuOpen(false); }} className={`${isPadLandscape ? '' : 'md:hidden'} w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2`}><User className="w-4 h-4" />联系作者</button>
                    <button type="button" onClick={() => { onShowProfile(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"><CalendarDays className="w-4 h-4" />设置生日</button>
                    <button type="button" onClick={() => { onShowAiIntegration(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"><Bot className="w-4 h-4" />AI 集成</button>
                    <button type="button" onClick={() => { onShowPrivateDataBackup(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"><Cloud className="w-4 h-4" />数据备份</button>
                </div>
            )}
        </div>
    );
}

