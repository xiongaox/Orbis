
import { Solar } from 'lunar-typescript';

const date = new Date();
const solar = Solar.fromYmdHms(date.getFullYear(), date.getMonth() + 1, date.getDate(), 12, 0, 0);
const lunar = solar.getLunar();
const baZi = lunar.getEightChar();

console.log('--- Lunar Methods ---');
// Filter for likely Shen Sha methods
Object.getOwnPropertyNames(Object.getPrototypeOf(lunar)).forEach(m => {
    if (m.toLowerCase().includes('shen') || m.toLowerCase().includes('sha')) {
        console.log(`Lunar.${m}`);
    }
});

console.log('--- EightChar Methods ---');
Object.getOwnPropertyNames(Object.getPrototypeOf(baZi)).forEach(m => {
    if (m.toLowerCase().includes('shen') || m.toLowerCase().includes('sha')) {
        console.log(`EightChar.${m}`);
    }
});

// Try some standard ones if they exist
try {
    // some versions support direct ShenSha access
    // console.log('ShenSha:', lunar.getShenSha()); 
} catch (e) { }
