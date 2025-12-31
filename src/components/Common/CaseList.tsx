import { useMemo, useState } from 'react';
import { ChevronRight, Plus, Search } from 'lucide-react';

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

const cases = [
  { id: '1', name: '案例1', tags: ['甲', '乙', '丙', '丁'], date: '1998年12月19日', type: 'bazi', gender: '女' },
  { id: '2', name: '案例2', tags: ['戊', '己'], date: '1985年3月15日', type: 'bazi', gender: '女' },
  { id: '3', name: '案例3', tags: ['庚', '辛', '壬'], date: '2000年7月8日', type: 'qimen', gender: '女' },
  { id: '4', name: '案例4', tags: ['癸'], date: '1992年11月22日', type: 'ziwei', gender: '女' },
  { id: '5', name: '案例5', tags: ['甲', '戊'], date: '1978年5月1日', type: 'liuyao', gender: '女' },
];

interface CaseListProps {
  selectedCaseId?: string;
  onSelectCase?: (caseId: string) => void;
}

export default function CaseList({ selectedCaseId, onSelectCase }: CaseListProps) {
  const [search, setSearch] = useState('');
  const [filterType] = useState<ChartType | 'all'>('all');

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const matchesSearch =
        item.name.includes(search) || item.tags.some((tag) => tag.includes(search));
      const matchesType = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [search, filterType]);

  return (
    <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col min-h-0">
      <div className="p-4 border-b border-sidebar-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-medium text-foreground">案例库</h2>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            全部 <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索案例..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/12 hover:bg-primary/18 text-primary rounded-lg text-sm font-medium transition-colors border border-primary/40"
        >
          <Plus className="w-4 h-4" />
          新建案例
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
        {filteredCases.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectCase?.(item.id)}
            className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
              selectedCaseId === item.id
                ? 'bg-sidebar-accent border border-primary/30'
                : 'hover:bg-sidebar-accent/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.gender}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">{item.date}</div>
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-xs bg-secondary rounded text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}

        {filteredCases.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-6 rounded-lg border border-dashed border-sidebar-border/70 bg-sidebar-accent/40">
            暂无匹配的案例
          </div>
        )}
      </div>
    </aside>
  );
}
