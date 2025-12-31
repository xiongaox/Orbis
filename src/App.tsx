/**
 * App.tsx - 应用入口
 * 仅包含路由和布局配置
 */
import { useState, useEffect } from 'react';
import Navbar from './components/Layout/Navbar';
import MainLayout from './components/Layout/MainLayout';
import CaseList from './components/Common/CaseList';
import InsightPanel from './components/Common/InsightPanel';
import PlaceholderChart from './components/Common/PlaceholderChart';
import BaziPage from './components/Modules/Bazi/BaziPage';
import { useBazi } from './hooks/useBazi';
import type { ChartType } from './types';

function App() {
  const [activeChart, setActiveChart] = useState<ChartType>('bazi');
  const bazi = useBazi();

  // 根据当前模块决定是否显示侧边栏
  const showSidebar = activeChart !== 'wannianli';
  const showInsights = activeChart !== 'wannianli';

  // 切换到八字时初始化数据
  useEffect(() => {
    if (activeChart === 'bazi') {
      bazi.initializeBazi();
    }
  }, [activeChart]);

  return (
    <div className="min-h-screen bg-background bg-noise flex flex-col">
      <Navbar activeChart={activeChart} onChartChange={setActiveChart} />
      <MainLayout
        sidebar={showSidebar ? <CaseList selectedCaseId={bazi.selectedCaseId} onSelectCase={bazi.handleSelectCase} /> : undefined}
        insightPanel={showInsights ? <InsightPanel /> : undefined}
      >
        {activeChart === 'bazi' ? (
          <BaziPage
            selectedCase={bazi.selectedCase}
            baziData={bazi.baziData}
            loading={bazi.loading}
            error={bazi.error}
            selectedDaYunIndex={bazi.selectedDaYunIndex}
            selectedLiuNianYear={bazi.selectedLiuNianYear}
            setSelectedDaYunIndex={bazi.setSelectedDaYunIndex}
            setSelectedLiuNianYear={bazi.setSelectedLiuNianYear}
          />
        ) : (
          <PlaceholderChart chart={activeChart} />
        )}
      </MainLayout>
    </div>
  );
}

export default App;
