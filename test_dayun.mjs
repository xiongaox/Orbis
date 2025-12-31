
import { Lunar, Solar } from 'lunar-javascript';

// Mock Bazi calculation logic setup
function runTest() {
    console.log("Starting test...");
    const solar = Solar.fromYmd(1998, 2, 24); // Example date from user screenshot usually
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();
    
    // Da Yun
    const gender = 'male'; // Assume male
    const yun = bazi.getYun(1); // 1 = male? Library uses 1 for man, 0 for woman usually or check docs
    
    const dayunArr = yun.getDaYun();
    const dayunList = [];
    
    // Mimic the loop
    if (dayunArr && dayunArr.length) {
        // Lunar JS usually returns native array from getDaYun()
        // If it's a Java list proxy, we treat it as array in JS
        for (let i = 0; i < dayunArr.length; i++) {
            const dayun = dayunArr[i];
            const index = dayun.getIndex();
            const startAge = dayun.getStartAge();
            const startYear = dayun.getStartYear();
            
            dayunList.push({
                index,
                startAge,
                startYear,
                ganZhi: dayun.getGanZhi()
            });
        }
    }
    
    console.log("Original DaYun List first 2 items:");
    console.log(JSON.stringify(dayunList.slice(0, 2), null, 2));
    
    // Mimic insertion logic
    if (dayunList.length > 0) {
        const firstDayun = dayunList[0];
        const startAge = firstDayun.startAge;
        const startYear = firstDayun.startYear;
        
        console.log(`First DaYun StartAge: ${startAge}`);
        
        if (startAge > 1) {
            console.log("Adding Little Luck...");
            dayunList.unshift({
                index: -1,
                ganZhi: 'LittleLuck',
                startAge: 1
            });
        }
    }
    
    console.log("Final List first 3 items:");
    console.log(JSON.stringify(dayunList.slice(0, 3), null, 2));
}

runTest();
