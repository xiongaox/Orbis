/**
 * 模块定位：
 * - 主要目标：移动端「个人中心」整页（底部导航末位槽进入）
 *
 * 内容（design-demos/mobile-bottom-nav 定稿）：
 * - 头部不放用户名（项目无用户名概念）：玄枢录 + 备份信息（本地私有存储 · 远端备份状态）
 * - 底部菜单管理：首页万年通历固定，其余槽位从候选术数中更换（上限见 MOBILE_NAV_MAX_SLOTS）
 * - 通用：外观（主题切换）、设置生日
 * - 数据与服务：原侧拉「菜单」与右上角菜单的条目（对话历史 / AI 集成 / 数据备份 / 联系作者 / GitHub / 签发激活码）
*/
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import {
    Bot,
    BookOpen,
    Calendar,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Cloud,
    Compass,
    Github,
    Grid3X3,
    History,
    Info,
    KeyRound,
    Moon,
    Plus,
    RefreshCw,
    ScrollText,
    Star,
    Sun,
    User,
    X,
} from 'lucide-react';
import type { ChartType } from '../../types';
import { openExternalUrl } from '../../utils/browserUtil';
import { useUpdateChecker } from '../../hooks/useUpdateChecker';
import AppChangelogList, { ChangelogItems } from '../Common/AppChangelogList';
import { type AppChangelogEntry } from '../../lib/appChangelog';
import { popBackHandler, pushBackHandler } from '../../utils/androidBackButton';
import { profileService } from '../../services/profileService';
import { getUserAvatar } from '../../utils/userUtil';
import { publicCaseLibraryService } from '../../services/publicCaseLibraryService';
import { webDavBackupService, WEBDAV_CONFIG_CHANGE_EVENT } from '../../services/webdavBackupService';
import { s3BackupService, S3_CONFIG_CHANGE_EVENT } from '../../services/s3BackupService';
import BaseModal, { CompactModalTitle } from '../UI/BaseModal';
import SubPage from '../UI/SubPage';
import ProfileCenterModal from '../Auth/ProfileCenterModal';
import AiIntegrationModal from '../Common/AiIntegrationModal';
import AiChatHistoryModal from '../Common/AiChatHistoryModal';
import PrivateDataBackupModal from '../Common/PrivateDataBackupModal';
import SignerModal from '../Common/SignerModal';
import {
    MOBILE_NAV_CANDIDATES,
    MOBILE_NAV_MAX_SLOTS,
    mobileNavModuleName,
} from '../../lib/mobileNavStorage';

const CANDIDATE_ICONS: Partial<Record<ChartType, ComponentType<{ className?: string }>>> = {
    bazi: Compass,
    qimen: Grid3X3,
    sanyuan: Star,
    xiaoliuren: Sun,
};

interface MobileProfileCenterProps {
    /** 已固定的可换槽位（不含首页） */
    slots: ChartType[];
    onSlotsChange: (slots: ChartType[]) => void;
    /** 打开案例学习模块；category 缺省时保持模块当前分类，'duanfa' 直达断法 */
    onOpenCaseStudy: (category?: string) => void;
    /** 返回主菜单（安卓返回键 / Escape） */
    onGoHome: () => void;
}

