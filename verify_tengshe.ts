
import shenData from './src/lib/csp-qimen/data/shen.json';
import shenMenData from './src/lib/csp-qimen/data/shen_men.json';

console.log("----- SHEN KEYS -----");
const shenKeys = Object.keys(shenData);
console.log(shenKeys.join(", "));

console.log("\n----- SHEN_MEN KEYS -----");
const shenMenKeys = Object.keys(shenMenData);
console.log(shenMenKeys.join(", "));

const key1 = "螣蛇";
console.log(`\nCheck [${key1}]:`);
console.log(`In Shen: ${shenKeys.includes(key1)}`);
console.log(`In ShenMen: ${shenMenKeys.includes(key1)}`);

const key2 = "腾蛇";
console.log(`\nCheck [${key2}]:`);
console.log(`In Shen: ${shenKeys.includes(key2)}`);
console.log(`In ShenMen: ${shenMenKeys.includes(key2)}`);
