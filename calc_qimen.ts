
import { Lunar, Solar } from 'lunar-typescript';

// Date: 2019-06-08 06:32
const solar = Solar.fromYmdHms(2019, 6, 8, 6, 32, 0);
const lunar = solar.getLunar();
const eightChar = lunar.getEightChar();

const yearGz = eightChar.getYear();
const monthGz = eightChar.getMonth();
const dayGz = eightChar.getDay();
const timeGz = eightChar.getTime();

const xunKongYear = eightChar.getYearXunKong();
const xunKongMonth = eightChar.getMonthXunKong();
const xunKongDay = eightChar.getDayXunKong();
const xunKongTime = eightChar.getTimeXunKong();

console.log(`**公元**：${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日${solar.getHour()}时`);
console.log(`**干支**：${yearGz}丨${monthGz}丨${dayGz}丨${timeGz}`);
console.log(`**旬空**：${xunKongYear}空丨${xunKongMonth}空丨${xunKongDay}空丨${xunKongTime}空`);

// Manual Calc for Yang 8, Xin-Mao hour
// Xun Shou: Jia-Shen (Geng) -> Geng in Yang 8 is at Gong 1 (Kan).
// Star: TianPeng. Door: XiuMen.
// ZhiFu follows ShiGan (Xin). Xin in Yang 8 is at Gong 2 (Kun). So ZhiFu -> Gong 2.
// ZhiShi follows Hour (Mao).
// Shen(1) -> You(2) -> Xu(3) -> Hai(4) -> Zi(5) -> Chou(6) -> Yin(7) -> Mao(8).
// So ZhiShi -> Gong 8 (Gen).

console.log(`**值符**：天蓬丨**值使**：休门丨**旬首**：甲申`);
