import { useState, useEffect, useMemo, useCallback } from 'react';
import { BaziProvider, useBaziContext } from './contexts/BaziContext';
import { MobileNavProvider, useMobileNavRegistry } from './contexts/MobileNavContext';
import Navbar from './components/Layout/Navbar';
import MainLayout from './components/Layout/MainLayout';
import MobileTabBar from './components/Layout/MobileTabBar';
import MobileProfileCenter from './components/Layout/MobileProfileCenter';
import BaziCaseList from './components/Modules/Bazi/BaziCaseList';
import InsightPanel from './components/Modules/Bazi/InsightPanel';
import GanZhiLiuYiPanel from './components/Modules/Bazi/GanZhiLiuYiPanel';
import PlaceholderChart from './components/Common/PlaceholderChart';
import BaziPage from './components/Modules/Bazi/BaziPage';
import QimenPage from './components/Modules/Qimen/QimenPage';
import WannianliPage from './components/Modules/Wannianli/WannianliPage';
import SanYuanPage from './components/Modules/SanYuan/SanYuanPage';
import CaseStudyPage from './components/Modules/CaseStudy/CaseStudyPage';
import BaziCaseLibraryModal from './components/Modules/Bazi/BaziCaseLibraryModal';
import { useLayoutMode } from './hooks/useLayoutMode';
import { useInsightContent } from './hooks/useInsightContent';
import { useGanZhiLiuYi } from './hooks/useGanZhiLiuYi';
import type { ChartType } from './types';
import { INSIGHT_BOOKS, DEFAULT_BOOK_ID } from './data/booksConfig';
import { MOBILE_NAV_HOME_CHART, readMobileNavSlots, writeMobileNavSlots } from './lib/mobileNavStorage';
import {
  LOCKED_CHARTS_STORAGE_KEY,
  LOCKED_CHART_SNAPSHOTS_STORAGE_KEY,
  readLockedCharts,
  readLockedChartSnapshots,
  writeLockedCharts,
  writeLockedChartSnapshots,
  type LockedChartSnapshots,
  type QimenLockedSnapshot,
} from './lib/lockedChartStorage';

