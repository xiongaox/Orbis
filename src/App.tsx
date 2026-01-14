/**
 * App.tsx - 应用入口
 * 包含路由、布局配置和认证提供者
 */
import { useState, useEffect, useMemo } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Layout/Navbar';
import MainLayout from './components/Layout/MainLayout';
import CaseList from './components/Common/CaseList';
import InsightPanel from './components/Common/InsightPanel';
import type { InsightContent } from './components/Common/InsightPanel';
import GanZhiLiuYiPanel from './components/Common/GanZhiLiuYiPanel';
import type { GanZhiLiuYiData } from './components/Common/GanZhiLiuYiPanel';
import PlaceholderChart from './components/Common/PlaceholderChart';
import BaziPage from './components/Modules/Bazi/BaziPage';
import AuthModal from './components/Auth/AuthModal';
import CaseLibraryModal from './components/Common/CaseLibraryModal';
import { useBazi } from './hooks/useBazi';
import type { ChartType } from './types';
import {
  calculateTianGanLiuYi,
  calculateDiZhiLiuYi,
} from './lib/xuan-bazi/utils/baziGanZhiLiuYiUtil';
import { createDefaultGanZhiLiuYiSetting } from './lib/xuan-bazi/settings/baziGanZhiLiuYiSetting';
import { getQiongtongEntry } from './lib/xuan-bazi/utils/qiongtongUtil';
import { getDiZhiCangGan } from './lib/xuan-bazi/utils/baziJichuUtil';
import { getDiTianSuiEntry, getDiTianSuiMonthlyEntry } from './lib/xuan-bazi/utils/ditiansuiUtil';
import { buildSanMingContent } from './lib/xuan-bazi/utils/sanmingUtil';
import type { InsightBook } from './components/Common/InsightPanel';

