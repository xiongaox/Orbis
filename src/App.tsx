import { useState, useEffect, useMemo, useCallback } from 'react';
import { BaziProvider, useBaziContext } from './contexts/BaziContext';
import { MobileNavProvider, useMobileNavRegistry } from './contexts/MobileNavContext';
import { CasePrivacyProvider } from './contexts/CasePrivacyContext';
import Navbar from './components/Layout/Navbar';
import CloudSyncToastListener from './components/Common/CloudSyncToastListener';
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
import { useMobileDrawerSwipe } from './hooks/useMobileDrawerSwipe';
import { useInsightContent } from './hooks/useInsightContent';
import { useGanZhiLiuYi } from './hooks/useGanZhiLiuYi';
import type { ChartType } from './types';
import { INSIGHT_BOOKS, DEFAULT_BOOK_ID } from './data/booksConfig';
import { QIMEN_LIFE_PAN_EVENT, type QimenLifePanIntent } from './data/caseConstants';
import {
  MOBILE_NAV_HOME_CHART,
  readMobileNavCaseSlots,
  readMobileNavSlots,
  writeMobileNavCaseSlots,
  writeMobileNavSlots,
  type CaseNavSlot,
} from './lib/mobileNavStorage';
import {
  LOCKED_CHARTS_MAX,
  caseStudyCategoryOfLock,
  readLockedCharts,
  readLockedChartSnapshots,
  writeLockedCharts,
  writeLockedChartSnapshots,
  type LockedChartSnapshots,
  type QimenLockedSnapshot,
  type CaseStudyLockedSnapshot,
} from './lib/lockedChartStorage';

