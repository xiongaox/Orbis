import { useState } from 'react';
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
  const showSidebar = activeChart !== 'wannianli';
  const showInsights = activeChart !== 'wannianli';
  const showDayunPanel = activeChart === 'bazi';

  return (
    <div className="min-h-screen bg-background bg-noise flex flex-col">
      <Navbar activeChart={activeChart} onChartChange={setActiveChart} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showSidebar && (
          <CaseList selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} />
        )}
        <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
          {activeChart === 'bazi' ? (
            <>
              <BaziCaseInfo />
              <div className="flex-1 min-h-0 min-w-0 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 overflow-hidden px-6 pb-6">
                <BaziChart />
                {showDayunPanel && <DayunLiunianPanel />}
              </div>
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
