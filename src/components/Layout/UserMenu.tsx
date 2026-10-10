import { useState, useEffect, useRef } from 'react';
import { Bot, CalendarDays, Compass, Info, KeyRound, MessageSquare, RefreshCw, Trash2, User, Cloud } from 'lucide-react';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { useUpdateChecker } from '../../hooks/useUpdateChecker';
import { getUserAvatar } from '../../utils/userUtil';
import { openExternalUrl } from '../../utils/browserUtil';
import { publicCaseLibraryService } from '../../services/publicCaseLibraryService';
import { localPrivateStore, type PrivateRecordType } from '../../services/localPrivateStore';
import { BAZI_CASES_CHANGED_EVENT, QIMEN_CASES_CHANGED_EVENT, SANYUAN_CASES_CHANGED_EVENT } from '../../data/caseConstants';
import BaseModal, { CompactModalTitle } from '../UI/BaseModal';
import { AppChangelogSplitView } from '../Common/AppChangelogList';
import SignerModal from '../Common/SignerModal';

/**
 * 临时调试入口：清空本地业务数据用的类型清单。
 * 刻意排除 webdav_config / s3_config / backup_method，否则清空后连备份列表都打不开，无法接着测恢复。
 * 验证完恢复流程后，连同下面的「清除数据」按钮一起删除。
 */
const CLEARABLE_RECORD_TYPES: PrivateRecordType[] = [
    'bazi_case', 'qimen_case', 'sanyuan_case', 'profile', 'ai_model_service', 'case_favorite', 'case_progress',
];

interface UserMenuProps {
    onShowContact: () => void;
    onShowProfile: () => void;
    onShowAiIntegration: () => void;
    onShowAiChatHistory: () => void;
    onShowPrivateDataBackup: () => void;
    birthDate?: Date;
}

export default function UserMenu({ onShowContact, onShowProfile, onShowAiIntegration, onShowAiChatHistory, onShowPrivateDataBackup, birthDate }: UserMenuProps) {
    const { isPadLandscape, useDesktopLayout } = useLayoutMode();
    const [menuOpen, setMenuOpen] = useState(false);
    const [canSign, setCanSign] = useState(false);
    const [isSignerOpen, setIsSignerOpen] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const { updateState, checkUpdate } = useUpdateChecker();
    const menuRef = useRef<HTMLDivElement>(null);
    const avatarPath = getUserAvatar(undefined, birthDate?.getFullYear());

    useEffect(() => {
        let cancelled = false;
        void publicCaseLibraryService.isSigningAvailable().then((available) => {
            if (!cancelled) setCanSign(available);
        }).catch(() => {
            if (!cancelled) setCanSign(false);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
        };
        if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    // 临时调试入口：清空本地业务数据后可直接去「数据备份 → 恢复」验证恢复流程
    const handleClearData = async () => {
        setMenuOpen(false);
        if (!window.confirm('清除本地全部业务数据（案例、资料、摘要与收藏）？\n备份配置会保留，清空后可直接测试恢复。此操作不可撤销。')) return;
        try {
            for (const type of CLEARABLE_RECORD_TYPES) await localPrivateStore.clear(type);
            for (const eventName of [BAZI_CASES_CHANGED_EVENT, QIMEN_CASES_CHANGED_EVENT, SANYUAN_CASES_CHANGED_EVENT]) {
                window.dispatchEvent(new CustomEvent(eventName));
            }
            window.alert('本地数据已清空，可前往「数据备份」测试恢复了。');
        } catch (error) {
            window.alert(error instanceof Error ? error.message : '清除数据失败');
        }
    };

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
                    <button type="button" onClick={() => { void openExternalUrl('https://github.com/xiongaox/Orbis'); setMenuOpen(false); }} className={`${isPadLandscape ? '' : 'md:hidden'} w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2`}><Compass className="w-4 h-4" />GitHub 仓库</button>
                    <button type="button" onClick={() => { onShowContact(); setMenuOpen(false); }} className={`${isPadLandscape ? '' : 'md:hidden'} w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2`}><User className="w-4 h-4" />联系作者</button>
                    <button type="button" onClick={() => { onShowProfile(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"><CalendarDays className="w-4 h-4" />设置生日</button>
                    <button type="button" onClick={() => { onShowAiChatHistory(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"><MessageSquare className="w-4 h-4" />对话历史</button>
                    <button type="button" onClick={() => { onShowAiIntegration(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"><Bot className="w-4 h-4" />AI 集成</button>
                    <button type="button" onClick={() => { onShowPrivateDataBackup(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"><Cloud className="w-4 h-4" />数据备份</button>
                    <button type="button" onClick={checkUpdate} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />检查更新
                        {updateState !== 'idle' && (
                            <span className={`ml-auto text-xs ${updateState === 'newer' ? 'text-primary' : 'text-muted-foreground'}`}>
                                {updateState === 'checking' ? '检查中…' : updateState === 'latest' ? '已是最新' : updateState === 'newer' ? '有新版' : '失败重试'}
                            </span>
                        )}
                    </button>
                    <button type="button" onClick={() => { setShowChangelog(true); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2">
                        <Info className="w-4 h-4" />更新日志
                        <span className="ml-auto text-xs text-muted-foreground">v{__APP_VERSION__}</span>
                    </button>
                    {canSign && (
                        <button type="button" onClick={() => { setIsSignerOpen(true); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-secondary/50 flex items-center gap-2 border-t border-border/50"><KeyRound className="w-4 h-4" />签发激活码</button>
                    )}
                    {/* 临时调试入口：验证恢复流程用，验证完连同 CLEARABLE_RECORD_TYPES 一起删除 */}
                    <button type="button" onClick={() => { void handleClearData(); }} className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary/50 flex items-center gap-2 border-t border-border/50"><Trash2 className="w-4 h-4" />清除数据（调试）</button>
                </div>
            )}
            {isSignerOpen && <SignerModal isOpen={isSignerOpen} onClose={() => setIsSignerOpen(false)} />}
            <BaseModal
                isOpen={showChangelog}
                onClose={() => setShowChangelog(false)}
                title={<CompactModalTitle>版本与更新日志</CompactModalTitle>}
                maxWidth="md:max-w-2xl"
                bodyClassName="p-0"
            >
                <AppChangelogSplitView />
            </BaseModal>
        </div>
    );
}

