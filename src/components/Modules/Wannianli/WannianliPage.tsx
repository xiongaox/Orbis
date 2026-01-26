import { useState, useMemo } from 'react';
import { Solar, Lunar } from 'lunar-typescript';
import AdvancedDatePicker from '../../Common/AdvancedDatePicker';
import classNames from 'classnames';
import HolidayCountdown from './HolidayCountdown';

export default function WannianliPage() {
    // 状态管理
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewDate, setViewDate] = useState<Date>(new Date()); // 用于控制日历显示的月份
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // 计算当月网格数据
    const calendarData = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth() + 1;

        // 当月第一天
        const firstDayOfMonth = new Date(year, month - 1, 1);
        // 当月第一天是周几 (0-6)
        const dayOfWeek = firstDayOfMonth.getDay();

        const prefixDays = dayOfWeek;

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

            days.push({
                solar: currentSolar,
                lunar: currentLunar,
                isCurrentMonth,
                isToday,
                isSelected,
                bottomText,
                ganZhi: currentLunar.getDayInGanZhi(),
                isJieQi: !!jieQi
            });
        }
        return days;
    }, [viewDate, selectedDate]);

    const renderWeekHeader = () => (
        <div className="grid grid-cols-7 gap-2 px-2 py-2 shrink-0">
            {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((d, i) => (
                <div key={i} className={classNames(
                    "flex items-center justify-center py-2 rounded-xl border border-border/40 bg-card/50 shadow-sm",
                    "text-base md:text-sm font-medium tracking-widest transition-colors",
                    (i === 0 || i === 6)
                        ? "text-primary/80 bg-primary/5 border-primary/20"
                        : "text-muted-foreground/70"
                )}>
                    {d}
                </div>
            ))}
        </div>
    );

    const renderCalendarHeader = () => (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-display font-medium text-foreground">
                    {viewDate.getFullYear()}年
                    <span className="ml-2">{viewDate.getMonth() + 1}月</span>
                </h2>
                <div className="text-sm text-muted-foreground pt-1">
                    {Lunar.fromDate(viewDate).getYearInGanZhi()}年 · {Lunar.fromDate(viewDate).getAnimal()}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => {
                        const d = new Date(viewDate);
                        d.setDate(1);
                        d.setMonth(d.getMonth() - 1);
                        setViewDate(d);
                    }}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    &lt;
                </button>
                <button
                    onClick={() => {
                        setViewDate(new Date());
                        setSelectedDate(new Date());
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    今日
                </button>
                <button
                    onClick={() => {
                        const d = new Date(viewDate);
                        d.setDate(1);
                        d.setMonth(d.getMonth() + 1);
                        setViewDate(d);
                    }}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    &gt;
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row flex-1 h-full min-h-0 overflow-hidden relative bg-background">
            {/* 左侧倒计时 (20%) - Desktop Only */}
            <HolidayCountdown />

            {/* 中间日历区域 (Mobile: 100%, Desktop: 65%) */}
            <main className="w-full h-[60%] md:h-full md:w-[65%] flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-border/50 min-h-0">
                {renderCalendarHeader()}

                <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden bg-muted/5">
                    {/* 网格容器 - 奇门风格：分离卡片 */}
                    <div className="flex-1 w-full max-w-5xl flex flex-col justify-center">
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
                                        "relative rounded-xl border p-1 md:p-2 flex flex-col justify-center transition-all cursor-pointer group",
                                        "bg-card/50 border-border/40 hover:bg-card/80 hover:border-primary/30", // 默认卡片样式
                                        !day.isCurrentMonth && "opacity-30 grayscale bg-muted/5 border-transparent",
                                        day.isSelected && "bg-primary/10 border-primary ring-1 ring-primary shadow-[0_0_15px_-3px_rgba(255,255,255,0.1)]"
                                    )}
                                >
                                    <div className="flex flex-col items-center justify-center z-10 w-full gap-0.5">
                                        <span className={classNames(
                                            "text-2xl md:text-3xl font-mono font-medium transition-all leading-none mb-0.5",
                                            day.isToday
                                                ? "text-primary drop-shadow-[0_2px_8px_rgba(var(--primary),0.3)]"
                                                : "text-foreground group-hover:text-primary",
                                            !day.isCurrentMonth && !day.isToday && "text-muted-foreground/30"
                                        )}>
                                            {day.solar.getDay()}
                                        </span>

                                        <span className={classNames(
                                            "text-[18px] font-medium truncate px-2 leading-none",
                                            day.isJieQi ? "text-primary/90" : "text-muted-foreground/60"
                                        )}>
                                            {day.bottomText}
                                        </span>

                                        <span className="text-[16px] text-muted-foreground/40 font-serif leading-none mt-1 transform scale-90">
                                            {day.ganZhi}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* 右侧详情区域 (30%) */}
            <aside className="flex-1 min-h-0 flex flex-col bg-muted/5">
                {/* 头部：选中日期 */}
                <div className="p-6 border-b border-border/50 bg-background/50 backdrop-blur-sm">
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-4xl font-display font-bold text-foreground">
                            {selectedDate.getDate()}
                        </h3>
                        <span className="text-xl font-display text-muted-foreground">
                            / {selectedDate.getMonth() + 1}月
                        </span>
                    </div>

                    <p className="text-primary font-medium mt-2 flex items-center gap-2">
                        {Lunar.fromDate(selectedDate).getMonthInChinese()}月{Lunar.fromDate(selectedDate).getDayInChinese()}
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                        {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][selectedDate.getDay()]}
                    </p>
                </div>

                <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                    {/* 干支 */}
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
                                <div key={i} className="bg-background border border-border/50 rounded-xl py-3 flex flex-col items-center justify-between shadow-sm hover:shadow-md transition-shadow h-28">
                                    <div className="text-[10px] text-muted-foreground/60 font-medium tracking-widest uppercase">{item.label}</div>
                                    <div className="flex-1 flex flex-col justify-center gap-1">
                                        {/* 天干 */}
                                        <span className="font-serif text-xl font-bold text-foreground/90">{item.val[0]}</span>
                                        {/* 地支 */}
                                        <span className="font-serif text-xl font-bold text-foreground/90">{item.val[1]}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 宜忌 - 保持样式，但背景微调适配 aside */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">宜</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Lunar.fromDate(selectedDate).getDayYi().map((yi, i) => (
                                    <span key={i} className="text-sm px-2 py-0.5 bg-background rounded border border-border/50 text-foreground/80">{yi}</span>
                                ))}
                            </div>
                        </div>

                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center text-xs font-bold text-rose-600 dark:text-rose-400">忌</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Lunar.fromDate(selectedDate).getDayJi().map((ji, i) => (
                                    <span key={i} className="text-sm px-2 py-0.5 bg-background rounded border border-border/50 text-foreground/80">{ji}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* 日期选择弹窗 - 复用组件 */}
            <AdvancedDatePicker
                value={selectedDate}
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                onConfirm={(date) => {
                    setSelectedDate(date);
                    setViewDate(date);
                    setIsDatePickerOpen(false);
                }}
            />
        </div>
    );
}
