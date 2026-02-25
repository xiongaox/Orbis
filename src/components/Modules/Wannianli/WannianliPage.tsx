import { useState, useMemo } from 'react';
import { Solar, Lunar, HolidayUtil } from 'lunar-typescript';
import AdvancedDatePicker from '../../Common/AdvancedDatePicker';
import classNames from 'classnames';
import HolidayCountdown from './HolidayCountdown';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import SideDrawer from '../../UI/SideDrawer';
import { useIsPadLandscape } from '../../../hooks/useIsPadLandscape';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export default function WannianliPage() {
    // 状态管理
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewDate, setViewDate] = useState<Date>(new Date()); // 用于控制日历显示的月份
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [weekStart, setWeekStart] = useState<0 | 1>(1); // 0: 周日开始, 1: 周一开始
    const isPadLandscape = useIsPadLandscape();
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const useDesktopLayout = isDesktop && !isPadLandscape;
    const isMobileLayout = !useDesktopLayout && !isPadLandscape;

    const [isCountdownOpen, setIsCountdownOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // 计算当月网格数据
    const calendarData = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth() + 1;

        // 当月第一天
        const firstDayOfMonth = new Date(year, month - 1, 1);
        // 当月第一天是周几 (0-6)
        const dayOfWeek = firstDayOfMonth.getDay();

        // 根据起始日计算前置天数
        // 如果 weekStart=1 (周一), dayOfWeek=0 (周日) -> (0 - 1 + 7) % 7 = 6
        // 如果 weekStart=1 (周一), dayOfWeek=1 (周一) -> (1 - 1 + 7) % 7 = 0
        const prefixDays = (dayOfWeek - weekStart + 7) % 7;

        const days = [];

        // 生成 42 个格子 (6行 * 7列)
        const solarFirst = Solar.fromYmd(year, month, 1);
        const startSolar = solarFirst.next(-prefixDays);

        for (let i = 0; i < 42; i++) {
            const currentSolar = startSolar.next(i);
            const currentLunar = currentSolar.getLunar();

            const isToday = currentSolar.toYmd() === Solar.fromDate(new Date()).toYmd();
            const isSelected = currentSolar.toYmd() === Solar.fromDate(selectedDate).toYmd();
            const isCurrentMonth = currentSolar.getMonth() === month;

            // 获取节日/节气
            let bottomText = '';
            // 优先显示节气
            const jieQi = currentLunar.getJieQi();
            if (jieQi) {
                bottomText = jieQi;
            } else {
                // 其次显示农历日 或者 节日
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

            // 获取法定节假日信息
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

    const renderWeekHeader = () => {
        const weekDays = weekStart === 1
            ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

        return (
            <div className={classNames(
                'grid grid-cols-7 shrink-0',
                isMobileLayout ? 'gap-1 px-1 py-1.5' : 'gap-2 px-2 py-2'
            )}>
                {weekDays.map((d, i) => (
                    <div key={i} className={classNames(
                        'flex items-center justify-center rounded-lg border border-border/40 bg-card/50 shadow-sm transition-colors',
                        isMobileLayout ? 'py-1.5 text-xs font-medium' : 'py-2 text-base md:text-sm font-medium tracking-widest',
                        (d === '周日' || d === '周六')
                            ? "text-primary/80 bg-primary/5 border-primary/20"
                            : "text-muted-foreground/70"
                    )}>
                        {d}
                    </div>
                ))}
            </div>
        );
    };

    const renderCalendarHeader = () => {
        const viewLunar = Lunar.fromDate(viewDate);
        const selectedLunar = Lunar.fromDate(selectedDate);
        const selectedWeekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][selectedDate.getDay()];

        const headerClassName = classNames(
            'border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-30',
            isMobileLayout
                ? 'px-3 py-2 flex flex-col items-start gap-2'
                : `flex items-center justify-between ${isPadLandscape ? 'px-4 py-3' : 'px-6 py-4'}`
        );

        const monthControl = (
            <div className={classNames(
                'flex items-center gap-1 bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none p-1 rounded-xl border border-transparent dark:border-border/60 shrink-0',
                isMobileLayout ? 'h-10' : 'h-[42px]'
            )}>
                <button
                    onClick={() => {
                        const d = new Date(viewDate);
                        d.setDate(1);
                        d.setMonth(d.getMonth() - 1);
                        setViewDate(d);
                    }}
                    className="h-full px-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center justify-center"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                    onClick={() => setIsDatePickerOpen(true)}
                    className="h-full flex items-center gap-2 px-3 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all group"
                >
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-mono font-medium tracking-tight">{viewDate.getFullYear()}-{String(viewDate.getMonth() + 1).padStart(2, '0')}</span>
                </button>

                <button
                    onClick={() => {
                        const d = new Date(viewDate);
                        d.setDate(1);
                        d.setMonth(d.getMonth() + 1);
                        setViewDate(d);
                    }}
                    className="h-full px-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center justify-center"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );

        const todayControl = (
            <button
                onClick={() => {
                    setViewDate(new Date());
                    setSelectedDate(new Date());
                }}
                className={classNames(
                    'flex items-center justify-center font-medium rounded-xl border border-transparent dark:border-border/60 bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-md hover:-translate-y-0.5 text-muted-foreground hover:text-primary transition-all shrink-0',
                    isMobileLayout ? 'h-10 px-3 text-xs' : 'h-[42px] px-4 text-sm'
                )}
            >
                今日
            </button>
        );

        const weekToggleControl = (
            <div className={classNames(
                'flex bg-muted p-1 rounded-xl border border-border/40 shrink-0',
                isMobileLayout ? 'h-10' : 'h-[42px]'
            )}>
                <button
                    onClick={() => setWeekStart(1)}
                    className={classNames(
                        "w-9 h-full rounded-lg text-sm font-medium transition-all flex items-center justify-center",
                        weekStart === 1
                            ? "bg-background text-primary shadow-sm"
                            : "text-muted-foreground/70 hover:text-foreground hover:bg-background/40"
                    )}
                >
                    一
                </button>
                <button
                    onClick={() => setWeekStart(0)}
                    className={classNames(
                        "w-9 h-full rounded-lg text-sm font-medium transition-all flex items-center justify-center",
                        weekStart === 0
                            ? "bg-background text-primary shadow-sm"
                            : "text-muted-foreground/70 hover:text-foreground hover:bg-background/40"
                    )}
                >
                    日
                </button>
            </div>
        );

        const countdownControl = (
            <button
                type="button"
                onClick={() => setIsCountdownOpen(true)}
                className="h-10 px-3 rounded-xl border border-border bg-card/60 text-sm text-foreground hover:bg-muted/40 transition-colors shrink-0"
            >
                倒计时
            </button>
        );

        return (
            <div className={headerClassName}>
                {isMobileLayout ? (
                    <>
                        <div className="w-full flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-5xl font-serif font-bold text-foreground leading-none">
                                        {selectedDate.getDate()}
                                    </h3>
                                    <span className="text-base font-serif font-light text-muted-foreground/70">
                                        / {selectedDate.getMonth() + 1}月 · {selectedDate.getFullYear()}
                                    </span>
                                </div>

                                <div className="mt-1 flex items-center gap-2">
                                    <div className="px-2.5 py-0.5 rounded-[4px] bg-[#2a2422] border border-[#3e3632] shadow-sm">
                                        <span className="text-[#e2d5c5] text-xs font-medium tracking-wide font-serif">
                                            {selectedLunar.getMonthInChinese()}月{selectedLunar.getDayInChinese()}
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground/70 font-serif">{selectedWeekday}</span>
                                </div>
                            </div>

                            <div className="pt-1 shrink-0 flex flex-col items-end">
                                <h2 className="font-serif font-bold text-xl text-foreground/85 tracking-wide whitespace-nowrap text-right">
                                    {viewLunar.getYearInGanZhi()}年·{viewLunar.getMonthInGanZhi().charAt(1)}月
                                </h2>
                                <div className="mt-2 flex items-center justify-end gap-2">
                                    {todayControl}
                                    {weekToggleControl}
                                </div>
                            </div>
                        </div>

                        <div className="w-full flex items-center justify-between gap-2">
                            <div className="flex items-center gap-4 text-[11px] text-muted-foreground/75">
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    休假
                                </span>
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                                    补班
                                </span>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                {countdownControl}
                                {monthControl}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-baseline gap-3 min-w-0">
                            <h2 className="font-serif font-bold text-2xl text-foreground flex items-baseline tracking-widest truncate">
                                <span className="text-foreground/80">
                                    {viewLunar.getYearInGanZhi()}年·{viewLunar.getMonthInGanZhi().charAt(1)}月
                                </span>
                            </h2>
                        </div>

                        <div className="flex items-center gap-2">
                            {monthControl}
                            {todayControl}
                            {weekToggleControl}
                        </div>
                    </>
                )}
            </div>
        );
    };

    const detailPanel = (
        <div className={classNames(
            'flex flex-col bg-muted/5',
            isMobileLayout ? 'h-auto min-h-0' : 'h-full min-h-0'
        )}>
            {!isMobileLayout && (
                <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border/50 bg-background/50 backdrop-blur-sm">
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-foreground leading-none">
                            {selectedDate.getDate()}
                        </h3>
                        <span className="text-lg sm:text-2xl font-serif font-light text-muted-foreground/60">
                            / {selectedDate.getMonth() + 1}月 · {selectedDate.getFullYear()}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                        <div className="px-3 py-1 rounded-[4px] bg-[#2a2422] border border-[#3e3632] flex items-center justify-center shadow-sm">
                            <span className="text-[#e2d5c5] text-sm font-medium tracking-wide font-serif">
                                {Lunar.fromDate(selectedDate).getMonthInChinese()}月{Lunar.fromDate(selectedDate).getDayInChinese()}
                            </span>
                        </div>
                        <div className="text-base text-muted-foreground/60 font-serif">
                            {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][selectedDate.getDay()]}
                        </div>
                    </div>
                </div>
            )}

            <div className={classNames(
                'space-y-6',
                isMobileLayout ? 'p-4' : 'flex-1 p-4 sm:p-6 overflow-y-auto'
            )}>
                {/* 四柱干支 (Original Layout) */}
                <div className="space-y-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-3 bg-primary rounded-full"></span>
                        四柱干支
                    </div>
                    <div className={classNames(
                        'grid',
                        isMobileLayout ? 'grid-cols-4 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-3'
                    )}>
                        {[
                            { label: '年柱', val: Lunar.fromDate(selectedDate).getYearInGanZhi() },
                            { label: '月柱', val: Lunar.fromDate(selectedDate).getMonthInGanZhi() },
                            { label: '日柱', val: Lunar.fromDate(selectedDate).getDayInGanZhi() },
                            { label: '时柱', val: Lunar.fromDate(selectedDate).getTimeInGanZhi() }
                        ].map((item, i) => (
                            <div
                                key={i}
                                className={classNames(
                                    'bg-background border border-border/50 rounded-xl flex flex-col items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 dark:hover:bg-primary/5',
                                    isMobileLayout ? 'h-24 py-2' : 'h-28 py-3'
                                )}
                            >
                                <div className="text-[10px] text-muted-foreground/60 font-medium tracking-widest uppercase">{item.label}</div>
                                <div className="flex-1 flex flex-col justify-center gap-1">
                                    <span className="font-serif text-xl font-bold text-foreground/90">{item.val[0]}</span>
                                    <span className="font-serif text-xl font-bold text-foreground/90">{item.val[1]}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 基础信息卡片 (生肖、星座、节日...) */}
                <div className="bg-card/40 border border-border/40 rounded-xl overflow-hidden p-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {[
                            {
                                label: '生肖',
                                className: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
                                content: Lunar.fromDate(selectedDate).getYearShengXiao()
                            },
                            {
                                label: '星座',
                                className: 'text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/20',
                                content: Solar.fromDate(selectedDate).getXingZuo()
                            },
                            {
                                label: '月相',
                                className: 'text-stone-600 dark:text-stone-400 bg-stone-500/10 border-stone-500/20',
                                content: Lunar.fromDate(selectedDate).getYueXiang()
                            },
                            {
                                label: '物候',
                                className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                                content: Lunar.fromDate(selectedDate).getWuHou()
                            }
                        ].map((row, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2"
                            >
                                <span className={classNames(
                                    "px-1.5 py-0.5 rounded text-[11px] font-medium border shrink-0 min-w-[36px] text-center",
                                    row.className
                                )}>
                                    {row.label}
                                </span>
                                <span className="text-sm text-foreground/80 font-medium truncate">
                                    {row.content}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 宜忌 - 卡片式设计 */}
                <div className="space-y-3">
                    {/* 宜 */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shrink-0 font-serif">
                                宜
                            </div>
                            <div className="flex flex-wrap gap-x-1 gap-y-1 text-[13px] leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">
                                {Lunar.fromDate(selectedDate).getDayYi().map((yi, i) => (
                                    <span key={i}>
                                        {yi}{i < Lunar.fromDate(selectedDate).getDayYi().length - 1 ? '，' : ''}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 忌 */}
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-base shrink-0 font-serif">
                                忌
                            </div>
                            <div className="flex flex-wrap gap-x-1 gap-y-1 text-[13px] leading-relaxed text-rose-900/80 dark:text-rose-200/80">
                                {Lunar.fromDate(selectedDate).getDayJi().map((ji, i) => (
                                    <span key={i}>
                                        {ji}{i < Lunar.fromDate(selectedDate).getDayJi().length - 1 ? '，' : ''}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 神煞方位 */}
                <div className="bg-card/40 border border-border/40 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                        今日诸神方位
                    </h4>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        {[
                            { label: '喜神', val: Lunar.fromDate(selectedDate).getPositionXiDesc() },
                            { label: '福神', val: Lunar.fromDate(selectedDate).getPositionFuDesc() },
                            { label: '财神', val: Lunar.fromDate(selectedDate).getPositionCaiDesc() },
                            { label: '太岁', val: Lunar.fromDate(selectedDate).getDayPositionTaiSuiDesc() },
                            { label: '阳贵神', val: Lunar.fromDate(selectedDate).getPositionYangGuiDesc() },
                            { label: '阴贵神', val: Lunar.fromDate(selectedDate).getPositionYinGuiDesc() },
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className="font-bold text-foreground/90">{item.val}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={classNames(
            'flex flex-1 h-full min-h-0 overflow-hidden relative bg-background',
            useDesktopLayout ? 'flex-row' : 'flex-col'
        )}>
            {/* 左侧倒计时：Pad 横屏改为抽屉 */}
            {useDesktopLayout && (
                <HolidayCountdown
                    onSelectDate={(date) => {
                        setSelectedDate(date);
                        setViewDate(date);
                    }}
                />
            )}

            {/* 中间日历区域 */}
            <main className={classNames(
                "w-full flex-shrink-0 flex flex-col min-h-0",
                isPadLandscape
                    ? 'h-full border-r-0'
                    : useDesktopLayout
                        ? 'h-full w-[65%] border-r border-border/50'
                        : 'h-full'
                ,
                isMobileLayout && 'overflow-y-auto'
            )}>
                {renderCalendarHeader()}

                <div className={classNames(
                    isMobileLayout
                        ? 'flex flex-col bg-muted/5 relative items-stretch justify-start p-2 pt-1'
                        : 'flex-1 flex flex-col overflow-hidden bg-muted/5 relative items-center justify-center p-4'
                )}>
                    {/* Pad 横屏：左右贴边竖线把手 - 复用 MainLayout 统一样式 */}
                    {isPadLandscape && (
                        <>
                            <button
                                type="button"
                                onClick={() => setIsCountdownOpen(true)}
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-start group focus:outline-none"
                                aria-label="打开节日倒计时"
                            >
                                <span className="w-[3px] h-20 rounded-r bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">
                                        倒计时
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsDetailOpen(true)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-end group focus:outline-none"
                                aria-label="打开日期详情"
                            >
                                <span className="w-[3px] h-20 rounded-l bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">
                                        详情
                                    </span>
                                </span>
                            </button>
                        </>
                    )}

                    {/* 网格容器 - 奇门风格：分离卡片 */}
                    <div className={classNames(
                        'w-full flex flex-col',
                        isMobileLayout ? 'max-w-none justify-start' : 'max-w-4xl flex-1 justify-center'
                    )}>
                        {renderWeekHeader()}
                        <div className={classNames(
                            isMobileLayout
                                ? 'grid grid-cols-7 gap-1 px-1'
                                : 'flex-1 grid grid-cols-7 grid-rows-6 gap-2 px-2 mt-2'
                        )}>
                            {calendarData.map((day, index) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        const date = new Date(day.solar.getYear(), day.solar.getMonth() - 1, day.solar.getDay());
                                        setSelectedDate(date);
                                        if (!day.isCurrentMonth) {
                                            setViewDate(date);
                                        }
                                    }}
                                    className={classNames(
                                        'relative flex flex-col justify-center transition-all duration-200 cursor-pointer group',
                                        isMobileLayout ? 'aspect-square rounded-lg p-1' : 'rounded-xl p-1 md:p-2',
                                        // 基础卡片样式：Light Mode 下使用阴影+白底+微边框，Dark Mode 下使用边框
                                        "bg-card shadow-[0_2px_6px_rgba(0,0,0,0.02)] border border-border/40 dark:border-border/40 dark:shadow-none",
                                        "hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:z-10",

                                        // 背景色逻辑：选中 > 节日(叠加)
                                        day.isSelected
                                            ? "!bg-primary/10 !border-transparent shadow-none !opacity-100 z-20"
                                            : day.isHoliday
                                                ? "bg-red-100/50 dark:bg-red-900/20 border-red-500/20 dark:border-red-500/20" // 节日微红背景(red-100) + 红色描边
                                                : "",

                                        !day.isCurrentMonth && !day.isSelected && "opacity-40 grayscale-[0.8] shadow-none bg-muted/30 border-transparent",
                                    )}
                                >
                                    {/* 休/班 角标 */}
                                    {isMobileLayout ? (
                                        (day.isHoliday || day.isWork) && (
                                            <span
                                                className={classNames(
                                                    'absolute top-1 right-1 w-1.5 h-1.5 rounded-full',
                                                    day.isHoliday ? 'bg-red-500' : 'bg-slate-400'
                                                )}
                                            />
                                        )
                                    ) : (
                                        <>
                                            {day.isHoliday && (
                                                <div className="absolute top-1 right-1 w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center bg-red-500 text-white opacity-90">
                                                    休
                                                </div>
                                            )}
                                            {day.isWork && (
                                                <div className="absolute top-1 right-1 w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center bg-slate-500 text-white opacity-90">
                                                    班
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="flex flex-col items-center justify-center z-10 w-full gap-0.5">
                                        <span className={classNames(
                                            'font-mono transition-all leading-none mb-0.5',
                                            isMobileLayout ? 'text-lg' : 'text-2xl md:text-3xl',
                                            day.isToday
                                                ? "text-primary drop-shadow-[0_2px_8px_rgba(var(--primary),0.3)]"
                                                : day.isSelected
                                                    ? "text-primary"
                                                    : (day.isHoliday || (day.isWeekend && !day.isWork))
                                                        ? "text-red-500/80" // 节假日或周末（非补班）标红
                                                        : "text-foreground group-hover:text-primary",
                                            !day.isCurrentMonth && !day.isToday && !day.isSelected && "text-muted-foreground/30"
                                        )}>
                                            {day.solar.getDay()}
                                        </span>

                                        <span className={classNames(
                                            'font-bold truncate leading-none',
                                            isMobileLayout ? 'text-[11px] px-1' : 'text-[16px] px-2',
                                            day.isSelected || day.isJieQi
                                                ? "text-primary/100"
                                                : day.isHoliday
                                                    ? "text-red-500/60" // 节日名称降低透明度
                                                    : "text-muted-foreground/60"
                                        )}>
                                            {day.bottomText}
                                        </span>

                                        <span className={classNames(
                                            'font-serif leading-none mt-1',
                                            isMobileLayout ? 'text-[10px]' : 'text-[14.4px]',
                                            day.isSelected ? "text-primary/80" : "text-muted-foreground/60"
                                        )}>
                                            {day.ganZhi}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {isMobileLayout && (
                    <section className="mt-2 border-t border-border/40 bg-background/70 backdrop-blur-sm">
                        {detailPanel}
                    </section>
                )}
            </main>

            {/* 右侧详情区域：Pad 横屏改为抽屉 */}
            {useDesktopLayout && (
                <aside className="flex-1 min-h-0 flex flex-col border-l border-border/50">
                    {detailPanel}
                </aside>
            )}

            {!useDesktopLayout && (
                <SideDrawer
                    open={isCountdownOpen}
                    title="节日倒计时"
                    side={isPadLandscape ? 'left' : 'right'}
                    size={isPadLandscape ? 'sm' : 'xs'}
                    hideHeader={isPadLandscape}
                    onClose={() => setIsCountdownOpen(false)}
                >
                    <HolidayCountdown
                        variant="drawer"
                        onSelectDate={(date) => {
                            setSelectedDate(date);
                            setViewDate(date);
                            setIsCountdownOpen(false);
                        }}
                    />
                </SideDrawer>
            )}

            {isPadLandscape && (
                <>
                    <SideDrawer
                        open={isDetailOpen}
                        title="日期详情"
                        side="right"
                        hideHeader={isPadLandscape}
                        onClose={() => setIsDetailOpen(false)}
                    >
                        {detailPanel}
                    </SideDrawer>
                </>
            )}

            {/* 日期选择弹窗 - 复用组件 */}
            <AdvancedDatePicker
                value={selectedDate}
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                hideBazi={true}
                onConfirm={(date) => {
                    setSelectedDate(date);
                    setViewDate(date);
                    setIsDatePickerOpen(false);
                }}
            />
        </div>
    );
}
