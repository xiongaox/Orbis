/**
 * RealtimeClock - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：提供应用的基础布局框架
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default RealtimeClock`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `lunarUtil`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

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