function AppShell() {
  const [activeChart, setActiveChart] = useState<ChartType>('wannianli');
  const [lockedCharts, setLockedCharts] = useState<ChartType[]>(readLockedCharts);
  const [lockedSnapshots, setLockedSnapshots] = useState<LockedChartSnapshots>(readLockedChartSnapshots);
  const [qimenLiveSnapshot, setQimenLiveSnapshot] = useState<QimenLockedSnapshot | null>(null);
  const [showCaseLibraryModal, setShowCaseLibraryModal] = useState(false);
  // 移动端底部导航：可换槽位（首页万年通历固定）与个人中心页开关
  const { isMobile } = useLayoutMode();
  const [navSlots, setNavSlots] = useState<ChartType[]>(readMobileNavSlots);
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  // 案例学习分类直达意图（个人中心「案例 / 断法」入口）；seq 供重复触发同一分类
  const [caseStudyIntent, setCaseStudyIntent] = useState<{ category: string; seq: number } | null>(null);
  // 案例学习是否从个人中心进入：案例分类弹层的返回按钮据此回个人中心
  const [caseStudyFromProfile, setCaseStudyFromProfile] = useState(false);
  const mobileDrawerRegistry = useMobileNavRegistry();
  const activeDrawers = mobileDrawerRegistry[activeChart];

  const handleOpenCaseStudyCategory = useCallback((category?: string) => {
    if (category) setCaseStudyIntent({ category, seq: Date.now() });
    setCaseStudyFromProfile(true);
    setShowMobileProfile(false);
    setActiveChart('xiaoliuren');
  }, []);
  // 默认选中的经典书籍 ID
  const [activeBookId, setActiveBookId] = useState<string>(DEFAULT_BOOK_ID);
  // 使用 Context 获取八字状态
  const bazi = useBaziContext();
  const initializeBazi = bazi.initializeBazi;
  const restoreBaziLockedSnapshot = bazi.restoreLockedSnapshot;
  const baziIsLocked = lockedCharts.includes('bazi');
  const qimenSnapshot = lockedSnapshots.qimen;

  useEffect(() => {
    if (baziIsLocked && lockedSnapshots.bazi) {
      restoreBaziLockedSnapshot(lockedSnapshots.bazi);
    }
  }, [baziIsLocked, restoreBaziLockedSnapshot, lockedSnapshots.bazi]);

  // 切换到八字时初始化数据
  useEffect(() => {
    if (activeChart === 'bazi') {
      initializeBazi();
    }
  }, [activeChart, initializeBazi]);

  useEffect(() => {
    writeLockedChartSnapshots(lockedSnapshots);
  }, [lockedSnapshots]);

  useEffect(() => {
    writeLockedCharts(lockedCharts);
  }, [lockedCharts]);

  useEffect(() => {
    writeMobileNavSlots(navSlots);
  }, [navSlots]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;

      if (event.key === LOCKED_CHARTS_STORAGE_KEY) {
        setLockedCharts(readLockedCharts());
      }

      if (event.key === LOCKED_CHART_SNAPSHOTS_STORAGE_KEY) {
        setLockedSnapshots(readLockedChartSnapshots());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleQimenSnapshotChange = useCallback((snapshot: QimenLockedSnapshot) => {
    setQimenLiveSnapshot(snapshot);
  }, []);

  const handleToggleChartLock = (chart: ChartType) => {
    const isLocked = lockedCharts.includes(chart);

    if (isLocked) {
      setLockedCharts((current) => current.filter((lockedChart) => lockedChart !== chart));
      setLockedSnapshots((current) => {
        const next = { ...current };
        delete next[chart as keyof LockedChartSnapshots];
        return next;
      });
      return;
    }

    if (chart === 'bazi') {
      setLockedSnapshots((current) => ({
        ...current,
        bazi: bazi.getLockedSnapshot(),
      }));
    }

    if (chart === 'qimen') {
      setLockedSnapshots((current) => ({
        ...current,
        qimen: {
          version: 1,
          capturedAt: new Date().toISOString(),
          selectedCaseId: qimenLiveSnapshot?.selectedCaseId ?? null,
          currentCase: qimenLiveSnapshot?.currentCase ?? null,
          selectedDate: qimenLiveSnapshot?.selectedDate ?? new Date().toISOString(),
          paiPanMethod: qimenLiveSnapshot?.paiPanMethod ?? 'zhirun',
          customJu: qimenLiveSnapshot?.customJu ?? 0,
        },
      }));
    }

    setLockedCharts((current) => [...current, chart]);
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

  // 万年历"去排盘"：以面板当前选中日期起盘（男命临时盘，不入案例库）；
  // 八字处于锁定盘时保持锁定状态不动，仅切换过去。
  const handleWannianliGoPaiPan = (date: Date) => {
    if (!baziIsLocked) {
      bazi.handleSetTransientCase({
        id: 'wannianli-paipan',
        name: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        gender: 'male',
        birth_date: date.toISOString(),
        created_at: new Date().toISOString(),
      });
    }
    setActiveChart('bazi');
  };

  // 渲染主内容区域
  const mountedCharts = useMemo(
    () => Array.from(new Set([...lockedCharts, activeChart])),
    [activeChart, lockedCharts],
  );

  const renderContent = (chart: ChartType) => {
    switch (chart) {
      case 'qimen':
        return (
          <QimenPage
            key={qimenSnapshot?.capturedAt ?? 'unlocked'}
            lockedSnapshot={qimenSnapshot}
            onSnapshotChange={handleQimenSnapshotChange}
          />
        );
      case 'xiaoliuren':
        return <CaseStudyPage categoryIntent={caseStudyIntent} />;
      case 'wannianli':
        return <WannianliPage onGoPaiPan={handleWannianliGoPaiPan} />;
      case 'sanyuan':
        return <SanYuanPage />;
      case 'bazi':
        return (
          <MainLayout
            chart="bazi"
            sidebar={(
              <BaziCaseList
                selectedCaseId={bazi.selectedCaseId}
                onSelectCase={bazi.handleSelectCase}
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
    // 系统栏安全区：--safe-area-inset-* 由 Android 端原生注入（见 MainActivity.kt），
    // 桌面端与浏览器端未定义，退化为 0。根节点自带 bg-background，而背景会填满
    // padding 区域，所以状态栏那条仍是应用底色（随主题），交互内容则被顶到系统栏下方。
    <div
      className="h-screen w-screen overflow-hidden bg-background flex flex-col"
      style={{
        paddingTop: 'var(--safe-area-inset-top, 0px)',
        paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
      }}
    >
      <Navbar
        activeChart={activeChart}
        onChartChange={setActiveChart}
        lockedCharts={lockedCharts}
        onToggleChartLock={handleToggleChartLock}
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

        {/* 移动端个人中心：覆盖内容区，底栏保持可见（L1 主菜单层，个人中心高亮） */}
        {isMobile && showMobileProfile && (
          <div className="absolute inset-0 z-40 bg-background">
            <MobileProfileCenter
              slots={navSlots}
              onSlotsChange={setNavSlots}
              onOpenCaseStudy={handleOpenCaseStudyCategory}
              onGoHome={() => {
                setShowMobileProfile(false);
                setActiveChart(MOBILE_NAV_HOME_CHART);
              }}
            />
          </div>
        )}
      </div>

      {/* 移动端底部导航（方案 C · 极简文字墨栏）：主菜单层 / 模块上下文层 */}
      {isMobile && (
        <MobileTabBar
          activeChart={activeChart}
          profileOpen={showMobileProfile}
          slots={navSlots}
          drawers={activeDrawers}
          onSelectChart={(chart) => {
            // 从重选菜单网格进入的案例学习不属于个人中心来源
            setCaseStudyFromProfile(false);
            setShowMobileProfile(false);
            setActiveChart(chart);
          }}
          onOpenProfile={() => setShowMobileProfile(true)}
          onSelectCaseStudyCategory={handleOpenCaseStudyCategory}
          caseStudyFromProfile={caseStudyFromProfile}
        />
      )}

      {/* 案例库弹窗 (仅在 MainLayout 模式下使用，虽在此处全局渲染但仅由 CaseList 触发) */}
      <BaziCaseLibraryModal
        isOpen={showCaseLibraryModal}
        onClose={() => setShowCaseLibraryModal(false)}
        selectedCaseId={bazi.selectedCaseId}
        onSelectCase={bazi.handleSelectCase}
      />
    </div>
  );
}

function AppContent() {
  return (
    <MobileNavProvider>
      <AppShell />
    </MobileNavProvider>
  );
}

function App() {
  return (
    <BaziProvider>
      <AppContent />
    </BaziProvider>
  );
}

export default App;
