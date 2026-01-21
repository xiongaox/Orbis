/**
 * 简化柱卡片组件 - 用于案例研究页面的八字展示
 */
import { getElementColor } from '../../../../lib/xuan-bazi/maps/baziStyleMap';
import type { SimplePillarCardProps } from '../../../../lib/caseStudy/types';

export default function SimplePillarCard({
    label, tiangan, dizhi, tianganShiShen, zanggan, diShi, ziZuo, kongWang, naYin, isDayMaster = false, genderLabel
}: SimplePillarCardProps) {
    return (
        <div className={`flex-1 flex flex-col border-r border-border/50 last:border-r-0 ${isDayMaster ? 'bg-primary/5' : ''}`}>
            {/* Label */}
            <div className="h-8 flex items-center justify-center border-b border-border/30 bg-muted/30">
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            {/* 十神 */}
            <div className="h-7 flex items-center justify-center border-b border-border/30">
                <span className="text-xs text-foreground/70">{tianganShiShen || genderLabel || ''}</span>
            </div>
            {/* 天干 */}
            <div className="h-12 flex items-center justify-center border-b border-border/30">
                <span className="text-2xl font-display font-semibold" style={{ color: getElementColor(tiangan) }}>
                    {tiangan}
                </span>
            </div>
            {/* 地支 */}
            <div className="h-12 flex items-center justify-center border-b border-border/30">
                <span className="text-2xl font-display font-semibold" style={{ color: getElementColor(dizhi) }}>
                    {dizhi}
                </span>
            </div>
            {/* 藏干 */}
            <div className="h-[75px] p-1.5 border-b border-border/30 flex flex-col justify-start gap-1">
                {zanggan.map((item, index) => (
                    <div key={`${item.gan}-${index}`} className="flex items-center justify-center gap-1 text-xs">
                        <span className="font-medium" style={{ color: getElementColor(item.gan) }}>
                            {item.gan}
                        </span>
                        <span className="text-muted-foreground text-xs">{item.shiShen}</span>
                    </div>
                ))}
            </div>
            {/* 星运 */}
            <div className="h-7 flex items-center justify-center border-b border-border/30">
                <span className="text-xs text-foreground/60">{diShi}</span>
            </div>
            {/* 自坐 */}
            <div className="h-7 flex items-center justify-center border-b border-border/30">
                <span className="text-xs text-foreground/60">{ziZuo}</span>
            </div>
            {/* 空亡 */}
            <div className="h-7 flex items-center justify-center border-b border-border/30">
                <span className="text-xs text-muted-foreground/70">{kongWang}</span>
            </div>
            {/* 纳音 */}
            <div className="h-7 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">{naYin}</span>
            </div>
        </div>
    );
}
