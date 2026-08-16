/**
 * App - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载前端具体功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default App`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `AuthContext`、内部模块 `BaziContext` 等 20 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState, useEffect, useMemo } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { BaziProvider } from './contexts/BaziContext';
import { useBaziContext } from './contexts/useBaziContext';
import Navbar from './components/Layout/Navbar';
import MainLayout from './components/Layout/MainLayout';
import BaziCaseList from './components/Modules/Bazi/BaziCaseList';
import InsightPanel from './components/Modules/Bazi/InsightPanel';
import GanZhiLiuYiPanel from './components/Modules/Bazi/GanZhiLiuYiPanel';
import PlaceholderChart from './components/Common/PlaceholderChart';
import BaziPage from './components/Modules/Bazi/BaziPage';
import QimenPage from './components/Modules/Qimen/QimenPage';
import WannianliPage from './components/Modules/Wannianli/WannianliPage';
import SanYuanPage from './components/Modules/SanYuan/SanYuanPage';
import CaseStudyPage from './components/Modules/CaseStudy/CaseStudyPage';
import AuthModal from './components/Auth/AuthModal';
import BaziCaseLibraryModal from './components/Modules/Bazi/BaziCaseLibraryModal';
import { useInsightContent } from './hooks/useInsightContent';
import { useGanZhiLiuYi } from './hooks/useGanZhiLiuYi';
import type { ChartType } from './types';
import { INSIGHT_BOOKS, DEFAULT_BOOK_ID } from './data/booksConfig';

function AppContent() {
  const [activeChart, setActiveChart] = useState<ChartType>('wannianli');
  const [lockedCharts, setLockedCharts] = useState<ChartType[]>(() => {
    try {
      const stored = localStorage.getItem('orbis_locked_charts');
      return stored ? JSON.parse(stored) as ChartType[] : [];
    } catch {
      return [];
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCaseLibraryModal, setShowCaseLibraryModal] = useState(false);
  // 默认选中的经典书籍 ID
  const [activeBookId, setActiveBookId] = useState<string>(DEFAULT_BOOK_ID);
  // 使用 Context 获取八字状态
  const bazi = useBaziContext();
  const initializeBazi = bazi.initializeBazi;

  // 切换到八字时初始化数据
  useEffect(() => {
    if (activeChart === 'bazi') {
      initializeBazi();
    }
  }, [activeChart, initializeBazi]);

  useEffect(() => {
    localStorage.setItem('orbis_locked_charts', JSON.stringify(lockedCharts));
  }, [lockedCharts]);

  const handleLoginClick = () => {
    setShowAuthModal(true);
  };

  const handleToggleChartLock = (chart: ChartType) => {
    setLockedCharts((current) => (
      current.includes(chart)
        ? current.filter((lockedChart) => lockedChart !== chart)
        : [...current, chart]
    ));
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
  const mountedCharts = useMemo(
    () => Array.from(new Set([...lockedCharts, activeChart])),
    [activeChart, lockedCharts],
  );

  const renderContent = (chart: ChartType) => {
    switch (chart) {
      case 'qimen':
        return <QimenPage />;
      case 'xiaoliuren':
        return <CaseStudyPage />;
      case 'wannianli':
        return <WannianliPage />;
      case 'sanyuan':
        return <SanYuanPage />;
      case 'bazi':
        return (
          <MainLayout
            sidebar={(
              <BaziCaseList
                selectedCaseId={bazi.selectedCaseId}
                onSelectCase={bazi.handleSelectCase}
                onLoginClick={handleLoginClick}
                onOpenLibrary={() => setShowCaseLibraryModal(true)}
                onPreviewCase={bazi.handleSetTransientCase}
              />
            )}
            liuYiPanel={<GanZhiLiuYiPanel data={ganZhiLiuYiData} />}
            insightPanel={
              <InsightPanel
                books={INSIGHT_BOOKS}
                activeBook={activeBookId}
                onBookChange={setActiveBookId}
                content={insightContent}
              />
            }
          >
            <BaziPage />
          </MainLayout>
        );
      default:
        return (
          <MainLayout
            sidebar={undefined}
          >
            <PlaceholderChart chart={chart} />
          </MainLayout>
        );
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col">
      <Navbar
        activeChart={activeChart}
        onChartChange={setActiveChart}
        lockedCharts={lockedCharts}
        onToggleChartLock={handleToggleChartLock}
        onLoginClick={handleLoginClick}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative flex flex-col">
        {mountedCharts.map((chart) => (
          <div
            key={chart}
            className={chart === activeChart ? 'flex flex-1 min-h-0 min-w-0 overflow-hidden' : 'hidden'}
            aria-hidden={chart !== activeChart}
          >
            {renderContent(chart)}
          </div>
        ))}
      </div>

      {/* 登录/注册 Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* 案例库弹窗 (仅在 MainLayout 模式下使用，虽在此处全局渲染但仅由 CaseList 触发) */}
      <BaziCaseLibraryModal
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