function AppContent() {
  const [activeChart, setActiveChart] = useState<ChartType>('bazi');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCaseLibraryModal, setShowCaseLibraryModal] = useState(false);
  // 默认选中的经典书籍 ID
  const [activeBookId, setActiveBookId] = useState<string>('qiongtong');
  const bazi = useBazi();

  // 定义可用书籍列表
  const books: InsightBook[] = [
    { id: 'qiongtong', name: '穷通宝鉴', category: 'classic' },
    { id: 'ditiansui', name: '滴天髓', category: 'classic' },
    { id: 'sanming', name: '三命通会', category: 'classic' },
  ];

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

  // 计算干支留意数据
  const ganZhiLiuYiData = useMemo<GanZhiLiuYiData | undefined>(() => {
    if (!bazi.baziData?.pillars || bazi.baziData.pillars.length < 4) {
      return undefined;
    }

    const pillars = bazi.baziData.pillars;
    const setting = createDefaultGanZhiLiuYiSetting();

    // 1. 提取四柱（静态）天干和地支
    const staticGans = pillars.map((p) => p.tiangan);
    const staticZhis = pillars.map((p) => p.dizhi);

    // 2. 提取大运/流年（动态）天干和地支
    const dynamicGans: string[] = [];
    const dynamicZhis: string[] = [];

    // 获取选中大运的干支
    if (bazi.selectedDaYunIndex !== null && bazi.baziData.daYun) {
      const selectedDaYun = bazi.baziData.daYun.find(d => d.index === bazi.selectedDaYunIndex);
      if (selectedDaYun && selectedDaYun.tiangan && selectedDaYun.dizhi) {
        dynamicGans.push(selectedDaYun.tiangan);
        dynamicZhis.push(selectedDaYun.dizhi);
      }
    }

    // 获取选中流年的干支
    if (bazi.selectedLiuNianYear !== null && bazi.baziData.liuNian) {
      const selectedLiuNian = bazi.baziData.liuNian.find(l => l.year === bazi.selectedLiuNianYear);
      if (selectedLiuNian && selectedLiuNian.tiangan && selectedLiuNian.dizhi) {
        dynamicGans.push(selectedLiuNian.tiangan);
        dynamicZhis.push(selectedLiuNian.dizhi);
      }
    }

    // 计算天干留意
    const tianGanResults = calculateTianGanLiuYi(setting, staticGans, dynamicGans);

    // 计算地支留意
    const diZhiResults = calculateDiZhiLiuYi(setting, staticZhis, dynamicZhis);

    return {
      tianGan: tianGanResults.length > 0 ? tianGanResults : undefined,
      diZhi: diZhiResults.length > 0 ? diZhiResults : undefined,
    };
  }, [bazi.baziData, bazi.selectedDaYunIndex, bazi.selectedLiuNianYear]);

  // ... (keeping other hooks)

  // 计算智能咨询参考内容（穷通宝鉴/滴天髓）
  const insightContent = useMemo<InsightContent | undefined>(() => {
    if (!bazi.baziData?.pillars || bazi.baziData.pillars.length < 4) {
      return undefined;
    }

    const pillars = bazi.baziData.pillars;
    // 获取日主（日柱天干）
    const riZhu = pillars[2]?.tiangan;

    // 1) 滴天髓逻辑
    if (activeBookId === 'ditiansui') {
      if (!riZhu) return undefined;
      const yueZhi = pillars[1]?.dizhi;  // 月柱地支

      // 获取基础数据（原文+原注+任氏曰）
      const basicEntry = getDiTianSuiEntry(riZhu);

      // 尝试获取按月令的逻辑解析版数据
      if (yueZhi) {
        const monthlyEntry = getDiTianSuiMonthlyEntry(riZhu, yueZhi);
        if (monthlyEntry) {
          return {
            hint: undefined,
            subHint: undefined,
            summary: monthlyEntry.poem,
            summaryTitle: `${monthlyEntry.meta.stem} · ${monthlyEntry.meta.month}`,
            // 逻辑解析标签使用结构化数据
            keyPoints: monthlyEntry.analysis.map(a =>
              `**${a.segment}**\n【${a.tags.join('、')}】\n${a.logic.reasoning}\n💡 ${a.modern_meaning}`
            ),
            keyPointsTitle: '逻辑解析',
            // 原文标签使用基础数据
            ditiansuiBasic: basicEntry,
          };
        }
      }

      // 回退：没有结构化数据时，只显示原文标签内容
      if (!basicEntry) {
        return {
          hint: undefined,
          subHint: undefined,
          summary: `暂无 ${riZhu}日主 的滴天髓数据`,
          summaryTitle: `${riZhu}干`,
          keyPoints: [],
          keyPointsTitle: '逻辑解析',
          ditiansuiBasic: undefined,
        };
      }
      return {
        hint: undefined,
        subHint: undefined,
        summary: basicEntry.poem,
        summaryTitle: `${riZhu}干`,
        // 没有结构化数据时，逻辑解析标签无内容
        keyPoints: [],
        keyPointsTitle: '逻辑解析',
        // 原文标签使用基础数据
        ditiansuiBasic: basicEntry,
      };
    }

    // 2) 三命通会逻辑
    if (activeBookId === 'sanming') {
      const dayGanZhi = pillars[2]?.ganZhi;  // 日柱干支
      if (!dayGanZhi) {
        return {
          summary: '请先选择案例',
          keyPoints: [],
        };
      }

      const sanmingContent = buildSanMingContent(dayGanZhi);
      if (!sanmingContent.found) {
        return {
          summary: sanmingContent.summary,
          keyPoints: [],
        };
      }

      return {
        hint: undefined,
        subHint: undefined,
        summary: sanmingContent.summary,
        summaryTitle: sanmingContent.nayinLabel,  // 如 "丙寅丁卯炉中火"
        keyPoints: sanmingContent.keyPoints,
        keyPointsTitle: '现代AI解析',
      };
    }

    // 3) 穷通宝鉴逻辑 (默认)
    // 获取月份
    const yueZhi = pillars[1]?.dizhi;  // 月柱地支
    if (!riZhu || !yueZhi) {
      return undefined;
    }

    const zhiToMonth: Record<string, number> = {
      '寅': 1, '卯': 2, '辰': 3, '巳': 4, '午': 5, '未': 6,
      '申': 7, '酉': 8, '戌': 9, '亥': 10, '子': 11, '丑': 12,
    };
    const month = zhiToMonth[yueZhi];

    if (!month) {
      return undefined;
    }

    const entry = getQiongtongEntry(riZhu, month);

    // 计算透藏分析
    const touGans = new Set(pillars.map(p => p.tiangan));
    const allCangGans = new Set<string>();
    pillars.forEach(p => {
      const cangGans = getDiZhiCangGan(p.dizhi);
      cangGans.forEach(g => allCangGans.add(g));
    });

    let touCangHint = '';
    if (entry?.tiaohou) {
      const tiaohouGans = [...new Set(
        entry.tiaohou.split('').filter(c =>
          ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].includes(c)
        )
      )];

      const touList: string[] = [];
      const cangList: string[] = [];

      tiaohouGans.forEach(gan => {
        if (touGans.has(gan)) {
          touList.push(gan);
        } else if (allCangGans.has(gan)) {
          cangList.push(gan);
        }
      });

      const parts: string[] = [];
      if (touList.length > 0) {
        parts.push(`透${touList.join('')}`);
      }
      if (cangList.length > 0) {
        parts.push(`藏${cangList.join('')}`);
      }
      touCangHint = parts.length > 0 ? parts.join(' ') : '无';
    }

    if (!entry) {
      return {
        hint: `调候用神提示：${riZhu}日主，${month}月`,
        subHint: touCangHint ? `本八字：${touCangHint}` : '暂无穷通宝鉴数据',
        summary: `当前日主 ${riZhu} 的调候用神数据正在整理中...`,
        keyPoints: ['目前仅支持甲木十二月数据', '其他日主数据将陆续补充'],
      };
    }

    return {
      hint: `调候用神提示：${entry.tiaohou}`,
      subHint: `本八字：${touCangHint}`,
      summary: entry.summary,
      summaryTitle: entry.title,
      keyPoints: entry.keyPoints,
      keyPointsTitle: '要点解析',
    };
  }, [bazi.baziData, activeBookId]); // Added activeBookId dependency

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
              books={books}
              activeBook={activeBookId}
              onBookChange={setActiveBookId}
              content={insightContent}
            />
          ) : undefined
        }
      >
        {activeChart === 'bazi' ? (
          <BaziPage
            selectedCase={bazi.selectedCase}
            baziData={bazi.baziData}
            loading={bazi.loading}
            error={bazi.error}
            selectedDaYunIndex={bazi.selectedDaYunIndex}
            selectedLiuNianYear={bazi.selectedLiuNianYear}
            selectedLiuYueIndex={bazi.selectedLiuYueIndex}
            setSelectedDaYunIndex={bazi.setSelectedDaYunIndex}
            setSelectedLiuNianYear={bazi.setSelectedLiuNianYear}
            setSelectedLiuYueIndex={bazi.setSelectedLiuYueIndex}
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
      <AppContent />
    </AuthProvider>
  );
}

export default App;
