/**
 * QimenDisplaySettings - 奇门盘面显示开关
 */

interface QimenDisplaySettingsProps {
    showChangSheng: boolean;
    showShiShen: boolean;
    showPalaceMeta: boolean;
    onToggleChangSheng?: () => void;
    onToggleShiShen?: () => void;
    onTogglePalaceMeta?: () => void;
    compact?: boolean;
}

export default function QimenDisplaySettings({
    showChangSheng,
    showShiShen,
    showPalaceMeta,
    onToggleChangSheng,
    onToggleShiShen,
    onTogglePalaceMeta,
    compact = false,
}: QimenDisplaySettingsProps) {
    return (
        <div className={`grid grid-cols-3 ${compact ? 'gap-1' : 'gap-2'}`}>
            {([
                { label: '长生', active: showChangSheng, onToggle: onToggleChangSheng },
                { label: '十神', active: showShiShen, onToggle: onToggleShiShen },
                { label: '宫位', active: showPalaceMeta, onToggle: onTogglePalaceMeta },
            ] as const).map((item) => (
                <button
                    key={item.label}
                    type="button"
                    onClick={item.onToggle}
                    className={`${compact ? 'py-1' : 'py-1.5'} rounded-lg text-sm font-serif text-center transition-all border ${
                        item.active
                            ? 'bg-primary/15 text-primary border-primary/40 font-medium'
                            : 'bg-secondary/50 text-muted-foreground border-border hover:bg-muted/30 hover:text-foreground'
                    }`}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
}
