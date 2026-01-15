/**
 * 导航栏组件
 * 集成认证状态，支持登录/登出
 * 包含实时时钟显示（公历、农历、四柱）
 */
import { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Compass,
  Flower2,
  Grid3X3,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Star,
  Sun,
  User,
  Loader2,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getRealtimeClockData } from '../../utils/lunarUtil';

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
  { id: 'qimen', name: '奇门', icon: Grid3X3 },
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
  onLoginClick?: () => void;
}

// 实时时钟组件
function RealtimeClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 使用 lunarUtil 封装获取时钟数据
  const clockData = getRealtimeClockData(now);

  return (
    <div className="flex items-center gap-4 text-base">
      {/* 公历 + 农历 */}
      <div className="flex flex-col font-serif items-end leading-tight text-base">
        <span className="text-foreground/80">{clockData.solar.formatted}</span>
        <span className="text-muted-foreground">
          {clockData.lunar.yearInChinese}年{clockData.lunar.monthInChinese}月{clockData.lunar.dayInChinese}
        </span>
      </div>
      {/* 四柱 */}
      <div className="flex gap-1">
        {[clockData.pillars.year, clockData.pillars.month, clockData.pillars.day, clockData.pillars.hour].map((pillar, i) => (
          <div
            key={i}
            className="flex flex-col items-center bg-secondary/50 rounded px-1.5 py-0.5"
          >
            <span className="text-primary font-serif text-base">{pillar[0]}</span>
            <span className="text-muted-foreground font-serif text-base">{pillar[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Navbar({ activeChart, onChartChange, onLoginClick }: NavbarProps) {
  const { user, isAuthenticated, signOut, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return true;
    return document.documentElement.classList.contains('dark');
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      setMenuOpen(false);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLoginClick = () => {
    setMenuOpen(false);
    onLoginClick?.();
  };

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // 获取显示名称
  const displayName = user?.email?.split('@')[0] || '用户';

  return (
    <header className="h-16 glass-header sticky top-0 z-50 flex items-center">
      {/* Logo 区域 - 固定宽度与左侧 sidebar 对齐 */}
      <div className="w-56 flex-shrink-0 flex items-center gap-3 px-4">
        <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <span className="font-display text-lg font-semibold tracking-wide text-foreground">玄枢录</span>
      </div>

      {/* 导航模块 - 从 sidebar 结束处开始，与主内容区对齐 */}
      <div className="flex-1 flex items-center justify-between pr-6">
        <nav className="flex items-center">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeChart === item.id;
            return (
              <div key={item.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => onChartChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-base font-medium transition-all duration-200 ${isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.name}</span>
                </button>
                {/* 分割线 */}
                {index < navItems.length - 1 && (
                  <span className="text-border">|</span>
                )}
              </div>
            );
          })}
        </nav>

        {/* 右侧：实时时钟 + 主题切换 + 用户菜单 */}
        <div className="flex items-center gap-4">
          {/* 实时时钟 */}
          <RealtimeClock />

          {/* 主题切换 */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            aria-label={isDark ? '切换到明亮主题' : '切换到暗黑主题'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* 用户菜单 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
              disabled={loading}
            >
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                {loading ? (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                ) : isAuthenticated ? (
                  <span className="text-sm font-medium text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {loading ? '加载中...' : isAuthenticated ? displayName : '未登录'}
              </span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 animate-fade-in">
                {isAuthenticated ? (
                  <>
                    <div className="px-4 py-2 border-b border-border">
                      <div className="text-sm font-medium text-foreground">{displayName}</div>
                      <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    </div>
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
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full px-4 py-2 text-left text-sm text-muted-foreground hover:bg-secondary/50 flex items-center gap-2"
                    >
                      {loggingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      退出登录
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleLoginClick}
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
