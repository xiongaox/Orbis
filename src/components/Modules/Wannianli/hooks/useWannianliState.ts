/**
 * useWannianliState - 应用源码层
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
 * - `CalendarDay`, `useWannianliState`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lunar-typescript`、内部模块 `useLayoutMode`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useState, useMemo } from 'react';
import { Solar, Lunar, HolidayUtil } from 'lunar-typescript';
import { useLayoutMode } from '../../../../hooks/useLayoutMode';

export interface CalendarDay {
    solar: Solar;
    lunar: Lunar;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    bottomText: string;
    ganZhi: string;
    isJieQi: boolean;
    holiday: ReturnType<typeof HolidayUtil.getHoliday>;
    isWork: boolean;
    isHoliday: boolean;
    isWeekend: boolean;
}

export function useWannianliState() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [weekStart, setWeekStart] = useState<0 | 1>(1); // 0: 周日开始, 1: 周一开始
    const [isCountdownOpen, setIsCountdownOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const { isPadLandscape, useDesktopLayout, isMobile } = useLayoutMode();
    const isMobileLayout = isMobile || (!useDesktopLayout && !isPadLandscape);

    const calendarData = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth() + 1;
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const dayOfWeek = firstDayOfMonth.getDay();
        const prefixDays = (dayOfWeek - weekStart + 7) % 7;

        const days: CalendarDay[] = [];
        const solarFirst = Solar.fromYmd(year, month, 1);
        const startSolar = solarFirst.next(-prefixDays);

        for (let i = 0; i < 42; i++) {
            const currentSolar = startSolar.next(i);
            const currentLunar = currentSolar.getLunar();

            const isToday = currentSolar.toYmd() === Solar.fromDate(new Date()).toYmd();
            const isSelected = currentSolar.toYmd() === Solar.fromDate(selectedDate).toYmd();
            const isCurrentMonth = currentSolar.getMonth() === month;

            let bottomText = '';
            const jieQi = currentLunar.getJieQi();
            if (jieQi) {
                bottomText = jieQi;
            } else {
                const festivals = currentLunar.getFestivals();
                if (festivals.length > 0) {
                    bottomText = festivals[0];
                } else {
                    bottomText = currentLunar.getDayInChinese();
                    if (bottomText === '初一') {
                        bottomText = currentLunar.getMonthInChinese() + '月';
                    }
                }
            }

            const holidayInfo = HolidayUtil.getHoliday(currentSolar.toYmd());
            const isWork = holidayInfo ? holidayInfo.isWork() : false;
            const isHoliday = holidayInfo ? !holidayInfo.isWork() : false;

            days.push({
                solar: currentSolar,
                lunar: currentLunar,
                isCurrentMonth,
                isToday,
                isSelected,
                bottomText,
                ganZhi: currentLunar.getDayInGanZhi(),
                isJieQi: !!jieQi,
                holiday: holidayInfo,
                isWork,
                isHoliday,
                isWeekend: currentSolar.getWeek() === 0 || currentSolar.getWeek() === 6
            });
        }
        return days;
    }, [viewDate, selectedDate, weekStart]);

    return {
        // Core Layout
        isPadLandscape,
        useDesktopLayout,
        isMobileLayout,

        // State variables
        selectedDate, setSelectedDate,
        viewDate, setViewDate,
        isDatePickerOpen, setIsDatePickerOpen,
        weekStart, setWeekStart,
        isCountdownOpen, setIsCountdownOpen,
        isDetailOpen, setIsDetailOpen,

        // Derived logic
        calendarData
    };
}
