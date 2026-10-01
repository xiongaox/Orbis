/**
 * 模块定位：
 * - 主要目标：管理员版专用的应用内激活码签发面板
 *
 * 关键职责：
 * - 输入用户机器识别码 + 管理密码，调用 Rust 层解封私钥并签发激活码
 * - 展示激活码并支持一键复制
*/

import { Check, Copy, KeyRound, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { publicCaseLibraryService } from '../../services/publicCaseLibraryService';

interface SignerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SignerModal({ isOpen, onClose }: SignerModalProps) {
    const [machineId, setMachineId] = useState('');
    const [unlockPassword, setUnlockPassword] = useState('');
    const [signedCode, setSignedCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setSignedCode(null);
            setError(null);
            setCopied(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!copied) return;
        const timer = window.setTimeout(() => setCopied(false), 1600);
        return () => window.clearTimeout(timer);
    }, [copied]);

    if (!isOpen) return null;

    const handleSign = async () => {
        const normalizedMachineId = machineId.trim().toUpperCase();
        if (!normalizedMachineId || !unlockPassword || isSigning) return;
        setIsSigning(true);
        setError(null);
        setSignedCode(null);
        try {
            const code = await publicCaseLibraryService.signActivationCode(normalizedMachineId, unlockPassword);
            setSignedCode(code);
        } catch (cause: unknown) {
            setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
            setIsSigning(false);
        }
    };

    const handleCopy = async () => {
        if (!signedCode) return;
        try {
            await navigator.clipboard.writeText(signedCode);
            setCopied(true);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = signedCode;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-primary shrink-0" />
                        <h2 className="text-lg font-semibold text-foreground">签发激活码</h2>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="关闭">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="signer-machine-id" className="text-xs font-medium text-muted-foreground">用户机器识别码</label>
                        <input
                            id="signer-machine-id"
                            value={machineId}
                            onChange={(event) => setMachineId(event.target.value)}
                            onBlur={(event) => setMachineId(event.target.value.trim().toUpperCase())}
                            placeholder="ORBIS-XXXX-XXXX-XXXX"
                            autoComplete="off"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm tracking-wider text-foreground placeholder:text-muted-foreground/60"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="signer-password" className="text-xs font-medium text-muted-foreground">管理密码</label>
                        <input
                            id="signer-password"
                            type="password"
                            value={unlockPassword}
                            onChange={(event) => setUnlockPassword(event.target.value)}
                            placeholder="输入管理密码解封签发密钥"
                            autoComplete="off"
                            onKeyDown={(event) => { if (event.key === 'Enter') void handleSign(); }}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60"
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</p>
                    )}

                    {signedCode ? (
                        <div className="space-y-2">
                            <div className="bg-muted/30 border border-border rounded-lg px-3 py-2.5 flex items-start justify-between gap-2">
                                <span className="font-mono text-xs leading-relaxed break-all text-foreground select-all">{signedCode}</span>
                                <button
                                    type="button"
                                    onClick={() => void handleCopy()}
                                    className="shrink-0 inline-flex items-center gap-1.5 text-xs rounded-md border border-border bg-card px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? '已复制' : '复制'}
                                </button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">把激活码发给用户，对方在激活弹窗粘贴即可完成激活。</p>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void handleSign()}
                            disabled={!machineId.trim() || !unlockPassword || isSigning}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                            {isSigning ? '正在签发...' : '签发激活码'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
