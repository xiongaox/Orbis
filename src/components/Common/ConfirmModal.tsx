import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    // 'destructive' renders the confirm button in red
    variant?: 'default' | 'destructive';
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = '确定',
    cancelText = '取消',
    loading = false,
    variant = 'default'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card max-w-sm animate-in zoom-in-95 fade-in duration-200">
                <div className="flex flex-col gap-4">
                    {/* Header with Icon */}
                    <div className="flex items-start gap-4">
                        {variant === 'destructive' && (
                            <div className="p-2 bg-red-100 dark:bg-destructive/20 rounded-full shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-500 dark:text-destructive" />
                            </div>
                        )}
                        <div className="flex-1 pt-1">
                            <h3 className="text-lg font-semibold text-foreground leading-none mb-2">
                                {title}
                            </h3>
                            {description && (
                                <div className="text-sm text-muted-foreground leading-relaxed">
                                    {description}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-border hover:bg-muted text-foreground"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm
                                ${variant === 'destructive'
                                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                }
                            `}
                        >
                            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
