/**
 * WannianliLayoutProps - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `WannianliLayoutProps`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `useWannianliState`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

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