function AppShell() {
  const [activeChart, setActiveChart] = useState<ChartType>('wannianli');
  // 锁定键：术数为 ChartType，案例学习为 xiaoliuren:<category>（每分类独立锁定）
  const [lockedCharts, setLockedCharts] = useState<string[]>(readLockedCharts);
  const [lockedSnapshots, setLockedSnapshots] = useState<LockedChartSnapshots>(readLockedChartSnapshots);
  const [qimenLiveSnapshot, setQimenLiveSnapshot] = useState<QimenLockedSnapshot | null>(null);
  const [caseStudyLiveSnapshot, setCaseStudyLiveSnapshot] = useState<CaseStudyLockedSnapshot | null>(null);
  const [showCaseLibraryModal, setShowCaseLibraryModal] = useState(false);
  // 移动端底部导航：可换槽位（首页万年通历固定）与个人中心页开关
  const { isMobile } = useLayoutMode();
  const [navSlots, setNavSlots] = useState<ChartType[]>(readMobileNavSlots);
  // 底栏第二页（案例学习层）分类槽：与术数槽同款可更换，个人中心恒在末位
  const [caseNavSlots, setCaseNavSlots] = useState<CaseNavSlot[]>(readMobileNavCaseSlots);
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  // 案例学习分类直达意图（个人中心「案例 / 断法」入口）；seq 供重复触发同一分类
  const [caseStudyIntent, setCaseStudyIntent] = useState<{ category: string; seq: number } | null>(null);
  // 八字 → 奇门「终身局」临时意图：以案例出生时间起局；离开奇门菜单即作废
  const [lifePanIntent, setLifePanIntent] = useState<QimenLifePanIntent | null>(null);
  const mobileDrawerRegistry = useMobileNavRegistry();
  const activeDrawers = mobileDrawerRegistry[activeChart];

  // 移动端内容区左右滑开抽屉：替代每次点底栏槽位。
  // 手指向右滑 → 左抽屉（案例/目录）从左边拉出；手指向左滑 → 右抽屉（排盘信息/大纲总览）从右边拉出。
  // 首页与个人中心没有注册抽屉，enabled 自然为 false
  const openCaseDrawer = activeDrawers?.openCase;
  const openPanelDrawer = activeDrawers?.openPanel;
  // 并排式抽屉打开时，顺着手势推回的那一侧滑动改为关闭（原生 app 手感），不再重复开层
  const inlineOpen = activeDrawers?.inlineOpen ?? false;
  const inlineSide = activeDrawers?.inlineSide;
  const closeInlineDrawer = activeDrawers?.closeInline;
  const handleOpenLeftDrawer = useCallback(() => {
    openCaseDrawer?.();
  }, [openCaseDrawer]);
  const handleOpenRightDrawer = useCallback(() => {
    openPanelDrawer?.();
  }, [openPanelDrawer]);
  const handleSwipeClose = useCallback(() => {
    closeInlineDrawer?.();
  }, [closeInlineDrawer]);
  // 只传「当前打开的侧 + 关闭动作」：方向判定交给 hook，避免这里再写一遍左右逻辑
  const swipeClose = useMemo(
    () => (inlineOpen && inlineSide && closeInlineDrawer
      ? { side: inlineSide, onClose: handleSwipeClose }
      : undefined),
    [inlineOpen, inlineSide, closeInlineDrawer, handleSwipeClose],
  );
  useMobileDrawerSwipe({
    enabled: isMobile && !showMobileProfile && Boolean(openCaseDrawer || openPanelDrawer || inlineOpen),
    onOpenLeft: inlineOpen ? undefined : openCaseDrawer ? handleOpenLeftDrawer : undefined,
    onOpenRight: inlineOpen ? undefined : openPanelDrawer ? handleOpenRightDrawer : undefined,
    swipeClose,
  });

  // 统一菜单切换入口：离开奇门即丢弃终身局意图（切菜单后临时局消失，回到普通盘）；
  // 事件监听里的 setActiveChart('qimen') 有意不走这里，避免清掉刚设置的意图
  const goToChart = useCallback((chart: ChartType) => {
    if (chart !== 'qimen') setLifePanIntent(null);
    setActiveChart(chart);
  }, []);

  const handleOpenCaseStudyCategory = useCallback((category?: string) => {
    if (category) setCaseStudyIntent({ category, seq: Date.now() });
    setShowMobileProfile(false);
    goToChart('xiaoliuren');
  }, [goToChart]);

  // 八字案例头部「终身局」：切到奇门并以案例出生时间起临时局
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<QimenLifePanIntent>).detail;
      if (!detail) return;
      setLifePanIntent(detail);
      setActiveChart('qimen');
    };
    window.addEventListener(QIMEN_LIFE_PAN_EVENT, handler);
    return () => window.removeEventListener(QIMEN_LIFE_PAN_EVENT, handler);
  }, []);

  // 底栏第二页分类槽直达
  const handleOpenCaseSlot = handleOpenCaseStudyCategory;
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
    writeMobileNavCaseSlots(caseNavSlots);
  }, [caseNavSlots]);

  const handleQimenSnapshotChange = useCallback((snapshot: QimenLockedSnapshot) => {
    setQimenLiveSnapshot(snapshot);
  }, []);

  const handleCaseStudySnapshotChange = useCallback((snapshot: CaseStudyLockedSnapshot) => {
    setCaseStudyLiveSnapshot(snapshot);
  }, []);

  // lockKey：术数模块用 ChartType（bazi / qimen），案例学习用 xiaoliuren:<category>，
  // 这样第二页每个分类各自独立锁定
  const handleToggleChartLock = (lockKey: string) => {
    const chart = lockKey as ChartType;
    const isCaseLock = lockKey.startsWith('xiaoliuren:');
    const isLocked = lockedCharts.includes(lockKey);

    if (isLocked) {
      setLockedCharts((current) => current.filter((locked) => locked !== lockKey));
      setLockedSnapshots((current) => {
        if (isCaseLock) {
          const category = caseStudyCategoryOfLock(lockKey);
          const nextMap = { ...(current.xiaoliuren ?? {}) };
          if (category) delete nextMap[category];
          return {
            ...current,
            xiaoliuren: Object.keys(nextMap).length > 0 ? nextMap : undefined,
          };
        }
        const next = { ...current };
        delete next[chart as keyof LockedChartSnapshots];
        return next;
      });
      return;
    }

    if (chart === 'bazi') {
      setLockedSnapshots((current) => ({ ...current, bazi: bazi.getLockedSnapshot() }));
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

    if (isCaseLock) {
      const category = caseStudyCategoryOfLock(lockKey) ?? 'changshi';
      // 实时快照对应当前正在看的分类；锁其他分类时从该分类默认态起
      const snapshot: CaseStudyLockedSnapshot = (caseStudyLiveSnapshot?.selectedCategory === category
        ? caseStudyLiveSnapshot
        : null) ?? {
        version: 1,
        capturedAt: new Date().toISOString(),
        selectedCategory: category,
        selectedCaseId: null,
        currentPage: 1,
        duanFaFileId: null,
      };
      setLockedSnapshots((current) => ({
        ...current,
        xiaoliuren: { ...(current.xiaoliuren ?? {}), [category]: snapshot },
      }));
    }

    // 上限两个：本次锁第 3 个时淘汰最早锁定的模块，其快照在同一个 trim 里清掉
    const overflow = lockedCharts.length + 1 - LOCKED_CHARTS_MAX;
    if (overflow > 0) {
      const dropped = [...lockedCharts, chart].slice(0, overflow);
      setLockedSnapshots((current) => {
        let next = { ...current };
        for (const old of dropped) {
          if (old.startsWith('xiaoliuren:')) {
            const category = caseStudyCategoryOfLock(old);
            const nextMap = { ...(next.xiaoliuren ?? {}) };
            if (category) delete nextMap[category];
            next = { ...next, xiaoliuren: Object.keys(nextMap).length > 0 ? nextMap : undefined };
          } else {
            const copy = { ...next };
            delete copy[old as keyof LockedChartSnapshots];
            next = copy;
          }
        }
        return next;
      });
    }

    setLockedCharts((current) => [...current, lockKey].slice(-LOCKED_CHARTS_MAX));
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
    goToChart('bazi');
  };

  // 渲染主内容区域
  const mountedCharts = useMemo(() => {
    // 锁定键里的 xiaoliuren:<category> 归并成模块本身：模块实例只有一个，
    // 分类间的隔离由各自的快照负责
    const charts = lockedCharts.map((key) => (
      key.startsWith('xiaoliuren:') ? 'xiaoliuren' as ChartType : key as ChartType
    ));
    return Array.from(new Set([...charts, activeChart]));
  }, [activeChart, lockedCharts]);

  const renderContent = (chart: ChartType) => {
    switch (chart) {
      case 'qimen':
        return (
          <QimenPage
            key={qimenSnapshot?.capturedAt ?? 'unlocked'}
            lockedSnapshot={qimenSnapshot}
            onSnapshotChange={handleQimenSnapshotChange}
            lifePanIntent={lifePanIntent}
          />
        );
      case 'xiaoliuren':
        return (
          <CaseStudyPage
            // key 含分类：useCaseStudy 的快照只在挂载时取一次，
            // 切换分类槽时必须重挂载，否则锁定分类的现场恢复不了
            key={caseStudyIntent?.category ?? 'changshi'}
            categoryIntent={caseStudyIntent}
            lockedSnapshot={lockedSnapshots.xiaoliuren?.[caseStudyIntent?.category ?? 'changshi']}
            onSnapshotChange={handleCaseStudySnapshotChange}
          />
        );
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
    // 系统栏安全区：--safe-area-inset-* 在 index.css 的 :root 中定义。
    // - Android：MainActivity.kt 以行内样式注入同名变量（该平台 WebView 的 env() 恒为 0，
    //   必须原生注入），行内样式优先级高于 :root，故取注入值；
    // - iOS：WKWebView 原生支持 env()，顶部取系统安全区避开状态栏；底部 home 指示条
    //   是悬浮提示、内容可延伸其下，不做整体避让（:root 中 --safe-area-inset-bottom 恒 0），
    //   交互控件各自用 --safe-area-inset-bottom-env 局部避让，否则每个页面底部都会空出
    //   一条背景色（iPad 横竖屏底部安全区恒为 20px）；
    // - 桌面/浏览器：env() 为 0，退化为无 padding，行为与既有实现一致。
    // 根节点自带 bg-background，背景会填满 padding 区域，所以状态栏那条仍是应用底色（随主题），
    // 交互内容则被顶到系统栏下方。
    // 高度用 dvh 兜底升级：手机浏览器的 100vh 按工具栏收起后的大视口计算，底栏会被
    // 浏览器地址栏/工具栏压住，dvh 才是当前可见高度；Tauri WebView 无动态浏览器 UI，
    // dvh 与 vh 恒等，App 端渲染不变；@supports 保证不认识 dvh 的老内核仍走 100vh。
    <div
      className="h-screen supports-[height:100dvh]:h-dvh w-screen overflow-hidden bg-background flex flex-col"
      style={{
        paddingTop: 'var(--safe-area-inset-top, 0px)',
        paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
      }}
    >
      <Navbar
        activeChart={activeChart}
        onChartChange={goToChart}
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

        {/* 桌面 dev 调试用的抽屉触发按钮：桌面窗口里没有触摸手势，划不出并排式侧栏。
            仅 DEV 构建存在，import.meta.env.DEV 在生产构建时是 false，整块被 tree-shake 掉，
            打包产物里不会包含。复用底栏槽位的 openCase / openPanel，语义与手机上完全一致。
            抽屉打开时只剩一个关闭按钮，避免两个按钮压在面板内容上。
            demo 模式（dev:demo / tauri:dev:demo）下也不渲染，避免调试按钮出现在演示截图里 */}
        {import.meta.env.DEV && import.meta.env.VITE_DATA_SCOPE !== 'demo' && !showMobileProfile && (openCaseDrawer || openPanelDrawer) && (
          inlineOpen ? (
            <button
              type="button"
              onClick={handleSwipeClose}
              title="关闭侧栏（仅 dev）"
              className="absolute left-1/2 -translate-x-1/2 bottom-2 z-50 h-8 px-3 rounded-lg border border-primary/50 bg-card/95 text-[11px] text-primary shadow-sm hover:bg-primary/10 transition-colors"
            >
              ✕ 关闭侧栏
            </button>
          ) : (
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 z-50 flex justify-between pointer-events-none">
              {openCaseDrawer ? (
                <button
                  type="button"
                  onClick={handleOpenLeftDrawer}
                  title={`打开${activeDrawers?.caseLabel ?? '案例'}侧栏（仅 dev）`}
                  className="pointer-events-auto h-9 px-2 rounded-lg border border-primary/50 bg-card/90 text-[11px] text-primary shadow-sm hover:bg-primary/10 transition-colors"
                >
                  ◀ {activeDrawers?.caseLabel ?? '案例'}
                </button>
              ) : <span />}
              {openPanelDrawer && (
                <button
                  type="button"
                  onClick={handleOpenRightDrawer}
                  title={`打开${activeDrawers?.panelLabel ?? '排盘信息'}侧栏（仅 dev）`}
                  className="pointer-events-auto h-9 px-2 rounded-lg border border-primary/50 bg-card/90 text-[11px] text-primary shadow-sm hover:bg-primary/10 transition-colors"
                >
                  {activeDrawers?.panelLabel ?? '排盘信息'} ▶
                </button>
              )}
            </div>
          )
        )}

        {/* 移动端个人中心：覆盖内容区，底栏保持可见（L1 主菜单层，个人中心高亮）；
            z-[60] 高于底栏毛玻璃层，保证页内底部弹窗（如设置生日）不被底栏遮挡 */}
        {isMobile && showMobileProfile && (
          <div className="absolute inset-0 z-[60] bg-background">
            <MobileProfileCenter
              slots={navSlots}
              onSlotsChange={setNavSlots}
              caseSlots={caseNavSlots}
              onCaseSlotsChange={setCaseNavSlots}
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
          caseSlots={caseNavSlots}
          lockedCharts={lockedCharts}
          onToggleSlotLock={handleToggleChartLock}
          drawers={activeDrawers}
          onSelectChart={(chart) => {
            setShowMobileProfile(false);
            goToChart(chart);
          }}
          onOpenProfile={() => setShowMobileProfile(true)}
          onSelectCaseSlot={handleOpenCaseSlot}
        />
      )}

      {/* 案例库弹窗 (仅在 MainLayout 模式下使用，虽在此处全局渲染但仅由 CaseList 触发) */}
      <BaziCaseLibraryModal
        isOpen={showCaseLibraryModal}
        onClose={() => setShowCaseLibraryModal(false)}
        selectedCaseId={bazi.selectedCaseId}
        onSelectCase={bazi.handleSelectCase}
      />

      {/* 云同步完成提示：自动同步有数据流动时弹出（桌面/移动统一） */}
      <CloudSyncToastListener />
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
      <CasePrivacyProvider>
        <AppContent />
      </CasePrivacyProvider>
    </BaziProvider>
  );
}

export default App;
