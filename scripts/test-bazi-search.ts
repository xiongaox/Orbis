
import { Solar, Lunar } from 'lunar-typescript';

// Target Bazi: Example "甲子-丙寅-戊辰-庚申" (Just testing logic)
// Let's use a known date: 2024-01-01 12:00 -> Gui-Mao, Jia-Zi, Jia-Zi, Geng-Wu (Example)
// Actually let's just pick any date and try to find it back.
// 2024-05-20 10:00
// Solar: 2024-05-20 10:00
// Lunar: 2024-04-13 10:00
// GanZhi: Jia-Chen(Year), Ji-Si(Month), Yi-Wei(Day), Xin-Si(Hour)

const TARGET = {
    yearGan: '甲', yearZhi: '辰',
    monthGan: '己', monthZhi: '巳',
    dayGan: '乙', dayZhi: '未',
    hourGan: '辛', hourZhi: '巳'
};

const START_YEAR = 1900;
const END_YEAR = 2100;

console.time('BaziSearch');

const results: string[] = [];

// Optimization: 
// 1. Iterate by DAY first (skipping hours).
// 2. Check Year/Month/Day match.
// 3. If match, check Hours.

for (let y = START_YEAR; y <= END_YEAR; y++) {
    // Optimization: Check Year Pillar first?
    // Lunar year pillar changes around LiChun (Feb 4).
    // We can pick a middle date to check year pillar quickly? 
    // But LiChun varies. Safe to iterate days or use Solar.fromYmd to check approx.

    // Let's iterate days efficiently.
    // 365 * 200 = 73000 checks. Very fast for JS.

    // We need to handle the fact that Month pillar depends on JieQi, not just lunar month.
    // Lunar-typescript 'Solar' object handles this well.

    let d = Solar.fromYmd(y, 1, 1);
    const endD = Solar.fromYmd(y, 12, 31);

    // We can jump safely.
    // Year pillar is relatively stable per year.
    // Month pillar changes 12 times.

    // Better Approach: 
    // 1. Check if Year Pillar matches in this year (check LiChun).
    // The GanZhi of the year is mostly constant, but transitions at LiChun.
    // So for a given Gregorian year Y, it could be YearPillar X (before LiChun) or YearPillar Y (after).
    // Only 2 possibilities per year.

    // Let's iterate days.

    const daysInYear = isLeap(y) ? 366 : 365;

    // Quick check logic could be added here

    for (let i = 0; i < daysInYear; i++) {
        // Current Solar Model
        // Note: optimize by creating Solar only when needed?
        // Solar.fromYmd is actually creating an object.
        // Let's use JD or internal timestamp if possible, but library exposure?

        // Basic Loop
        const lunar = d.getLunar();

        if (lunar.getYearGan() === TARGET.yearGan && lunar.getYearZhi() === TARGET.yearZhi &&
            lunar.getMonthGan() === TARGET.monthGan && lunar.getMonthZhi() === TARGET.monthZhi &&
            lunar.getDayGan() === TARGET.dayGan && lunar.getDayZhi() === TARGET.dayZhi) {

            // Found Day Match, check hours
            // Hours are fixed sequence based on Day Gan. 'Xin-Si'
            // We can calculate or iterate 12 hours.
            // Actually, for a specific Day Gan, the Hour Gan is deterministic.
            // So if Day matches, we just need to see if the Hour Zhi 'Si' creates 'Xin-Si'.
            // Or just check if 'Si' hour matches 'Xin'.

            // Check 10:00 (Si Hour is 09:00-11:00)
            const hourLunar = d.getLunar(); // This is just day.
            // We need to set time to check hour pillar specifically?
            // Lunar object has time.

            // Time 09:00 (Si Start)
            // Solar d is at 00:00 usually.

            // Let's check 09:00
            const dHour = Solar.fromYmdHms(d.getYear(), d.getMonth(), d.getDay(), 10, 0, 0);
            const lHour = dHour.getLunar();

            if (lHour.getTimeGan() === TARGET.hourGan && lHour.getTimeZhi() === TARGET.hourZhi) {
                results.push(dHour.toYmdHms());
            }
        }

        d = d.next(1);
    }
}

console.timeEnd('BaziSearch');
console.log("Found:", results);

function isLeap(year: number) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}
