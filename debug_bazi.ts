
import { calculateBazi } from './src/utils/baziUtils';

const testDate = '1998-10-16T00:08:00';
const result = calculateBazi(testDate, 'female');

console.log('Calculated Bazi Data:');
console.log(JSON.stringify(result, null, 2));

if (!result.main_stars || result.main_stars.length === 0 || !result.main_stars[0]) {
    console.error('FAIL: main_stars is empty');
} else {
    console.log('PASS: main_stars populated');
}

if (!result.hidden_stems || result.hidden_stems.length === 0 || !result.hidden_stems[0]) {
    console.error('FAIL: hidden_stems is empty');
} else {
    console.log('PASS: hidden_stems populated');
}
