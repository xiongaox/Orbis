import { useState, useMemo } from 'react';
import { Solar, Lunar, HolidayUtil } from 'lunar-typescript';
import AdvancedDatePicker from '../../Common/AdvancedDatePicker';
import classNames from 'classnames';
import HolidayCountdown from './HolidayCountdown';
import { Calendar, ChevronLeft, ChevronRight, Timer, ListTodo } from 'lucide-react';
import SideDrawer from '../../UI/SideDrawer';
import { useIsPadLandscape } from '../../../hooks/useIsPadLandscape';

export default function WannianliPage() {
    // 状态管理
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewDate, setViewDate] = useState<Date>(new Date()); // 用于控制日历显示的月份
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [weekStart, setWeekStart] = useState<0 | 1>(1); // 0: 周日开始, 1: 周一开始
    const isPadLandscape = useIsPadLandscape();

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
            <div className="grid grid-cols-7 gap-2 px-2 py-2 shrink-0">
                {weekDays.map((d, i) => (
                    <div key={i} className={classNames(
                        "flex items-center justify-center py-2 rounded-lg border border-border/40 bg-card/50 shadow-sm",
                        "text-base md:text-sm font-medium tracking-widest transition-colors",
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
        const headerPaddingClass = isPadLandscape ? 'px-4 py-3' : 'px-6 py-4';

        const controls = (
            <>
                <div className="flex items-center gap-1 bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none p-1 rounded-xl border border-transparent dark:border-border/60 h-[42px] shrink-0">
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

                    {/* 时间选择器按钮 */}
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

                {/* 今日按钮 - 固定 42px 高度 */}
                <button
                    onClick={() => {
                        setViewDate(new Date());
                        setSelectedDate(new Date());
                    }}
                    className="h-[42px] px-4 flex items-center justify-center text-sm font-medium rounded-xl border border-transparent dark:border-border/60 bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-md hover:-translate-y-0.5 text-muted-foreground hover:text-primary transition-all shrink-0"
                >
                    今日
                </button>

                {/* 周首切换开关 */}
                <div className="flex bg-muted p-1 rounded-xl border border-border/40 h-[42px] shrink-0">
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
            </>
        );

        return (
            <div className={`flex items-center justify-between ${headerPaddingClass} border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-30`}>
                <div className="flex items-baseline gap-4 min-w-0">
                    <h2 className="text-2xl font-serif font-bold text-foreground flex items-baseline tracking-widest truncate">
                        <span className="text-foreground/80">
                            {Lunar.fromDate(viewDate).getYearInGanZhi()}年·{Lunar.fromDate(viewDate).getMonthInGanZhi().charAt(1)}月
                        </span>
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    {controls}
                </div>
            </div>
        );
    };

    const detailPanel = (
        <div className="h-full min-h-0 flex flex-col bg-muted/5">
            {/* 头部：选中日期 */}
            <div className="px-6 pt-6 pb-4 border-b border-border/50 bg-background/50 backdrop-blur-sm">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-6xl font-serif font-bold text-foreground leading-none">
                        {selectedDate.getDate()}
                    </h3>
                    <span className="text-2xl font-serif font-light text-muted-foreground/60">
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

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* 四柱干支 (Original Layout) */}
                <div className="space-y-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-3 bg-primary rounded-full"></span>
                        四柱干支
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: '年柱', val: Lunar.fromDate(selectedDate).getYearInGanZhi() },
                            { label: '月柱', val: Lunar.fromDate(selectedDate).getMonthInGanZhi() },
                            { label: '日柱', val: Lunar.fromDate(selectedDate).getDayInGanZhi() },
                            { label: '时柱', val: Lunar.fromDate(selectedDate).getTimeInGanZhi() }
                        ].map((item, i) => (
                            <div key={i} className="bg-background border border-border/50 rounded-xl py-3 flex flex-col items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 dark:hover:bg-primary/5 h-28">
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
        <div className="flex flex-col md:flex-row flex-1 h-full min-h-0 overflow-hidden relative bg-background">
            {/* 左侧倒计时：Pad 横屏改为抽屉 */}
            {!isPadLandscape && (
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
                isPadLandscape ? "h-full border-r-0" : "h-[60%] md:h-full md:w-[65%] border-b md:border-b-0 md:border-r border-border/50"
            )}>
                {renderCalendarHeader()}

                <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden bg-muted/5 relative">
                    {/* Pad 横屏：把入口按钮放在日历网格左右空白区，并垂直居中于网格模块 */}
                    {isPadLandscape && (
                        <>
                            <button
                                type="button"
                                onClick={() => setIsCountdownOpen(true)}
                                className={classNames(
                                    "absolute left-0 top-1/2 -translate-y-1/2 z-20",
                                    "inline-flex flex-col items-center justify-center gap-2",
                                    "h-[132px] w-[44px]",
                                    "rounded-r-2xl border border-border/50 border-l-0",
                                    "bg-card/90 shadow-[0_10px_22px_rgba(15,23,42,0.12)] ring-1 ring-black/5",
                                    "dark:bg-background/45 dark:backdrop-blur-md dark:shadow-[0_10px_26px_rgba(0,0,0,0.35)] dark:ring-white/10",
                                    "hover:bg-card hover:border-border/70 hover:shadow-[0_12px_28px_rgba(15,23,42,0.14)]",
                                    "dark:hover:bg-background/60",
                                    "active:translate-x-[1px] transition-[background-color,border-color,transform] duration-200"
                                )}
                                aria-label="打开节日倒计时"
                            >
                                <Timer className="w-4 h-4 text-primary/80" />
                                <span
                                    className="text-[12px] font-semibold text-foreground/85 tracking-[0.35em]"
                                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                                >
                                    倒计时
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsDetailOpen(true)}
                                className={classNames(
                                    "absolute right-0 top-1/2 -translate-y-1/2 z-20",
                                    "inline-flex flex-col items-center justify-center gap-2",
                                    "h-[132px] w-[44px]",
                                    "rounded-l-2xl border border-border/50 border-r-0",
                                    "bg-card/90 shadow-[0_10px_22px_rgba(15,23,42,0.12)] ring-1 ring-black/5",
                                    "dark:bg-background/45 dark:backdrop-blur-md dark:shadow-[0_10px_26px_rgba(0,0,0,0.35)] dark:ring-white/10",
                                    "hover:bg-card hover:border-border/70 hover:shadow-[0_12px_28px_rgba(15,23,42,0.14)]",
                                    "dark:hover:bg-background/60",
                                    "active:-translate-x-[1px] transition-[background-color,border-color,transform] duration-200"
                                )}
                                aria-label="打开日期详情"
                            >
                                <ListTodo className="w-4 h-4 text-primary/80" />
                                <span
                                    className="text-[12px] font-semibold text-foreground/85 tracking-[0.35em]"
                                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                                >
                                    详情
                                </span>
                            </button>
                        </>
                    )}

                    {/* 网格容器 - 奇门风格：分离卡片 */}
                    <div className="flex-1 w-full max-w-4xl flex flex-col justify-center">
                        {renderWeekHeader()}
                        <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 px-2 mt-2">
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
                                        "relative rounded-xl p-1 md:p-2 flex flex-col justify-center transition-all duration-200 cursor-pointer group",
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

                                    <div className="flex flex-col items-center justify-center z-10 w-full gap-0.5">
                                        <span className={classNames(
                                            "text-2xl md:text-3xl font-mono transition-all leading-none mb-0.5",
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
                                            "text-[16px] font-bold truncate px-2 leading-none",
                                            day.isSelected || day.isJieQi
                                                ? "text-primary/100"
                                                : day.isHoliday
                                                    ? "text-red-500/60" // 节日名称降低透明度
                                                    : "text-muted-foreground/60"
                                        )}>
                                            {day.bottomText}
                                        </span>

                                        <span className={classNames(
                                            "text-[14.4px] font-serif leading-none mt-1",
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
            </main>

            {/* 右侧详情区域：Pad 横屏改为抽屉 */}
            {!isPadLandscape && (
                <aside className="flex-1 min-h-0 flex flex-col border-l border-border/50">
                    {detailPanel}
                </aside>
            )}

            {isPadLandscape && (
                <>
                    <SideDrawer
                        open={isCountdownOpen}
                        title="节日倒计时"
                        side="left"
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

                    <SideDrawer
                        open={isDetailOpen}
                        title="日期详情"
                        side="right"
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
