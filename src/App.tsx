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
import { useBazi } from './hooks/useBazi';
import type { ChartType } from './types';
import {
  calculateTianGanLiuYi,
  calculateDiZhiLiuYi,
} from './lib/xuan-bazi/utils/baziGanZhiLiuYiUtil';
import { createDefaultGanZhiLiuYiSetting } from './lib/xuan-bazi/settings/baziGanZhiLiuYiSetting';
import { getQiongtongEntry } from './lib/xuan-bazi/utils/qiongtongUtil';
import { getDiZhiCangGan } from './lib/xuan-bazi/utils/baziJichuUtil';

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

  // 计算穷通宝鉴数据（智能咨询参考内容）
  const insightContent = useMemo<InsightContent | undefined>(() => {
    if (!bazi.baziData?.pillars || bazi.baziData.pillars.length < 4) {
      return undefined;
    }

    const pillars = bazi.baziData.pillars;

    // 获取日主（日柱天干）和月份（月柱地支对应的月份）
    const riZhu = pillars[2]?.tiangan; // 日柱天干
    const yueZhi = pillars[1]?.dizhi;  // 月柱地支

    if (!riZhu || !yueZhi) {
      return undefined;
    }

    // 地支转月份（寅=1, 卯=2, ...）
    const zhiToMonth: Record<string, number> = {
      '寅': 1, '卯': 2, '辰': 3, '巳': 4, '午': 5, '未': 6,
      '申': 7, '酉': 8, '戌': 9, '亥': 10, '子': 11, '丑': 12,
    };
    const month = zhiToMonth[yueZhi];

    if (!month) {
      return undefined;
    }

    // 从穷通宝鉴获取数据
    const entry = getQiongtongEntry(riZhu, month);

    // 计算透藏分析
    // 透 = 四柱天干中出现的
    const touGans = new Set(pillars.map(p => p.tiangan));
    // 藏 = 四柱地支藏干中出现但天干没透的
    const allCangGans = new Set<string>();
    pillars.forEach(p => {
      const cangGans = getDiZhiCangGan(p.dizhi);
      cangGans.forEach(g => allCangGans.add(g));
    });

    // 如果有调候用神数据，分析透藏情况
    let touCangHint = '';
    if (entry?.tiaohou) {
      // 提取调候用神中的天干（去重）
      const tiaohouGans = [...new Set(
        entry.tiaohou.split('').filter(c =>
          ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].includes(c)
        )
      )];

      const touList: string[] = [];
      const cangList: string[] = [];

      tiaohouGans.forEach(gan => {
        if (touGans.has(gan)) {
          // 天干中透出
          touList.push(gan);
        } else if (allCangGans.has(gan)) {
          // 地支藏干中有，但天干没透
          cangList.push(gan);
        }
        // 如果既没透也没藏，则不显示
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
  }, [bazi.baziData]);

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
          />
        ) : undefined}
        liuYiPanel={showInsights ? <GanZhiLiuYiPanel data={ganZhiLiuYiData} /> : undefined}
        insightPanel={showInsights ? <InsightPanel content={insightContent} /> : undefined}
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
