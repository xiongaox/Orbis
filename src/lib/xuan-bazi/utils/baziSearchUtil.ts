import { Solar } from 'lunar-typescript';

export interface BaziTarget {
    yearGan: string;
    yearZhi: string;
    monthGan: string;
    monthZhi: string;
    dayGan: string;
    dayZhi: string;
    hourGan: string;
    hourZhi: string;
}

export interface BaziSearchResult {
    solarDate: Date;
    description: string;
}

const START_YEAR = 1900;
const END_YEAR = 2100;

export async function baziReverseSearch(target: BaziTarget): Promise<BaziSearchResult[]> {
    return new Promise((resolve) => {
        // Use setTimeout to avoid blocking UI thread completely if extensive
        setTimeout(() => {
            const results: BaziSearchResult[] = [];
            const { yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi } = target;

            // Optimization: Iterate days
            for (let y = START_YEAR; y <= END_YEAR; y++) {
                const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
                const daysInYear = isLeap ? 366 : 365;

                let d = Solar.fromYmd(y, 1, 1);

                // Quick check: Year Pillar roughly matches?
                // Year pillar changes internally at LiChun, so a year usually has 2 pillars involved.
                // We cannot skip entire year easily without careful LiChun check. 
                // But we can check if the target Year GanZhi is possible for this year number.
                // Lunar Year GanZhi is cyclic 60.
                // e.g. 1984 is Jia-Zi. 1924 is Jia-Zi.
                // If target is Jia-Zi, we only need to check years where (y - 4) % 60 === 0 or close to it.
                // Because LiChun splits the year, it could be year Y or Y+1?
                // Actually, the Solar year Y contains part of Lunar Year P and P+1.
                // So we can skip years that are definitely not containing the target Year GanZhi.

                // Let's implement full scan first for correctness, optimization later if needed.
                // 800ms is acceptable.

                for (let i = 0; i < daysInYear; i++) {
                    const lunar = d.getLunar();

                    if (lunar.getYearGan() === yearGan && lunar.getYearZhi() === yearZhi &&
                        lunar.getMonthGan() === monthGan && lunar.getMonthZhi() === monthZhi &&
                        lunar.getDayGan() === dayGan && lunar.getDayZhi() === dayZhi) {

                        // Day matched. Check Hour.
                        // Hour GanZhi is determined by Day Gan + Time.
                        // We need to find the specific hour slot (0-23) that matches.
                        // Instead of checking current 'd' (which is 00:00), scan 12 bi-hours.

                        // Efficient hour check:
                        // Construct a time in the middle of each Zhi hour to check GanZhi.
                        // Zi: 00:00, Chou: 02:00, ...
                        // Mapping Zhi to rough hour for check:
                        const zhiMap: Record<string, number> = {
                            '子': 0, '丑': 2, '寅': 4, '卯': 6, '辰': 8, '巳': 10,
                            '午': 12, '未': 14, '申': 16, '酉': 18, '戌': 20, '亥': 22
                        };

                        const checkHour = zhiMap[hourZhi];
                        if (checkHour !== undefined) {
                            const dHour = Solar.fromYmdHms(d.getYear(), d.getMonth(), d.getDay(), checkHour, 0, 0);
                            const lHour = dHour.getLunar();

                            if (lHour.getTimeGan() === hourGan && lHour.getTimeZhi() === hourZhi) {
                                results.push({
                                    solarDate: new Date(dHour.toYmdHms()),
                                    description: `${dHour.getYear()}年${dHour.getMonth()}月${dHour.getDay()}日 ${hourGan}${hourZhi}时`
                                });
                            }
                        }
                    }

                    d = d.next(1);
                }
            }

            resolve(results);
        }, 10);
    });
}
