/**
 * 模块定位：
 * - 主要目标：案例学习离线加密包的“一机一码”激活弹窗
 *
 * 关键职责：
 * - 展示当前设备识别码并支持一键复制
 * - 收集激活码（自动清理首尾空白与换行）并触发本地解锁
 * - 展示解密/导入的分阶段进度与错误反馈
 * - 由用户显式触发（试读态的激活按钮），因此支持关闭；激活进行中不允许关闭
*/

import { Check, Copy, KeyRound, Loader2, Lock, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CasePackProgress } from '../../../services/publicCaseLibraryService';

interface ActivationModalProps {
    machineId: string;
    isActivating: boolean;
    progress: CasePackProgress | null;
    error: string | null;
    onActivate: (licenseCode: string) => void;
    onActivateWithMasterPassword: (password: string) => void;
    onClose: () => void;
    /** 当前环境是否可激活：离线案例库仅桌面端与移动端应用可用 */
    canActivate: boolean;
}

function MachineIdCard({ machineId }: { machineId: string }) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const timer = window.setTimeout(() => setCopied(false), 1600);
        return () => window.clearTimeout(timer);
    }, [copied]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(machineId);
            setCopied(true);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = machineId;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
        }
    };

    return (
        <div className="bg-muted/30 border border-border rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
            <span className="font-mono text-sm tracking-wider text-foreground select-all">{machineId || '读取中...'}</span>
            <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!machineId}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs rounded-md border border-border bg-card px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '已复制' : '复制'}
            </button>
        </div>
    );
}

function ProgressSection({ progress }: { progress: CasePackProgress }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {progress.message}
                </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary opacity-40 animate-pulse" style={{ width: '100%' }} />
            </div>
        </div>
    );
}

export default function ActivationModal({ machineId, isActivating, progress, error, onActivate, onActivateWithMasterPassword, onClose, canActivate }: ActivationModalProps) {
    const [licenseCode, setLicenseCode] = useState('');
    const [masterPassword, setMasterPassword] = useState('');
    const [authorMode, setAuthorMode] = useState(false);

    // 激活进行中不允许关闭，避免中断解密导入
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isActivating) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isActivating, onClose]);

    const handleSubmit = () => {
        if (isActivating) return;
        if (authorMode) {
            const password = masterPassword.trim();
            if (password) onActivateWithMasterPassword(password);
        } else {
            const normalized = licenseCode.trim().replace(/\s+/g, '');
            if (normalized) onActivate(normalized);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            onClick={(event) => {
                if (event.target === event.currentTarget && !isActivating) onClose();
            }}
        >
            <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                <div className="relative flex items-center gap-2.5 p-5 border-b border-border">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold font-serif text-foreground leading-tight">案例库激活</h2>
                        <p className="text-xs text-muted-foreground">离线加密案例库 · 一机一码专属授权</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isActivating}
                        aria-label="关闭"
                        className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {canActivate ? (
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Lock className="w-3 h-3" />
                                本机设备识别码
                            </label>
                            <MachineIdCard machineId={machineId} />
                            <p className="text-xs text-muted-foreground">请将此码发送给作者换取专属激活码</p>
                        </div>
                    ) : (
                        <p className="text-xs leading-relaxed text-warning bg-warning/10 border border-warning/20 rounded-md px-3 py-2">
                            离线加密案例库仅在 Orbis 桌面端与移动端应用中激活，当前浏览器环境无法读取本机设备识别码。试读内容不受影响。
                        </p>
                    )}

                    {authorMode ? (
                        <div className="space-y-1.5">
                            <label htmlFor="master-password" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <KeyRound className="w-3 h-3" />
                                作者管理密码
                            </label>
                            <input
                                id="master-password"
                                type="password"
                                value={masterPassword}
                                onChange={(event) => setMasterPassword(event.target.value)}
                                placeholder="输入作者管理密码"
                                autoComplete="off"
                                disabled={isActivating}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 disabled:opacity-60"
                            />
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <label htmlFor="activation-code" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <KeyRound className="w-3 h-3" />
                                激活码
                            </label>
                            <textarea
                                id="activation-code"
                                value={licenseCode}
                                onChange={(event) => setLicenseCode(event.target.value)}
                                onBlur={(event) => setLicenseCode(event.target.value.trim().replace(/\s+/g, ''))}
                                placeholder="粘贴作者提供的激活码（ACT-...）"
                                rows={3}
                                disabled={isActivating}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none disabled:opacity-60"
                            />
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</p>
                    )}

                    {isActivating && progress ? (
                        <ProgressSection progress={progress} />
                    ) : (
                        <div className="flex items-stretch gap-2">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isActivating || !canActivate || (authorMode ? !masterPassword.trim() : !licenseCode.trim())}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Lock className="w-4 h-4" />
                                {authorMode ? '验证密码并解锁' : '激活并解锁本地案例库'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAuthorMode((previous) => !previous); setLicenseCode(''); setMasterPassword(''); }}
                                disabled={isActivating}
                                className="shrink-0 inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <KeyRound className="w-3.5 h-3.5" />
                                {authorMode ? '返回激活码激活' : '作者激活'}
                            </button>
                        </div>
                    )}

                    <div className="border-t border-border/70 pt-3">
                        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                            激活后案例正文将以本机专属密钥加密保存，离线秒开、无需联网。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
