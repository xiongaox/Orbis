import { useMemo } from 'react';
import { HolidayUtil } from 'lunar-typescript';
import classNames from 'classnames';

export default function HolidayCountdown() {
    const today = new Date();

    // Get holidays for current and next year to ensure we have enough upcoming ones
    const holidays = useMemo(() => {
        const currentYear = today.getFullYear();
        const nextYear = currentYear + 1;

        // Get holidays for this year and next year
        const rawHolidays = [
            ...HolidayUtil.getHolidays(currentYear),
            ...HolidayUtil.getHolidays(nextYear)
        ];

        // Filter and process
        const upcoming = rawHolidays
            .filter(h => !h.isWork()) // Only keep actual holidays, not workday adjustments
            .map(h => {
                const date = new Date(h.getDay());
                // Reset time to midnight for accurate day diff
                date.setHours(0, 0, 0, 0);
                const todayMidnight = new Date(today);
                todayMidnight.setHours(0, 0, 0, 0);

                const diffTime = date.getTime() - todayMidnight.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return {
                    name: h.getName(),
                    date: h.getDay(), // Format: YYYY-MM-DD
                    diffDays,
                    rawDate: date
                };
            })
            .filter(h => h.diffDays >= 0) // Only future or today
            .sort((a, b) => a.diffDays - b.diffDays);

        // Deduplicate by name (sometimes holidays span multiple days, we usually just want the start)
        // Adjust logic if user wants every single day. Usually countdown is to the *start* of the festival.
        // Simple dedupe: keep the first occurrence of each name
        const uniqueHolidays = [];
        const seenNames = new Set();

        for (const h of upcoming) {
            // Group distinct holidays (like "National Day")
            if (!seenNames.has(h.name)) {
                uniqueHolidays.push(h);
                seenNames.add(h.name);
            }
        }

        return uniqueHolidays.slice(0, 10); // Show next 10
    }, []);

    // Helper to format date like "4.4-4.6" implies duration, but HolidayUtil gives single days.
    // For simplicity, we just show the start date "MM.DD"
    const formatDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        return `${parseInt(parts[1])}.${parseInt(parts[2])}`;
    };

    return (
        <aside className="hidden md:flex flex-col w-[15%] border-r border-border/50 bg-muted/5 min-h-0">
            {/* Header */}
            <div className="p-6 pb-2">
                <h3 className="text-sm font-bold text-muted-foreground/70 tracking-wider uppercase">节假倒数</h3>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-1">
                {holidays.map((h, i) => (
                    <div key={i} className="group py-4">
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <div className="text-base font-medium text-foreground/90 group-hover:text-primary transition-colors">
                                    {h.name}
                                </div>
                                <div className="text-xs text-muted-foreground/50 mt-1 font-mono">
                                    {formatDate(h.date)}
                                </div>
                            </div>
                            <div className="text-right flex items-baseline gap-1">
                                <span className={classNames(
                                    "text-2xl font-mono font-bold tracking-tight",
                                    h.diffDays <= 7 ? "text-primary" : "text-foreground/80"
                                )}>
                                    {h.diffDays}
                                </span>
                                <span className="text-xs text-muted-foreground/60">天</span>
                            </div>
                        </div>
                        {/* Dashed Separator - mimic the screenshot */}
                        <div className="w-full border-b border-dashed border-border/40 group-last:border-0" />
                    </div>
                ))}

                {holidays.length === 0 && (
                    <div className="text-center text-muted-foreground py-10 text-sm">
                        暂无即将到来的假期
                    </div>
                )}
            </div>
        </aside>
    );
}
