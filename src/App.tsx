/**
 * App.tsx - 应用入口
 * 包含路由、布局配置和认证提供者
 */
import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { BaziProvider, useBaziContext } from './contexts/BaziContext';
import Navbar from './components/Layout/Navbar';
import MainLayout from './components/Layout/MainLayout';
import CaseList from './components/Common/CaseList';
import InsightPanel from './components/Common/InsightPanel';
import GanZhiLiuYiPanel from './components/Common/GanZhiLiuYiPanel';
import PlaceholderChart from './components/Common/PlaceholderChart';
import BaziPage from './components/Modules/Bazi/BaziPage';
import QimenPage from './components/Modules/Qimen/QimenPage';
import AuthModal from './components/Auth/AuthModal';
import CaseLibraryModal from './components/Common/CaseLibraryModal';
import { useInsightContent } from './hooks/useInsightContent';
import { useGanZhiLiuYi } from './hooks/useGanZhiLiuYi';
import type { ChartType } from './types';
import { INSIGHT_BOOKS, DEFAULT_BOOK_ID } from './data/booksConfig';

function AppContent() {
  const [activeChart, setActiveChart] = useState<ChartType>('bazi');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCaseLibraryModal, setShowCaseLibraryModal] = useState(false);
  // 默认选中的经典书籍 ID
  const [activeBookId, setActiveBookId] = useState<string>(DEFAULT_BOOK_ID);
  // 使用 Context 获取八字状态
  const bazi = useBaziContext();

  // 根据当前模块决定是否显示侧边栏（奇门模块有自己的布局）
  const showSidebar = activeChart === 'bazi';
  const showInsights = activeChart === 'bazi';

  // 切换到八字时初始化数据
  useEffect(() => {
    if (activeChart === 'bazi') {
      bazi.initializeBazi();
    }
  }, [activeChart]);

  const handleLoginClick = () => {
    setShowAuthModal(true);
  };

  // 使用提取的 Hook 计算干支留意数据
  const ganZhiLiuYiData = useGanZhiLiuYi({
    baziData: bazi.baziData,
    selectedDaYunIndex: bazi.selectedDaYunIndex,
    selectedLiuNianYear: bazi.selectedLiuNianYear,
  });

  // 使用提取的 Hook 计算智能咨询参考内容
  const insightContent = useInsightContent({
    baziData: bazi.baziData,
    activeBookId,
  });

  // 渲染主内容区域
  const renderMainContent = () => {
    switch (activeChart) {
      case 'bazi':
        return <BaziPage />;
      case 'qimen':
        // 奇门模块使用独立的三栏布局，直接返回
        return <QimenPage />;
      default:
        return <PlaceholderChart chart={activeChart} />;
    }
  };

  // 奇门模块使用独立布局
  if (activeChart === 'qimen') {
    return (
      <div className="h-screen overflow-hidden bg-background flex flex-col">
        <Navbar
          activeChart={activeChart}
          onChartChange={setActiveChart}
          onLoginClick={handleLoginClick}
        />
        {renderMainContent()}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
            onOpenLibrary={() => setShowCaseLibraryModal(true)}
          />
        ) : undefined}
        liuYiPanel={showInsights ? <GanZhiLiuYiPanel data={ganZhiLiuYiData} /> : undefined}
        insightPanel={
          showInsights ? (
            <InsightPanel
              books={INSIGHT_BOOKS}
              activeBook={activeBookId}
              onBookChange={setActiveBookId}
              content={insightContent}
            />
          ) : undefined
        }
      >
        {renderMainContent()}
      </MainLayout>

      {/* 登录/注册 Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* 案例库弹窗 */}
      <CaseLibraryModal
        isOpen={showCaseLibraryModal}
        onClose={() => setShowCaseLibraryModal(false)}
        selectedCaseId={bazi.selectedCaseId}
        onSelectCase={bazi.handleSelectCase}
        onLoginClick={handleLoginClick}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BaziProvider>
        <AppContent />
      </BaziProvider>
    </AuthProvider>
  );
}

export default App;
