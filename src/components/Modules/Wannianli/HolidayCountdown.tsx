import { useMemo, useState, useEffect } from 'react';
import { Lunar, Solar } from 'lunar-typescript';
import classNames from 'classnames';

type HolidayItem = {
    name: string;
    dateStr: string;
    diffDays: number;
    lunarDate: string;
    weekDay: string;
    type: 'solar' | 'lunar' | 'term';
    isOffDay: boolean; // 是否是法定节假日（放假）
    duration?: number; // 放假天数
};

export default function HolidayCountdown({
    onSelectDate,
    variant = 'sidebar',
}: {
    onSelectDate?: (date: Date) => void;
    variant?: 'sidebar' | 'drawer';
}) {
    // 使用真实当前时间，每分钟刷新一次以保持准确
    const [now, setNow] = useState(new Date());
    const [filterType, setFilterType] = useState<'all' | 'off'>('all');

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // 1分钟更新一次
        return () => clearInterval(timer);
    }, []);

    const holidays = useMemo(() => {
        // 1. 定义基础辅助函数
        const todaySolar = Solar.fromDate(now);
        const currentYear = todaySolar.getYear();

        // 目标结果集
        let candidates: HolidayItem[] = [];

        // ==========================================
        // A. 公历固定节日 (Solar Holidays)
        // ==========================================
        const solarHolidays = [
            { name: '元旦', month: 1, day: 1, isOffDay: true, duration: 3 },
            { name: '情人节', month: 2, day: 14, isOffDay: false },
            { name: '妇女节', month: 3, day: 8, isOffDay: false }, // 部分放假
            { name: '劳动节', month: 5, day: 1, isOffDay: true, duration: 5 },
            { name: '儿童节', month: 6, day: 1, isOffDay: false }, // 儿童放假
            { name: '国庆节', month: 10, day: 1, isOffDay: true, duration: 7 },
            { name: '圣诞节', month: 12, day: 25, isOffDay: false },
        ];

        solarHolidays.forEach(h => {
            let year = currentYear;
            // 构造当年的节日日期
            let sol = Solar.fromYmd(year, h.month, h.day);

            // 如果比今天早（即已过去），则推到明年
            // 注意：isBefore 比较的是严格之前。如果是今天，diffDays=0，应该显示。
            if (sol.isBefore(todaySolar)) {
                year++;
                sol = Solar.fromYmd(year, h.month, h.day);
            }

            candidates.push(createHolidayItem(h.name, sol, todaySolar, 'solar', h.isOffDay, h.duration));
        });

        // ==========================================
        // B. 农历传统节日 (Lunar Holidays)
        // ==========================================
        const lunarHolidays = [
            { name: '春节', month: 1, day: 1, isOffDay: true, duration: 8 },
            { name: '元宵节', month: 1, day: 15, isOffDay: false },
            { name: '龙头节', month: 2, day: 2, isOffDay: false },
            { name: '端午节', month: 5, day: 5, isOffDay: true, duration: 3 },
            { name: '七夕节', month: 7, day: 7, isOffDay: false },
            { name: '中元节', month: 7, day: 15, isOffDay: false },
            { name: '中秋节', month: 8, day: 15, isOffDay: true, duration: 3 },
            { name: '重阳节', month: 9, day: 9, isOffDay: false },
            { name: '腊八节', month: 12, day: 8, isOffDay: false },
        ];

        // 获取今年和明年的农历年份，用于计算
        const currentLunarYear = todaySolar.getLunar().getYear();

        lunarHolidays.forEach(h => {
            // 策略：先算今年的该农历日，对应的公历。如果已过，则算明年的。
            // 有些闰月情况比较复杂，lunar-typescript 的 Lunar.fromYmd(lunarYear, month, day) 
            // 默认是不试图找闰月的，或者是找非闰月。我们只找主要的“正日子”。

            let lun = Lunar.fromYmd(currentLunarYear, h.month, h.day);
            let sol = lun.getSolar();

            if (sol.isBefore(todaySolar)) {
                lun = Lunar.fromYmd(currentLunarYear + 1, h.month, h.day);
                sol = lun.getSolar();
            }

            // 特殊处理：除夕
            // 除夕是春节的前一天。我们可以直接算春节，然后减一天。
            // 或者单独逻辑：腊月最后一天。Lunar 库暂时不容易直接定“腊月最后一天”（可能是29或30）。
            // 简单做法：如果春节 diffDays = 1，那天就是除夕（diffDays=0）。
            // 这里暂时只列出明确日期的节日。

            candidates.push(createHolidayItem(h.name, sol, todaySolar, 'lunar', h.isOffDay, h.duration));
        });

        // 补一个除夕（根据春节推算）
        const springFestival = candidates.find(c => c.name === '春节');
        if (springFestival) {
            // 解析春节的公历日期
            const [y, m, d] = springFestival.dateStr.split('.').map(Number);
            const springSolar = Solar.fromYmd(y, m, d);
            const eveSolar = springSolar.next(-1); // 前一天

            // 如果除夕还没过（注意：如果今天就是春节，除夕已过，diffDays < 0，createHolidayItem 会计算出来）
            // 但是我们只关心未来的。如果今天就是除夕，diff=0。
            if (!eveSolar.isBefore(todaySolar)) {
                candidates.push(createHolidayItem('除夕', eveSolar, todaySolar, 'lunar', true, 1)); // 除夕算1天或者包含在春节里，这里单独标示
            }
        }

        // ==========================================
        // C. 节气节日 (Solar Terms) - 清明
        // ==========================================
        // 清明是唯一一个既是节气又是法定节日的
        const targetJieQi = '清明';

        // 找今年的清明
        const qingMingDate = getJieQiDate(currentYear, targetJieQi);
        let qingMingSolar = Solar.fromDate(qingMingDate);

        if (qingMingSolar.isBefore(todaySolar)) {
            // 如果今年的清明已过，找明年的
            const nextQingMingDate = getJieQiDate(currentYear + 1, targetJieQi);
            qingMingSolar = Solar.fromDate(nextQingMingDate);
        }

        candidates.push(createHolidayItem('清明节', qingMingSolar, todaySolar, 'term', true, 3));


        // ==========================================
        // 排序与筛选
        // ==========================================
        // 1. 按 diffDays 升序
        candidates.sort((a, b) => a.diffDays - b.diffDays);

        // 2. 筛选
        if (filterType === 'off') {
            candidates = candidates.filter(h => h.isOffDay);
        }

        // 3. 取前 20 个 (覆盖全年的主要节日)
        return candidates.slice(0, 20);

    }, [now, filterType]); // 当 now 变化时（跨天）会自动重算

    const containerClassName = variant === 'drawer'
        ? 'flex flex-col w-full min-h-0 bg-muted/5'
        : 'flex flex-col w-[15%] border-r border-border/50 bg-muted/5 min-h-0';

    return (
        <aside className={containerClassName}>
            <div className="px-6 py-5 flex items-center justify-between">
                <h3 className="text-md font-bold text-muted-foreground/100 tracking-[0.2em] uppercase flex items-center gap-2">
                    <span className="w-1 h-3 bg-primary rounded-full"></span>
                    节日倒计时
                </h3>

                {/* Filter Toggle */}
                <div className="flex bg-muted p-1 rounded-lg border border-border/40">
                    <button
                        onClick={() => setFilterType('all')}
                        className={classNames(
                            "flex-1 px-3 py-1 text-xs font-bold rounded-md transition-all duration-200",
                            filterType === 'all'
                                ? "bg-background text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-none"
                                : "text-muted-foreground/70 hover:text-foreground hover:bg-background/40"
                        )}
                    >
                        节日
                    </button>
                    <button
                        onClick={() => setFilterType('off')}
                        className={classNames(
                            "flex-1 px-3 py-1 text-xs font-bold rounded-md transition-all duration-200",
                            filterType === 'off'
                                ? "bg-background text-primary shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-none"
                                : "text-muted-foreground/70 hover:text-foreground hover:bg-background/40"
                        )}
                    >
                        假日
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2 no-scrollbar">
                {holidays.map((h) => (
                    <div
                        key={`${h.name}-${h.dateStr}`}
                        onClick={() => {
                            if (onSelectDate) {
                                // h.dateStr format: yyyy.mm.dd
                                const [y, m, d] = h.dateStr.split('.').map(Number);
                                const date = new Date(y, m - 1, d);
                                onSelectDate(date);
                            }
                        }}
                        className={classNames(
                            "group relative overflow-hidden rounded-2xl cursor-pointer",
                            "transition-[box-shadow,transform] duration-300",
                            "bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-transparent dark:border-border/60 dark:shadow-none hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5",
                            h.diffDays <= 3 && "bg-primary/[0.03] dark:bg-primary/10"
                        )}
                    >
                        <div className="p-4 flex flex-col gap-3">
                            {/* Header: Name & Days */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-bold text-foreground/90 group-hover:text-primary transition-colors">
                                        {h.name}
                                    </span>
                                    {h.isOffDay && (
                                        <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                            放假{h.duration || '?'}天
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-0.5 shrink-0 ml-2">
                                    <span className={classNames(
                                        "text-2xl font-mono font-bold tracking-tight",
                                        h.diffDays <= 7 ? "text-primary" : "text-foreground/70"
                                    )}>
                                        {h.diffDays}
                                    </span>
                                    <span className="text-xs text-muted-foreground/50 font-medium">天</span>
                                </div>
                            </div>

                            {/* Info Rows */}
                            <div className="space-y-1.5 pt-1 border-t border-border/20">
                                <div className="flex items-center justify-between text-xs font-mono tracking-tight">
                                    <span className="text-muted-foreground/60 uppercase">公历日期</span>
                                    <span className="text-muted-foreground/80">{h.dateStr} · {h.weekDay}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-mono tracking-tight">
                                    <span className="text-muted-foreground/60 uppercase">农历参考</span>
                                    <span className="text-muted-foreground/80">{h.lunarDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Decorative background element for near-term holidays */}
                        {
                            h.diffDays <= 3 && (
                                <div className="absolute top-0 right-0 p-1">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                </div>
                            )
                        }
                    </div>
                ))}

                {holidays.length === 0 && (
                    <div className="text-center text-muted-foreground/40 py-20 text-xs font-mono italic">
                        No upcoming holidays
                    </div>
                )}
            </div>
        </aside >
    );
}

// ---------------- Helper Functions ----------------

function createHolidayItem(name: string, targetSolar: Solar, todaySolar: Solar, type: HolidayItem['type'], isOffDay: boolean, duration?: number): HolidayItem {
    const year = targetSolar.getYear();
    const month = targetSolar.getMonth();
    const day = targetSolar.getDay();

    // 计算天数差
    const diff = targetSolar.subtract(todaySolar);

    // 星期几
    const jsDate = new Date(year, month - 1, day);
    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][jsDate.getDay()];

    // 农历字符串
    const lunar = targetSolar.getLunar();
    const lunarStr = `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;

    return {
        name,
        dateStr: `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`,
        diffDays: diff,
        lunarDate: lunarStr,
        weekDay,
        type,
        isOffDay,
        duration
    };
}

/**
 * 获取指定年份指定节气的公历日期
 */
function getJieQiDate(year: number, name: string): Date {
    // 为了性能，我们这里采用一种近似查找：
    // 清明一般在公历 4月4-6日。
    // 直接检查这几天哪个是清明。
    for (let d = 4; d <= 6; d++) {
        const sol = Solar.fromYmd(year, 4, d);
        // 如果是交节时刻精确计算，lunar库默认是到天的吗？
        // lunar-typescript 的 getJieQi() 返回的是当天的节气名称（如果有）。
        // Solar 对象没有 getJieQi 方法，需要转成 Lunar
        if (sol.getLunar().getJieQi() === name) {
            return new Date(year, 3, d); // month is 0-indexed
        }
    }

    // Fallback: 如果上面没找到（不太可能），尝试前后扩展
    // 实际上 lunar-typescript 判断节气是精确到秒的，getJieQi() 只有在交节那一天才会返回。
    // 4月4,5,6 应该能覆盖。
    return new Date(year, 3, 5);
}
