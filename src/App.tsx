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
import WannianliPage from './components/Modules/Wannianli/WannianliPage';
import CaseStudyPage from './components/Modules/CaseStudy/CaseStudyPage';
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
  const renderContent = () => {
    switch (activeChart) {
      case 'qimen':
        return <QimenPage />;
      case 'xiaoliuren':
        return <CaseStudyPage />;
      case 'wannianli':
        return <WannianliPage />;
      case 'bazi':
        return (
          <MainLayout
            sidebar={showSidebar ? (
              <CaseList
                selectedCaseId={bazi.selectedCaseId}
                onSelectCase={bazi.handleSelectCase}
                onLoginClick={handleLoginClick}
                onOpenLibrary={() => setShowCaseLibraryModal(true)}
                onPreviewCase={bazi.handleSetTransientCase}
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
            <BaziPage />
          </MainLayout>
        );
      default:
        return (
          <MainLayout
            sidebar={showSidebar ? (
              <CaseList
                selectedCaseId={bazi.selectedCaseId}
                onSelectCase={bazi.handleSelectCase}
                onLoginClick={handleLoginClick}
                onOpenLibrary={() => setShowCaseLibraryModal(true)}
              />
            ) : undefined}
          >
            <PlaceholderChart chart={activeChart} />
          </MainLayout>
        );
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col">
      <Navbar
        activeChart={activeChart}
        onChartChange={setActiveChart}
        onLoginClick={handleLoginClick}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative flex flex-col">
        {renderContent()}
      </div>

      {/* 登录/注册 Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* 案例库弹窗 (仅在 MainLayout 模式下使用，虽在此处全局渲染但仅由 CaseList 触发) */}
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
