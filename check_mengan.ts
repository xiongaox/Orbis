
import { QimenDataService } from './src/lib/csp-qimen/qimenDataService';

const menNames = ['开门', '休门', '生门', '伤门', '杜门', '景门', '死门', '惊门'];
const ganNames = ['乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
// Note: '甲' usually not on plate, but verifying if it exists in data just in case.

console.log("Analyzing MenGan Data...");

menNames.forEach(men => {
    ganNames.forEach(gan => {
        const result = QimenDataService.getMenGan(men, gan);
        if (!result) {
            console.log(`[MISSING] ${men} + ${gan}`);
        } else {
            // console.log(`[OK] ${men} + ${gan}`);
        }
    });
});

console.log("Done.");
