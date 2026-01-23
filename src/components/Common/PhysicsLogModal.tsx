import { X, Info, Shield, AlertTriangle, Flame, Droplets, Wind, Sparkles, Mountain } from 'lucide-react';
import { useMemo } from 'react';

interface PhysicsLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: string[];
    title?: string;
    description?: string; // 原 baziPattern，现改为通用描述
    highlightColor?: string; // 传入的颜色类名
}

export default function PhysicsLogModal({
    isOpen,
    onClose,
    logs,
    title = "旺衰物理逻辑日志",
    description,
    highlightColor = ""
}: PhysicsLogModalProps) {
    if (!isOpen) return null;

    // 解析日志条目，返回带有样式属性的对象
    const parseLog = (log: string) => {
        let theme = 'default';
        let icon = <Info className="w-4 h-4" />;
        let content = log;

        if (log.includes('⚠️')) {
            theme = 'warning';
            icon = <AlertTriangle className="w-4 h-4 text-orange-500" />;
            content = log.replace('⚠️', '').trim();
        } else if (log.includes('🛡️')) {
            theme = 'defense';
            icon = <Shield className="w-4 h-4 text-emerald-500" />;
            content = log.replace('🛡️', '').trim();
        } else if (log.includes('✨')) {
            theme = 'success';
            icon = <Sparkles className="w-4 h-4 text-amber-500" />;
            content = log.replace('✨', '').trim();
        } else if (log.includes('🔥') || log.includes('火')) { // 略宽泛，优先匹配Emoji
            if (log.includes('🔥')) {
                theme = 'fire';
                icon = <Flame className="w-4 h-4 text-red-500" />;
                content = log.replace('🔥', '').trim();
            }
        }

        if (log.includes('💧')) {
            theme = 'water';
            icon = <Droplets className="w-4 h-4 text-blue-500" />;
            content = log.replace('💧', '').trim();
        } else if (log.includes('🏜️') || log.includes('⛰️')) {
            theme = 'earth';
            icon = <Mountain className="w-4 h-4 text-stone-500" />;
            content = log.replace('🏜️', '').replace('⛰️', '').trim();
        } else if (log.includes('🌪️') || log.includes('💨')) {
            theme = 'wood';
            icon = <Wind className="w-4 h-4 text-green-500" />;
            content = log.replace('🌪️', '').replace('💨', '').trim();
        } else if (log.includes('🔀')) { // 冲
            theme = 'clash';
            // icon remains default or maybe something else
            content = log.replace('🔀', '').trim();
        }

        return { theme, icon, content, original: log };
    };

    const parsedLogs = useMemo(() => logs.map(parseLog), [logs]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-500" />
                            {title}
                        </h3>
                        {description && (
                            <p className="text-sm text-muted-foreground mt-1">
                                当前判定：<span className={`font-medium ${highlightColor || 'text-foreground'}`}>{description}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-4 space-y-3">
                    {parsedLogs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            暂无物理逻辑日志
                        </div>
                    ) : (
                        parsedLogs.map((item, idx) => (
                            <div
                                key={idx}
                                className={`
                                    flex items-start gap-3 p-3 rounded-lg border text-sm leading-relaxed
                                    ${item.theme === 'warning' ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800' : ''}
                                    ${item.theme === 'defense' ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' : ''}
                                    ${item.theme === 'success' ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' : ''}
                                    ${item.theme === 'fire' ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800' : ''}
                                    ${item.theme === 'water' ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' : ''}
                                    ${item.theme === 'earth' ? 'bg-stone-50/50 border-stone-200 dark:bg-stone-950/20 dark:border-stone-800' : ''}
                                    ${item.theme === 'default' ? 'bg-muted/30 border-border' : ''}
                                `}
                            >
                                <div className="mt-0.5 shrink-0 select-none">
                                    {item.icon}
                                </div>
                                <div className="text-foreground/90">
                                    {item.content}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-border bg-muted/30 text-xs text-muted-foreground text-center">
                    以上逻辑基于 V35 物理模拟引擎分析生成
                </div>
            </div>
        </div>
    );
}
