import { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Compass,
  Flower2,
  Hexagon,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Star,
  Sun,
  User,
} from 'lucide-react';
import type { ComponentType } from 'react';

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

const navItems: { id: ChartType; name: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'bazi', name: '八字', icon: Compass },
  { id: 'qimen', name: '奇门', icon: Hexagon },
  { id: 'liuyao', name: '六爻', icon: BookOpen },
  { id: 'ziwei', name: '紫薇', icon: Star },
  { id: 'daliuren', name: '大六壬', icon: Moon },
  { id: 'xiaoliuren', name: '小六壬', icon: Sun },
  { id: 'meihua', name: '梅花', icon: Flower2 },
  { id: 'wannianli', name: '万年历', icon: Calendar },
  { id: 'sanyuan', name: '三元天星', icon: Sparkles },
];

interface NavbarProps {
  activeChart: ChartType;
  onChartChange: (chart: ChartType) => void;
}

export default function Navbar({ activeChart, onChartChange }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-16 glass-header sticky top-0 z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <span className="font-display text-lg font-semibold tracking-wide text-foreground">玄枢录</span>
      </div>
      <nav className="flex items-center bg-secondary/50 rounded-lg p-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeChart === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChartChange(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-card text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden lg:inline">{item.name}</span>
            </button>
          );
        })}
      </nav>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground hidden sm:inline">未登录</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 animate-fade-in">
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              登录 / 注册
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              设置
            </button>
            <div className="border-t border-border my-1" />
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-muted-foreground hover:bg-secondary/50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
