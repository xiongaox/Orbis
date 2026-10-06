import { useState } from 'react';
import QimenChart from '../../Qimen/QimenChart';
import type { PaiPanMethod, QimenResult } from '../../../../lib/csp-qimen/qimenService';
import type { GlobalPattern } from '../../../../lib/csp-qimen/patternDetector';

/**
 * 案例学习排盘面板：直接复用奇门模块的 QimenChart / QimenHeader / PalaceCell，
 * 仅做案例场景的裁剪——
 * - 不传 onResetToNow / onOpenDatePicker / onPrevHour / onNextHour / onOpenAiModal，
 *   顶部「现在 / 重新选择 / 上一局 / 下一局 / AI 提示」按需渲染规则下自动隐藏；
 * - 盘面为只读展示：不选中宫位、不接长按宫位详情；
 * - 长生 / 十神展示切换（互斥，默认长生开）：经 headerActions 插槽置于顶栏
 *   第三行右侧——案例盘无上一局/下一局按钮，该位置空闲，与原案例排盘布局一致。
 */
interface CaseStudyQimenChartProps {
    palaces: QimenResult['palaces'];
    header: QimenResult['header'];
    method?: PaiPanMethod;
    onMethodChange?: (method: PaiPanMethod) => void;
    onJuClick?: () => void;
    globalPatterns?: GlobalPattern[];
    onPatternClick?: (pattern: GlobalPattern) => void;
    isMobile?: boolean;
}

export default function CaseStudyQimenChart({
    palaces,
    header,
    method = 'zhirun',
    onMethodChange,
    onJuClick,
    globalPatterns = [],
    onPatternClick,
    isMobile = false,
}: CaseStudyQimenChartProps) {
    // 长生/十神互斥切换（默认长生开、十神关，与原案例排盘默认一致）
    const [showChangSheng, setShowChangSheng] = useState(true);
    const [showShiShen, setShowShiShen] = useState(false);

    const handleToggleChangSheng = () => {
        if (showChangSheng) { setShowChangSheng(false); return; }
        setShowChangSheng(true);
        setShowShiShen(false);
    };

    const handleToggleShiShen = () => {
        if (showShiShen) { setShowShiShen(false); return; }
        setShowShiShen(true);
        setShowChangSheng(false);
    };

    const headerActions = (
        <>
            <button
                type="button"
                onClick={handleToggleChangSheng}
                className={`px-2.5 2xl:px-3.5 py-1 rounded-lg border text-xs 2xl:text-sm font-serif transition-colors ${showChangSheng ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/10'}`}
            >
                长生
            </button>
            <button
                type="button"
                onClick={handleToggleShiShen}
                className={`px-2.5 2xl:px-3.5 py-1 rounded-lg border text-xs 2xl:text-sm font-serif transition-colors ${showShiShen ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/10'}`}
            >
                十神
            </button>
        </>
    );

    return (
        <QimenChart
            palaces={palaces}
            header={header}
            selectedPalace={null}
            onSelectPalace={() => { }}
            method={method}
            onMethodChange={onMethodChange}
            onJuClick={onJuClick}
            globalPatterns={globalPatterns}
            onPatternClick={onPatternClick}
            isMobileLayout={isMobile}
            controlledShowChangSheng={showChangSheng}
            controlledShowShiShen={showShiShen}
            headerActions={headerActions}
        />
    );
}
