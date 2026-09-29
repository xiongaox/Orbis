/* 只截 .sidebar 本体。
   坑：body 是 flex + justify-content:center，窗口一旦小于 stage 宽度，
   侧栏就被推到左侧被裁掉。故探针里先把 body 改成左对齐并清掉内边距，
   再按元素尺寸开窗截图。 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const file = resolve(process.argv[2]);
const out = process.argv[3] || '/tmp/shot.png';
const dir = dirname(file);

const reset = `<style>body{justify-content:flex-start !important;padding:0 !important;} .stage{display:block !important;gap:0 !important;}</style>`;
const boxProbe = `<script>window.addEventListener('load',()=>{const r=document.querySelector('.sidebar').getBoundingClientRect();
document.title='BOX:'+JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height});});<\/script>`;

const src = readFileSync(file, 'utf8');
const tmpA = resolve(dir, `_shotA_${basename(file)}`);
writeFileSync(tmpA, src.replace('</body>', reset + boxProbe + '</body>'));
const dom = execFileSync(CHROME, [
  '--headless', '--disable-gpu', '--dump-dom', '--virtual-time-budget=3000',
  '--window-size=760,1000', `file://${tmpA}`,
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
unlinkSync(tmpA);

const b = JSON.parse(/BOX:(\{.*?\})<\/title>/s.exec(dom)[1]);
const W = Math.ceil(b.w + 16), H = Math.ceil(b.h + 16);

const tmpB = resolve(dir, `_shotB_${basename(file)}`);
writeFileSync(tmpB, src.replace('</body>', reset + '</body>'));
execFileSync(CHROME, [
  '--headless', '--disable-gpu', `--screenshot=${out}`,
  `--window-size=${W},${H}`, '--hide-scrollbars', '--force-device-scale-factor=2',
  `file://${tmpB}`,
], { stdio: 'ignore' });
unlinkSync(tmpB);

console.log(`${basename(file)} → ${out}  侧栏 ${b.w}x${b.h}px`);
