/**
 * QimenDisplaySettings - 奇门盘面显示开关
 */
import { useState } from 'react';
import QimenGuideModal from './QimenGuideModal';

interface QimenDisplaySettingsProps {
    showChangSheng: boolean;
    showShiShen: boolean;
    showPalaceMeta: boolean;
    onToggleChangSheng?: () => void;
    onToggleShiShen?: () => void;
    onTogglePalaceMeta?: () => void;
    compact?: boolean;
    /** 打开盘面元素说明弹窗；弹窗实例由布局层持有并传入实时宫位数据，不传时回退内置静态示例弹窗 */
    onOpenGuide?: () => void;
}

export default function QimenDisplaySettings({
    showChangSheng,
    showShiShen,
    showPalaceMeta,
    onToggleChangSheng,
    onToggleShiShen,
    onTogglePalaceMeta,
    compact = false,
    onOpenGuide,
}: QimenDisplaySettingsProps) {
    // 兜底弹窗（无 onOpenGuide 时使用，展示乾宫静态示例）
    const [guideOpen, setGuideOpen] = useState(false);

    return (
        <>
            <div className={`grid grid-cols-4 ${compact ? 'gap-1' : 'gap-2'}`}>
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
                <button
                    type="button"
                    onClick={onOpenGuide ?? (() => setGuideOpen(true))}
                    className={`${compact ? 'py-1' : 'py-1.5'} rounded-lg text-sm font-serif text-center transition-all border bg-secondary/50 text-muted-foreground border-border hover:bg-muted/30 hover:text-foreground`}
                >
                    说明
                </button>
            </div>
            {!onOpenGuide && (
                <QimenGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
            )}
        </>
    );
}
