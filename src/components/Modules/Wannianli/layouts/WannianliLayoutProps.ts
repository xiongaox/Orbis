import type { CalendarDay } from '../hooks/useWannianliState';

export interface WannianliLayoutProps {
    // 布局模式
    isPadLandscape: boolean;
    useDesktopLayout: boolean;
    isMobileLayout: boolean;

    // 核心状态
    selectedDate: Date;
    setSelectedDate: (d: Date) => void;
    viewDate: Date;
    setViewDate: (d: Date) => void;
    weekStart: 0 | 1;
    setWeekStart: (w: 0 | 1) => void;

    // 抽屉和弹窗开关
    isDatePickerOpen: boolean;
    setIsDatePickerOpen: (v: boolean) => void;
    isCountdownOpen: boolean;
    setIsCountdownOpen: (v: boolean) => void;
    isDetailOpen: boolean;
    setIsDetailOpen: (v: boolean) => void;

    // 已计算的网格数据
    calendarData: CalendarDay[];
}
