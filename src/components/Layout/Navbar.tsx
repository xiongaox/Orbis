/**
 * 导航栏组件
 * 集成认证状态，支持登录/登出
 * 包含实时时钟显示（公历、农历、四柱）
 * 响应式设计：小屏幕折叠菜单 + 时钟互斥显示
 */
import { useState, useEffect } from 'react';
import {
  Calendar,
  Compass,
  Grid3X3,
  LogOut,
  Moon,
  Sun,
  User,
  Loader2,
  Key,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getRealtimeClockData } from '../../utils/lunarUtil';
import ChangePasswordModal from '../Auth/ChangePasswordModal';

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

const navItems: { id: ChartType; name: string; icon: ComponentType<{ className?: string }>; priority: 'core' | 'extra' }[] = [
  { id: 'wannianli', name: '万年通历', icon: Calendar, priority: 'core' },
  { id: 'bazi', name: '四柱八字', icon: Compass, priority: 'core' },
  { id: 'qimen', name: '奇门遁甲', icon: Grid3X3, priority: 'core' },
  { id: 'xiaoliuren', name: '案例学习', icon: Sun, priority: 'core' },
];

// 核心菜单项（小屏幕始终显示）
const coreItems = navItems.filter(item => item.priority === 'core');

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
            className="flex flex-col items-center px-1.5 py-0.5"
          >
            <span className="text-primary font-serif text-base">{pillar[0]}</span>
            <span className="text-muted-foreground font-serif text-base">{pillar[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 导航菜单按钮组件
function NavButton({
  item,
  isActive,
  onClick,
  showText = true
}: {
  item: typeof navItems[0];
  isActive: boolean;
  onClick: () => void;
  showText?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-2 lg:px-3 py-1.5 text-sm lg:text-base font-medium transition-all duration-200 whitespace-nowrap ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
    >
      <Icon className="w-4 h-4" />
      {showText && <span>{item.name}</span>}
    </button>
  );
}

export default function Navbar({ activeChart, onChartChange, onLoginClick }: NavbarProps) {
  const { user, isAuthenticated, signOut, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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
    <>
      <header className="h-16 glass-header sticky top-0 z-50 flex items-center justify-center relative">
        {/* Logo 区域 - 绝对定位在左侧 */}
        <div className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 flex items-center">
          <div className="w-20 h-20 lg:w-32 lg:h-32 flex items-center justify-center">
            <img
              src={isDark ? "/logo/logo_dark.svg" : "/logo/logo_light.svg"}
              alt="玄枢录"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* 导航模块 - 居中显示 */}
        <div className="flex items-center justify-center">
          {/* 小屏幕导航：核心菜单 + 可展开额外菜单 */}
          <nav className="flex items-center 2xl:hidden">
            {/* 核心菜单始终显示 */}
            {coreItems.map((item, index) => (
              <div key={item.id} className="flex items-center flex-shrink-0">
                <NavButton
                  item={item}
                  isActive={activeChart === item.id}
                  onClick={() => onChartChange(item.id)}
                />
                {index < coreItems.length - 1 && (
                  <span className="text-border">|</span>
                )}
              </div>
            ))}


          </nav>

          {/* 大屏幕导航：完整菜单 */}
          <nav className="hidden 2xl:flex items-center">
            {navItems.map((item, index) => (
              <div key={item.id} className="flex items-center flex-shrink-0">
                <NavButton
                  item={item}
                  isActive={activeChart === item.id}
                  onClick={() => onChartChange(item.id)}
                />
                {index < navItems.length - 1 && (
                  <span className="text-border">|</span>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* 右侧功能区 - 绝对定位在右侧 */}
        <div className="absolute right-3 lg:right-6 flex items-center gap-2 lg:gap-4">
          {/* 实时时钟 - 在万年通历模块隐藏（避免冗余） */}
          {activeChart !== 'wannianli' && (
            <div className="hidden sm:flex">
              <RealtimeClock />
            </div>
          )}

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
              className="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
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
              <span className="text-sm text-muted-foreground hidden lg:inline">
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
                      onClick={() => {
                        setShowPasswordModal(true);
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      修改密码
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

                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}
