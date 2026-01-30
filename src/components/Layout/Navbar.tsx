/**
 * 导航栏组件
 * 集成认证状态，支持登录/登出
 * 包含实时时钟显示（公历、农历、四柱）
 * 响应式设计：小屏幕折叠菜单 + 时钟互斥显示
 */
import { useState, useEffect, useRef } from 'react';
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
import BaseModal from '../UI/BaseModal';
import { getRealtimeClockData } from '../../utils/lunarUtil';
import ChangePasswordModal from '../Auth/ChangePasswordModal';
import AdvancedDatePicker from '../Common/AdvancedDatePicker';
import { profileService } from '../../services/profileService';

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

const ZODIAC_IMAGES = [
  '鼠.svg', '牛.svg', '虎.svg', '兔.svg', '龙.svg', '蛇.svg',
  '马.svg', '羊.svg', '猴.svg', '鸡.svg', '狗.svg', '猪.svg'
];

/**
 * 根据年份计算生肖索引 (1900年是鼠年)
 */
function getZodiacIndexByYear(year: number) {
  const offset = year - 1900;
  // Handle negative offset if year < 1900 (though picker is 1900+)
  const index = offset % 12;
  return index < 0 ? index + 12 : index;
}

/**
 * 根据邮箱获取固定的随机头像
 * 如果提供了 birthYear，则使用对应的生肖头像
 */
