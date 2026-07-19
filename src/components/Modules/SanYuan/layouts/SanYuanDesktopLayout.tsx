import SanYuanChart from '../components/SanYuanChart';
import SanYuanCaseList from '../components/SanYuanCaseList';
import SanYuanInfoBar from '../components/SanYuanInfoBar';
import SanYuanPalaceDetail from '../components/SanYuanPalaceDetail';
import type { SanYuanState } from '../hooks/useSanYuanState';

interface SanYuanDesktopLayoutProps {
    state: SanYuanState;
}

export default function SanYuanDesktopLayout({ state }: SanYuanDesktopLayoutProps) {
    return (
        <>
            {/* 左侧案例列表 */}
            <div className="w-72 xl:w-80 2xl:w-96 h-full flex-shrink-0 overflow-hidden">
                <SanYuanCaseList
                    chartInput={state.chart.input}
                    selectedCaseId={state.selectedCaseId}
                    onSelectCase={state.selectCase}
                    onClearSelectedCase={state.clearSelectedCase}
                />
            </div>

            {/* 中间盘面 */}
            <main className="flex-1 min-h-0 min-w-0 flex flex-col p-4 relative overflow-y-auto">
                <div className="w-full max-w-4xl mx-auto flex flex-col pt-4 pb-8 min-h-full">
                    <SanYuanInfoBar state={state} />
                    <div className="flex-1 min-h-0 flex items-center justify-center">
                        <SanYuanChart
                            chart={state.chart}
                            selectedPalace={state.selectedPalace}
                            onSelectPalace={state.setSelectedPalace}
                        />
                    </div>
                </div>
            </main>

            {/* 右侧详情 */}
            <div className="w-72 xl:w-80 2xl:w-96 flex-shrink-0 min-h-0 overflow-hidden flex flex-col border-l border-border/50 bg-card/30">
                <SanYuanPalaceDetail chart={state.chart} selectedPalace={state.selectedPalace} />
            </div>
        </>
    );
}