function ToggleSwitch({ checked, disabled, onChange }: {
    checked: boolean;
    disabled?: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={checked ? '已固定' : '未固定'}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative w-10 h-6 rounded-full shrink-0 transition-colors focus:outline-none focus-ring ${
                checked ? 'bg-primary/80' : 'bg-muted/60'
            } ${disabled ? 'opacity-40' : ''}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow-sm transition-transform ${
                    checked ? 'translate-x-4' : ''
                }`}
            />
        </button>
    );
}

function SettingsRow({ icon: Icon, label, sub, end, onClick }: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    sub?: string;
    end?: ReactNode;
    onClick?: () => void;
}) {
    const inner = (
        <>
            <span className="w-7 h-7 shrink-0 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                <Icon className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-sm text-foreground">{label}</span>
                {sub && <span className="block text-[11px] text-muted-foreground mt-0.5">{sub}</span>}
            </span>
            {end ?? <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />}
        </>
    );
    const cls = 'w-full flex items-center gap-3 px-3 min-h-[50px] text-left';
    return onClick ? (
        <button type="button" onClick={onClick} className={`${cls} hover:bg-muted/30 transition-colors focus:outline-none focus-ring`}>
            {inner}
        </button>
    ) : (
        <div className={cls}>{inner}</div>
    );
}

function SectionTitle({ title }: { title: string }) {
    return <h2 className="px-1 mb-2 text-xs tracking-[0.08em] text-muted-foreground">{title}</h2>;
}

export default function MobileProfileCenter({ slots, onSlotsChange, onOpenCaseStudy, onGoHome }: MobileProfileCenterProps) {
    const [isDark, setIsDark] = useState(() => (
        typeof document === 'undefined' ? true : document.documentElement.classList.contains('dark')
    ));
    const [backupSummary, setBackupSummary] = useState('正在读取备份配置…');
    const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
    const [canSign, setCanSign] = useState(false);

    const [showBirthday, setShowBirthday] = useState(false);
    const [showChatHistory, setShowChatHistory] = useState(false);
    const [showAi, setShowAi] = useState(false);
    const [showBackup, setShowBackup] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const [signerOpen, setSignerOpen] = useState(false);
    const [showSlotPicker, setShowSlotPicker] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [changelogDetail, setChangelogDetail] = useState<AppChangelogEntry | null>(null);
    const { updateState, latestVersion, checkUpdate } = useUpdateChecker();

    const updateEndText =
        updateState === 'newer'
            ? `可更新至 v${latestVersion}`
            : updateState === 'checking'
                ? '检查中…'
                : updateState === 'latest'
                    ? '已是最新'
                    : updateState === 'error'
                        ? '检查失败，点击重试'
                        : '检查新版本';

    // 安卓返回键 / Escape 分层关闭：先关术数选择弹层，再回主菜单
    useEffect(() => {
        const handler = () => {
            if (showSlotPicker) setShowSlotPicker(false);
            else onGoHome();
        };
        pushBackHandler(handler);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') handler();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            popBackHandler(handler);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onGoHome, showSlotPicker]);

    useEffect(() => {
        let cancelled = false;
        profileService.getProfile().then((profile) => {
            if (!cancelled) setBirthDate(profile?.birth_date ? new Date(profile.birth_date) : undefined);
        }).catch(() => {
            if (!cancelled) setBirthDate(undefined);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        void publicCaseLibraryService.isSigningAvailable().then((available) => {
            if (!cancelled) setCanSign(available);
        }).catch(() => {
            if (!cancelled) setCanSign(false);
        });
        return () => { cancelled = true; };
    }, []);

    // 备份信息随配置变化实时刷新：哪个配置了显示哪个，都配置了优先显示 WebDAV
    useEffect(() => {
        let cancelled = false;
        const read = () => {
            void (async () => {
                try {
                    const [webdav, s3] = await Promise.all([
                        webDavBackupService.readConfig(),
                        s3BackupService.readConfig(),
                    ]);
                    if (cancelled) return;
                    const autoText = (auto: boolean) => (auto ? '自动备份开' : '自动备份关');
                    let summary: string;
                    if (webdav.endpoint) {
                        summary = `WebDAV 备份已配置 · ${autoText(webdav.autoBackupEnabled)}`;
                    } else if (s3.endpoint) {
                        summary = `S3 备份已配置 · ${autoText(s3.autoBackupEnabled)}`;
                    } else {
                        summary = '云备份未配置';
                    }
                    setBackupSummary(summary);
                } catch {
                    if (!cancelled) setBackupSummary('备份配置读取失败');
                }
            })();
        };
        read();
        window.addEventListener(WEBDAV_CONFIG_CHANGE_EVENT, read);
        window.addEventListener(S3_CONFIG_CHANGE_EVENT, read);
        return () => {
            cancelled = true;
            window.removeEventListener(WEBDAV_CONFIG_CHANGE_EVENT, read);
            window.removeEventListener(S3_CONFIG_CHANGE_EVENT, read);
        };
    }, []);

    const handleToggleTheme = () => {
        setIsDark((prev) => {
            const next = !prev;
            document.documentElement.classList.toggle('dark', next);
            localStorage.setItem('theme', next ? 'dark' : 'light');
            return next;
        });
    };

    const handleToggleSlot = (id: ChartType, next: boolean) => {
        if (next) {
            if (slots.length >= MOBILE_NAV_MAX_SLOTS || slots.includes(id)) return;
            onSlotsChange([...slots, id]);
        } else {
            onSlotsChange(slots.filter((slot) => slot !== id));
        }
    };

    // 槽位点击排序：上移 / 下移（首页固定在最左，不参与）
    const moveSlot = (id: ChartType, dir: -1 | 1) => {
        const from = slots.indexOf(id);
        const to = from + dir;
        if (from < 0 || to < 0 || to >= slots.length) return;
        const next = [...slots];
        next.splice(from, 1);
        next.splice(to, 0, id);
        onSlotsChange(next);
    };

    return (
        <div className="h-full overflow-y-auto" aria-label="个人中心">
            <div className="px-4 pt-5 pb-10 max-w-md mx-auto space-y-6">
                {/* 头部：无用户名，展示存储与备份信息；头像按生日显示生肖（同 UserMenu 取图逻辑） */}
                <div className="flex items-center gap-3">
                    <img
                        src={getUserAvatar(undefined, birthDate?.getFullYear())}
                        alt="生肖头像"
                        className="w-12 h-12 shrink-0 rounded-full object-cover bg-secondary/60 border border-border"
                    />
                    <div className="min-w-0">
                        <div className="font-serif text-lg font-bold tracking-[0.14em] text-foreground">玄枢录</div>
                        <div className="text-xs text-muted-foreground mt-1 leading-5">
                            数据存放于本地私有存储 · 一机一密
                            <br />
                            {backupSummary}
                        </div>
                    </div>
                </div>

                {/* 底部菜单管理：管理列表（序号 + 图标 + 名称 + 把手 + 移除），为后续拖拽排序预留形态 */}
                <section>
                    <SectionTitle title="底部菜单管理" />
                    <div className="space-y-2">
                        {/* 首页行：固定显示，不可移除、不可拖动 */}
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border">
                            <span className="w-4 text-center font-serif text-[13px] text-muted-foreground/70">1</span>
                            <span className="w-[34px] h-[34px] shrink-0 rounded-[9px] bg-primary/10 border border-primary/50 text-primary flex items-center justify-center">
                                <Calendar className="w-[17px] h-[17px]" />
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="block text-[13.5px] font-semibold text-foreground">万年通历</span>
                                <span className="block text-[10.5px] text-muted-foreground mt-0.5">首页 · 固定显示</span>
                            </span>
                        </div>

                        {slots.map((id, i) => {
                            const Icon = CANDIDATE_ICONS[id];
                            const showMoveDown = i === 0 && slots.length > 1;
                            const showMoveUp = i === slots.length - 1 && slots.length > 1;
                            return (
                                <div
                                    key={id}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border"
                                >
                                    <span className="w-4 text-center font-serif text-[13px] text-muted-foreground/70">{i + 2}</span>
                                    <span className="w-[34px] h-[34px] shrink-0 rounded-[9px] bg-primary/10 border border-primary/50 text-primary flex items-center justify-center">
                                        {Icon && <Icon className="w-[17px] h-[17px]" />}
                                    </span>
                                    <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-foreground">{mobileNavModuleName(id)}</span>
                                    {showMoveDown && (
                                        <button
                                            type="button"
                                            onClick={() => moveSlot(id, 1)}
                                            className="w-7 h-7 shrink-0 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center justify-center transition-colors focus:outline-none focus-ring"
                                            aria-label={`下移${mobileNavModuleName(id)}`}
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                    )}
                                    {showMoveUp && (
                                        <button
                                            type="button"
                                            onClick={() => moveSlot(id, -1)}
                                            className="w-7 h-7 shrink-0 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center justify-center transition-colors focus:outline-none focus-ring"
                                            aria-label={`上移${mobileNavModuleName(id)}`}
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleSlot(id, false)}
                                        className="w-7 h-7 shrink-0 rounded-lg bg-black/25 border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/40 flex items-center justify-center transition-colors focus:outline-none focus-ring"
                                        aria-label={`移除${mobileNavModuleName(id)}`}
                                    >
                                        <X className="w-[11px] h-[11px]" />
                                    </button>
                                </div>
                            );
                        })}

                        {slots.length < MOBILE_NAV_MAX_SLOTS && (
                            <button
                                type="button"
                                onClick={() => setShowSlotPicker(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/50 text-[12.5px] text-primary hover:bg-primary/5 transition-colors focus:outline-none focus-ring"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                更换术数
                            </button>
                        )}
                    </div>
                </section>

                {/* 通用 */}
                <section>
                    <SectionTitle title="通用" />
                    <div className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
                        <SettingsRow
                            icon={isDark ? Sun : Moon}
                            label="外观"
                            sub={isDark ? '当前：深色' : '当前：浅色'}
                            end={<span className="text-xs text-muted-foreground">切换主题</span>}
                            onClick={handleToggleTheme}
                        />
                        <SettingsRow icon={CalendarDays} label="设置生日" onClick={() => setShowBirthday(true)} />
                    </div>
                </section>

                {/* 案例学习独立入口：案例 / 断法两项直达（不占术数槽位） */}
                <section>
                    <SectionTitle title="案例学习" />
                    <div className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
                        <SettingsRow icon={BookOpen} label="案例" onClick={() => onOpenCaseStudy('bazi')} />
                        <SettingsRow icon={ScrollText} label="断法" onClick={() => onOpenCaseStudy('duanfa')} />
                    </div>
                </section>

                {/* 数据与服务 */}
                <section>
                    <SectionTitle title="数据与服务" />
                    <div className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
                        <SettingsRow icon={History} label="对话历史" onClick={() => setShowChatHistory(true)} />
                        <SettingsRow icon={Bot} label="AI 集成" onClick={() => setShowAi(true)} />
                        <SettingsRow icon={Cloud} label="数据备份" sub="本地私有存储 · WebDAV / S3 仅备份" onClick={() => setShowBackup(true)} />
                        {canSign && (
                            <SettingsRow icon={KeyRound} label="签发激活码" end={<span className="text-xs text-primary">管理员</span>} onClick={() => setSignerOpen(true)} />
                        )}
                    </div>
                </section>

                {/* 关于：联系 / 仓库 / 检查更新 / 版本（点击版本行查看更新日志） */}
                <section>
                    <SectionTitle title="关于" />
                    <div className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
                        <SettingsRow icon={User} label="联系作者" onClick={() => setShowContact(true)} />
                        <SettingsRow
                            icon={Github}
                            label="GitHub 仓库"
                            onClick={() => {
                                void openExternalUrl('https://github.com/xiongaox/Orbis');
                            }}
                        />
                        <SettingsRow
                            icon={RefreshCw}
                            label="检查更新"
                            end={
                                <span className={`text-xs ${updateState === 'newer' ? 'text-primary' : 'text-muted-foreground'}`}>
                                    {updateEndText}
                                </span>
                            }
                            onClick={checkUpdate}
                        />
                        <SettingsRow
                            icon={Info}
                            label="版本"
                            end={<span className="text-xs text-muted-foreground">v{__APP_VERSION__}</span>}
                            onClick={() => setShowChangelog(true)}
                        />
                    </div>
                </section>
            </div>

            {/* 版本与更新日志二级页：按开发日分组的版本卡片，卡片默认展示前 3 条 */}
            <SubPage
                isOpen={showChangelog}
                onClose={() => setShowChangelog(false)}
                title="版本与更新日志"
                bodyClassName="p-4 space-y-3"
            >
                <AppChangelogList previewCount={3} onEntryClick={setChangelogDetail} />
            </SubPage>

            {/* 单版本完整日志弹窗：从二级页卡片点入 */}
            <BaseModal
                isOpen={changelogDetail !== null}
                onClose={() => setChangelogDetail(null)}
                title={<CompactModalTitle>{`${changelogDetail?.version ?? ''} 更新日志`}</CompactModalTitle>}
                maxWidth="md:max-w-md"
                bottomSheet
                bodyClassName="p-4"
            >
                {changelogDetail && (
                    <div>
                        <div className="text-[11px] text-muted-foreground">{changelogDetail.date}</div>
                        <div className="mt-2">
                            <ChangelogItems items={changelogDetail.items} />
                        </div>
                    </div>
                )}
            </BaseModal>

            {/* 术数选择弹层：候选列表可滚动，术数增多不影响个人中心页高度 */}
            <BaseModal
                isOpen={showSlotPicker}
                onClose={() => setShowSlotPicker(false)}
                title={<CompactModalTitle>更换主菜单术数</CompactModalTitle>}
                maxWidth="md:max-w-md"
                bottomSheet
                bodyClassName="p-4"
            >
                <div className="rounded-xl border border-border bg-background divide-y divide-border/60 overflow-hidden">
                    {MOBILE_NAV_CANDIDATES.map((item) => {
                        const Icon = CANDIDATE_ICONS[item.id];
                        const on = slots.includes(item.id);
                        const disabled = !on && slots.length >= MOBILE_NAV_MAX_SLOTS;
                        return (
                            <div key={item.id} className="flex items-center gap-3 px-3 min-h-[52px]">
                                <span className="w-7 h-7 shrink-0 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                                    {Icon && <Icon className="w-4 h-4" />}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-foreground">{item.name}</div>
                                    {disabled && <div className="text-[11px] text-muted-foreground">槽位已满（{MOBILE_NAV_MAX_SLOTS}），先移除一个</div>}
                                </div>
                                <ToggleSwitch checked={on} disabled={disabled} onChange={(next) => handleToggleSlot(item.id, next)} />
                            </div>
                        );
                    })}
                </div>
                <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
                    已固定 {slots.length}/{MOBILE_NAV_MAX_SLOTS}
                </p>
            </BaseModal>

            <ProfileCenterModal
                isOpen={showBirthday}
                onClose={() => setShowBirthday(false)}
                birthDate={birthDate}
                onBirthDateChange={setBirthDate}
            />

            {showChatHistory && (
                <AiChatHistoryModal isOpen onClose={() => setShowChatHistory(false)} />
            )}

            {showAi && (
                <AiIntegrationModal isOpen onClose={() => setShowAi(false)} />
            )}

            <PrivateDataBackupModal isOpen={showBackup} onClose={() => setShowBackup(false)} />

            <BaseModal isOpen={showContact} onClose={() => setShowContact(false)} title="联系作者" maxWidth="max-w-sm">
                <div className="flex flex-col items-center justify-center p-4 gap-4">
                    <div className="w-full max-w-[280px] rounded-lg overflow-hidden flex items-center justify-center">
                        {/* 内嵌本地图片：客户端网络白名单会拦掉第三方图床域名 */}
                        <img src="/author-qr.png" alt="微信二维码" className="w-full h-auto object-contain" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        扫码添加作者微信
                        <br />
                        <span className="text-xs opacity-70">请注明来意</span>
                    </p>
                </div>
            </BaseModal>

            {signerOpen && <SignerModal isOpen={signerOpen} onClose={() => setSignerOpen(false)} />}
        </div>
    );
}