function getUserAvatar(email?: string, birthYear?: number) {
  if (birthYear) {
    const index = getZodiacIndexByYear(birthYear);
    return `/zodiac/${ZODIAC_IMAGES[index]}`;
  }

  if (!email) return `/zodiac/${ZODIAC_IMAGES[0]}`;
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ZODIAC_IMAGES.length;
  return `/zodiac/${ZODIAC_IMAGES[index]}`;
}

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
      {/* 公历 + 农历 */}
      <div className="flex flex-col font-serif items-start leading-tight text-base">
        <span className="text-foreground/80">{clockData.solar.formatted}</span>
        <span className="text-muted-foreground">
          {clockData.lunar.yearInChinese}年{clockData.lunar.monthInChinese}月{clockData.lunar.dayInChinese}
        </span>
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
      className={`flex items-center gap-1 px-3 py-1.5 text-base font-medium transition-all duration-200 whitespace-nowrap ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
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
  const [showContactModal, setShowContactModal] = useState(false);

  // 生日设置相关状态
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);

  // Load profile when user changes
  useEffect(() => {
    if (user?.id) {
      profileService.getProfile(user.id).then(profile => {
        if (profile?.birth_date) {
          setBirthDate(new Date(profile.birth_date));
        } else {
          // Fallback to local storage for backward compatibility during migration
          if (user.email) {
            const saved = localStorage.getItem(`user_birthday_${user.email}`);
            if (saved) setBirthDate(new Date(saved));
          }
        }
      });
    } else {
      setBirthDate(undefined);
    }
  }, [user]);

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
  const avatarPath = getUserAvatar(user?.email, birthDate?.getFullYear());

  const handleBirthdayConfirm = async (date: Date) => {
    setBirthDate(date); // Optimistic update
    setShowBirthdayModal(false);
    setMenuOpen(false);

    if (user?.id) {
      // Save to Supabase
      await profileService.updateProfile(user.id, {
        birth_date: date.toISOString(),
        email: user.email, // Ensure email is synced
      });

      // Sync to local storage as backup
      if (user.email) {
        localStorage.setItem(`user_birthday_${user.email}`, date.toISOString());
      }
    }
  };

  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="h-16 glass-header sticky top-0 z-50 flex items-center justify-center relative">
        {/* Logo and Clock Area - Absolute positioned left */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-8">
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-32 h-32 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
            title="刷新并返回首页"
          >
            <img
              src={isDark ? "/logo/logo_dark.svg" : "/logo/logo_light.svg"}
              alt="玄枢录"
              className="w-full h-full object-contain"
            />
          </button>

          {/* 实时时钟 - 在万年通历模块隐藏 */}
          {activeChart !== 'wannianli' && (
            <div className="hidden xl:flex">
              <RealtimeClock />
            </div>
          )}
        </div>

        {/* 导航模块 - 居中显示 */}
        <div className="flex items-center justify-center">
          {/* 完整导航菜单 */}
          <nav className="flex items-center">
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
        <div className="absolute right-6 flex items-center gap-2 lg:gap-4">
          <a
            href="https://github.com/xiongaox/Orbis"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            title="GitHub 仓库"
          >
            <svg viewBox="0 0 200 200" className="w-5 h-5 text-muted-foreground" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M167.06 3.12138C164.926 2.58792 154.292 0.432819 132.085 14.8372C113.563 10.3906 94.1665 10.3901 75.6441 14.8362C53.8777 0.430872 42.7949 2.58932 40.6665 3.12138L40.5601 3.14775L40.4614 3.19657C39.9556 3.44948 39.3299 3.82479 38.7603 4.26786C38.2118 4.69447 37.6148 5.26002 37.2866 5.9163L37.2749 5.94072L37.2642 5.96513C32.7053 16.4506 32.1695 27.8564 35.687 37.9778C28.0381 47.1982 23.9995 59.0574 23.9995 70.9095C23.9996 93.6227 30.7761 108.334 40.6099 117.877C50.0335 127.022 62.1532 131.309 73.4536 133.459C70.661 138.798 69.4839 144.871 69.9087 150.934V153.754C59.3585 156.218 52.5545 155.269 47.4995 152.689C42.4513 150.112 39.0103 145.857 35.2715 141.234C35.1373 141.068 35.0027 140.901 34.8677 140.735L34.8589 140.724L33.1802 138.698C29.2607 133.978 25.1406 129.363 18.4732 127.679C17.0025 127.124 15.4549 127.445 14.2505 128.181C13.0572 128.91 12.0834 130.115 11.7691 131.527C11.2137 132.997 11.535 134.545 12.271 135.749C13.0133 136.964 14.2481 137.953 15.6919 138.249C17.4789 138.646 19.1371 139.754 20.8384 141.401C22.4617 142.972 24.0477 144.955 25.7776 147.119C25.8649 147.228 25.9525 147.338 26.0405 147.448C26.2073 147.654 26.3754 147.862 26.545 148.072C30.2807 152.696 34.7315 158.205 41.3892 161.898C48.1828 165.666 57.175 167.497 69.9087 164.873V182.728C69.9088 184.318 70.4436 185.722 71.4517 186.73C72.4599 187.738 73.8637 188.273 75.4546 188.273C77.0453 188.273 78.4484 187.738 79.4566 186.73C80.4647 185.722 80.9994 184.319 80.9995 182.728V150.421L80.9976 150.388C80.5614 143.845 82.7369 137.746 87.1021 132.945C88.2954 131.72 88.7546 129.532 88.2427 127.485C87.7139 125.37 86.064 123.579 83.7017 123.546C71.4977 122.186 59.3765 119.257 50.3023 111.621C41.2662 104.018 35.0904 91.6055 35.0903 70.9095C35.0904 60.7502 39.0534 51.0205 46.1187 43.4808C47.016 42.8334 47.4427 41.902 47.5806 40.9368C47.7201 39.96 47.5756 38.9082 47.3335 37.9397L47.3179 37.8782L47.2954 37.8196L47.0142 37.0716C44.3014 29.5815 44.2799 21.3512 46.603 13.8352C50.4917 14.4429 58.7727 16.5847 72.1782 25.3821L72.2271 25.4134L72.2798 25.4397C73.2577 25.9287 74.9026 26.5172 76.6284 25.9642C94.6341 21.0126 113.993 21.0121 132 25.9622C133.453 26.4372 135.24 26.5491 136.537 25.3265C149.88 16.1649 158.131 14.3854 162.03 13.8294C164.433 21.5981 164.331 30.1301 161.34 37.8196L161.332 37.8421L161.324 37.8655C160.814 39.3959 160.754 41.5702 162.318 43.2718L162.474 43.4349C169.566 50.981 173.545 60.7296 173.545 70.9095C173.545 91.8364 167.367 104.245 158.335 111.789C149.253 119.377 137.116 122.193 124.889 123.552L124.784 123.564L124.683 123.597C123.33 124.048 121.096 125.064 120.439 127.318C119.305 129.186 120.04 131.43 121.533 132.946C125.891 137.74 128.076 143.837 127.638 150.847L127.636 150.878V183.182C127.636 184.773 128.171 186.177 129.179 187.185C130.187 188.193 131.591 188.728 133.181 188.728C134.761 188.728 136.169 188.2 137.127 187.242C138.076 186.293 138.521 184.977 138.272 183.554V151.858C138.699 145.796 137.525 139.323 134.724 133.914C146.019 131.773 158.142 127.596 167.569 118.504C177.406 109.016 184.181 94.3013 184.181 71.3636C184.181 59.4889 180.127 48.0608 172.467 38.8558C175.546 27.9146 175.036 16.9512 170.471 6.43974C169.909 4.81164 168.775 3.68998 167.134 3.14286L167.097 3.13017L167.06 3.12138Z" fill="currentColor" />
            </svg>
          </a>


          {/* 联系作者 */}
          <button
            type="button"
            onClick={() => setShowContactModal(true)}
            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            title="联系作者"
          >
            <svg viewBox="0 0 200 200" className="w-5 h-5 text-muted-foreground" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M182.142 161.674C182.142 161.674 182.479 175.827 182.468 182.437C182.468 183.374 179.126 184.248 178.189 184.205L159.374 174.605C153.195 176.542 146.759 177.531 140.284 177.537C117.853 177.537 98.3474 166.227 88.2526 149.542C84.0474 150.211 79.7947 150.558 75.5368 150.579C68.1263 150.579 60.7526 149.6 53.6 147.663L32.6 159.784C32.6 159.784 26.8842 162.59 23.9632 161.216C22.9584 160.715 22.1923 159.837 21.8316 158.774L25.9632 133.948C10.0789 121.6 0 103.469 0 83.1949C0 45.9739 33.8158 15.7949 75.5368 15.7949C112.358 15.7949 142.989 39.3265 149.663 70.4528C177.974 74.5581 199.611 96.7633 199.611 123.637C199.621 138.526 192.9 151.942 182.142 161.684V161.674ZM138.384 69.7949C131.495 45.0054 106.005 26.5739 75.5474 26.5739C39.7895 26.5739 10.8053 51.9265 10.8053 83.1897C10.8053 99.937 19.1789 114.937 32.3895 125.3L37.8053 128.632L34.9211 146L52.5 135.874L53.9737 136.537C60.9579 138.705 68.2316 139.816 75.5474 139.826C78.2421 139.826 80.9 139.627 83.5211 139.342C81.8103 134.285 80.9374 128.981 80.9368 123.642C80.9368 93.8633 107.516 69.7212 140.289 69.7212C139.626 69.7107 139.016 69.7686 138.379 69.7949H138.384ZM91.7211 123.632C91.7211 147.463 113.458 166.779 140.284 166.779C148.047 166.779 153.558 165.879 160.074 163L167.263 166.779L172.826 169.932L173.053 155.405C183.174 147.484 188.847 136.527 188.847 123.632C188.847 99.8002 167.111 80.5002 140.284 80.5002C113.468 80.5002 91.7211 99.816 91.7211 123.632ZM160.479 120.758C159.231 120.84 157.98 120.672 156.798 120.262C155.617 119.853 154.529 119.211 153.6 118.375C152.67 117.538 151.918 116.524 151.387 115.392C150.855 114.26 150.557 113.033 150.507 111.784C150.458 110.534 150.66 109.288 151.1 108.117C151.54 106.947 152.211 105.877 153.072 104.97C153.932 104.063 154.966 103.337 156.112 102.836C157.257 102.335 158.492 102.069 159.742 102.053C162.182 102.021 164.538 102.944 166.309 104.624C168.079 106.303 169.123 108.608 169.219 111.047C169.315 113.485 168.455 115.865 166.823 117.679C165.19 119.493 162.914 120.598 160.479 120.758ZM122.653 120.769C121.406 120.797 120.167 120.575 119.007 120.117C117.847 119.66 116.791 118.974 115.9 118.102C115.008 117.23 114.301 116.189 113.818 115.039C113.335 113.889 113.088 112.655 113.089 111.408C113.09 110.161 113.341 108.927 113.826 107.778C114.312 106.63 115.022 105.59 115.915 104.72C116.808 103.85 117.866 103.167 119.026 102.712C120.187 102.256 121.427 102.038 122.674 102.069C125.098 102.153 127.395 103.177 129.079 104.923C130.764 106.67 131.703 109.003 131.7 111.429C131.696 113.855 130.75 116.185 129.061 117.927C127.372 119.668 125.072 120.685 122.647 120.763L122.653 120.769ZM96.7053 53.216C99.148 53.2739 101.471 54.285 103.178 56.0331C104.886 57.7813 105.841 60.1278 105.841 62.5712C105.841 65.0147 104.886 67.3612 103.178 69.1093C101.471 70.8575 99.148 71.8686 96.7053 71.9265C91.5158 71.9423 87.3316 67.7423 87.3316 62.5791C87.3316 57.416 91.5263 53.216 96.7053 53.216ZM52.5316 72.2476C51.2844 72.2782 50.0437 72.0591 48.8824 71.6032C47.7211 71.1473 46.6627 70.4639 45.7694 69.593C44.8761 68.7221 44.166 67.6814 43.6808 66.532C43.1956 65.3827 42.9451 64.1479 42.944 62.9004C42.943 61.6528 43.1914 60.4176 43.6747 59.2675C44.1579 58.1173 44.8663 57.0754 45.7581 56.203C46.6499 55.3306 47.7072 54.6454 48.8677 54.1875C50.0282 53.7297 51.2686 53.5085 52.5158 53.537C54.9586 53.5929 57.2827 54.602 58.9914 56.3487C60.7 58.0954 61.6577 60.4411 61.6598 62.8846C61.6619 65.328 60.7081 67.6754 59.0024 69.425C57.2967 71.1746 54.9743 72.1876 52.5316 72.2476Z" fill="currentColor" />
            </svg>
          </button>

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
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
              disabled={loading}
            >
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                {loading ? (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                ) : isAuthenticated ? (
                  <img src={avatarPath} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {loading ? '加载中...' : isAuthenticated ? displayName : '未登录'}
              </span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 animate-fade-in">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => {
                        setShowBirthdayModal(true);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      设置生日
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordModal(true);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      修改密码
                    </button>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
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

      {/* Birthday Picker Modal */}
      <AdvancedDatePicker
        isOpen={showBirthdayModal}
        onClose={() => setShowBirthdayModal(false)}
        onConfirm={handleBirthdayConfirm}
        value={birthDate}
        hideBazi={true}
      />

      {/* 联系作者弹窗 */}
      <BaseModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="联系作者"
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col items-center justify-center p-4 gap-4">
          <div className="w-full max-w-[280px] rounded-lg overflow-hidden flex items-center justify-center">
            {import.meta.env.VITE_AUTHOR_QR_URL ? (
              <img
                src={import.meta.env.VITE_AUTHOR_QR_URL}
                alt="微信二维码"
                className="w-full h-auto object-contain"
              />
            ) : (
              <span className="text-sm text-muted-foreground">未配置二维码</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            扫码添加作者微信<br />
            <span className="text-xs opacity-70">请注明来意</span>
          </p>
        </div>
      </BaseModal>
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}
