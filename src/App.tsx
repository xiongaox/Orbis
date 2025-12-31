import { useState, useEffect, useCallback } from 'react';
import type { ComponentType } from 'react';
import {
  BookOpen,
  Calendar,
  Compass,
  Flower2,
  Hexagon,
  Moon,
  Sparkles,
  Star,
  Sun,
} from 'lucide-react';
import Navbar from './components/Layout/Navbar';
import CaseList from './components/Sidebar/CaseList';
import BaziCaseInfo from './components/Bazi/BaziCaseInfo';
import BaziChart from './components/Bazi/BaziChart';
import DayunLiunianPanel from './components/Bazi/DayunLiunianPanel';
import InsightPanel from './components/desktop/InsightPanel';
import { caseService } from './services/caseService';
import { fetchBazi, parseBirthDate } from './services/baziApi';
import type { BaziApiResponse } from './types/bazi';
import type { Case } from './types';

type ChartType =
  | 'bazi'
  | 'qimen'
  | 'liuyao'
  | 'ziwei'
  | 'daliuren'
  | 'xiaoliuren'
  | 'meihua'
  | 'wannianli'
  | 'sanyuan';

const chartMeta: Record<ChartType, { title: string; icon: ComponentType<{ className?: string }> }> = {
  bazi: { title: '八字', icon: Compass },
  qimen: { title: '奇门', icon: Hexagon },
  liuyao: { title: '六爻', icon: BookOpen },
  ziwei: { title: '紫薇', icon: Star },
  daliuren: { title: '大六壬', icon: Moon },
  xiaoliuren: { title: '小六壬', icon: Sun },
  meihua: { title: '梅花', icon: Flower2 },
  wannianli: { title: '万年历', icon: Calendar },
  sanyuan: { title: '三元天星', icon: Sparkles },
};

function PlaceholderChart({ chart }: { chart: ChartType }) {
  const Icon = chartMeta[chart].icon;
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-medium text-foreground">{chartMeta[chart].title}</h2>
            <p className="text-sm text-muted-foreground">示例排盘内容</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activeChart, setActiveChart] = useState<ChartType>('bazi');
  const [selectedCaseId, setSelectedCaseId] = useState('1');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [baziData, setBaziData] = useState<BaziApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 选中的大运和流年状态（用于联动显示）
  const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number | null>(null);
  const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number | null>(null);

  const showSidebar = activeChart !== 'wannianli';
  const showInsights = activeChart !== 'wannianli';
  const showDayunPanel = activeChart === 'bazi';

  // 加载案例数据
  const loadCase = useCallback(async (caseId: string) => {
    try {
      const caseData = await caseService.getCaseById(caseId);
      setSelectedCase(caseData);
      return caseData;
    } catch (err) {
      console.error('加载案例失败:', err);
      return null;
    }
  }, []);

  // 获取八字数据（使用案例数据或当前时间）
  const loadBaziData = useCallback(async (caseData?: Case | null) => {
    setLoading(true);
    setError(null);

    try {
      let params;

      if (caseData?.birth_date) {
        // 使用案例数据
        params = {
          ...parseBirthDate(caseData.birth_date),
          gender: caseData.gender,
        };
      } else {
        // 没有案例时，使用当前时间排盘
        const now = new Date();
        params = {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
          hour: now.getHours(),
          minute: now.getMinutes(),
          gender: 'male' as const,  // 默认男性
        };
      }

      const data = await fetchBazi(params);
      setBaziData(data);
    } catch (err) {
      console.error('获取八字数据失败:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
      setBaziData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化时加载当前时间的八字
  useEffect(() => {
    if (activeChart === 'bazi' && !baziData && !loading) {
      loadBaziData();
    }
  }, [activeChart]);

  // 监听案例选择变化
  useEffect(() => {
    const fetchData = async () => {
      const caseData = await loadCase(selectedCaseId);
      if (activeChart === 'bazi') {
        await loadBaziData(caseData);
      }
    };

    fetchData();
  }, [selectedCaseId, activeChart, loadCase, loadBaziData]);

  // 处理案例选择
  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
  };

  return (
    <div className="min-h-screen bg-background bg-noise flex flex-col">
      <Navbar activeChart={activeChart} onChartChange={setActiveChart} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showSidebar && (
          <CaseList selectedCaseId={selectedCaseId} onSelectCase={handleSelectCase} />
        )}
        <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
          {activeChart === 'bazi' ? (
            <>
              <BaziCaseInfo
                caseData={selectedCase}
                baziData={baziData}
                selectedDaYunIndex={selectedDaYunIndex}
                selectedLiuNianYear={selectedLiuNianYear}
              />
              <div className="flex-1 min-h-0 min-w-0 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 overflow-hidden px-6 pb-6">
                <BaziChart
                  data={baziData}
                  loading={loading}
                  selectedDaYunIndex={selectedDaYunIndex}
                  selectedLiuNianYear={selectedLiuNianYear}
                />
                {showDayunPanel && (
                  <DayunLiunianPanel
                    data={baziData}
                    loading={loading}
                    selectedDaYunIndex={selectedDaYunIndex}
                    selectedLiuNianYear={selectedLiuNianYear}
                    onSelectDaYun={setSelectedDaYunIndex}
                    onSelectLiuNian={setSelectedLiuNianYear}
                  />
                )}
              </div>
              {error && (
                <div className="px-6 pb-4">
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                    {error}
                  </div>
                </div>
              )}
            </>
          ) : (
            <PlaceholderChart chart={activeChart} />
          )}
        </main>
        {showInsights && <InsightPanel />}
      </div>
    </div>
  );
}

export default App;
