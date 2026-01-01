/**
 * App.tsx - 应用入口
 * 包含路由、布局配置和认证提供者
 */
import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Layout/Navbar';
import MainLayout from './components/Layout/MainLayout';
import CaseList from './components/Common/CaseList';
import InsightPanel from './components/Common/InsightPanel';
import PlaceholderChart from './components/Common/PlaceholderChart';
import BaziPage from './components/Modules/Bazi/BaziPage';
import AuthModal from './components/Auth/AuthModal';
import { useBazi } from './hooks/useBazi';
import type { ChartType } from './types';

function AppContent() {
  const [activeChart, setActiveChart] = useState<ChartType>('bazi');
  const [showAuthModal, setShowAuthModal] = useState(false);
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

  const handleLoginClick = () => {
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-background bg-noise flex flex-col">
      <Navbar
        activeChart={activeChart}
        onChartChange={setActiveChart}
        onLoginClick={handleLoginClick}
      />
      <MainLayout
        sidebar={showSidebar ? (
          <CaseList
            selectedCaseId={bazi.selectedCaseId}
            onSelectCase={bazi.handleSelectCase}
            onLoginClick={handleLoginClick}
          />
        ) : undefined}
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

      {/* 登录/注册 Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
