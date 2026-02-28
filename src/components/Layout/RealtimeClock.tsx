import { useState, useEffect } from 'react';
import { getRealtimeClockData } from '../../utils/lunarUtil';

export default function RealtimeClock() {
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
