/* 交互自验：用 CDP 真实驱动鼠标，验证筛选 / 搜索 / 左滑 / 排序模式 / 选中
   用法：node interact.mjs plan-a.html */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const file = resolve(process.argv[2]);
const dir = dirname(file);

// 关掉左滑动画对时序的干扰，并在页面里暴露探针
const patch = `<style>*{transition:none !important}</style>
<script>window.__log=[];const _t=window.toast||null;</script>`;

const tmp = resolve(dir, `_int_${basename(file)}`);
writeFileSync(tmp, readFileSync(file, 'utf8').replace('</body>', patch + '</body>'));

const port = 9333 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(`${tmpdir()}/cdp-`);
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`, '--window-size=760,1000', `file://${tmp}`,
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cdp() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const t = (await r.json()).find(x => x.type === 'page' && x.webSocketDebuggerUrl);
      if (t) return t.webSocketDebuggerUrl;
    } catch { /* 还没起来 */ }
    await sleep(200);
  }
  throw new Error('Chrome CDP 未就绪');
}

const url = await cdp();
const ws = new WebSocket(url);
await new Promise(r => ws.addEventListener('open', r, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
function send(method, params = {}) {
  const mid = ++id;
  return new Promise(res => { pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
}
async function evaluate(expr) {
  // 包一层 IIFE：Runtime.evaluate 共享全局作用域，裸 const 会跨调用重复声明而报错
  const r = await send('Runtime.evaluate', {
    expression: `(function(){ ${expr} })()`, returnByValue: true, awaitPromise: true,
  });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
}

await send('Page.enable');
await send('Runtime.enable');
await sleep(900);

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? '  — ' + detail : ''}`);
};

/* 1. 初始渲染 */
const n0 = await evaluate(`return document.querySelectorAll('.shell').length`);
check('初始渲染 12 张卡', n0 === 12, `实际 ${n0}`);

/* 2. 分类筛选 */
await evaluate(`document.querySelector('.chip[data-t="父母"]').click();`);
await sleep(250);
const nParent = await evaluate(`return document.querySelectorAll('.shell').length`);
check('筛选「父母」→ 2 张', nParent === 2, `实际 ${nParent}`);
await evaluate(`document.querySelector('.chip[data-t=""]').click();`);
await sleep(250);

/* 3. 搜索 */
await evaluate(`const q=document.querySelector('#search'); q.value='羊刃'; q.dispatchEvent(new Event('input',{bubbles:true}));`);
await sleep(250);
const nSearch = await evaluate(`return document.querySelectorAll('.shell').length`);
check('搜索「羊刃」→ 3 张', nSearch === 3, `实际 ${nSearch}`);
await evaluate(`const q=document.querySelector('#search'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true}));`);
await sleep(250);

/* 4. 点击选中 */
const firstId = await evaluate(`return document.querySelectorAll('.shell')[1].dataset.id`);
await evaluate(`document.querySelectorAll('.shell')[1].querySelector('.card').click();`);
await sleep(200);
const sel = await evaluate(`const s=document.querySelector('.shell.sel'); return s && s.dataset.id`);
check('点击卡片切换选中态', sel === firstId, `选中 ${sel} / 期望 ${firstId}`);

/* 5. 左滑露出操作（真实指针事件） */
const box = await evaluate(`const r=document.querySelectorAll('.shell')[0].getBoundingClientRect();
  return JSON.stringify({x:r.left+r.width/2, y:r.top+r.height/2});`);
const { x, y } = JSON.parse(box);
async function mouse(type, px, py, button = 'left', buttons = 1) {
  await send('Input.dispatchMouseEvent', {
    type, x: px, y: py, button, buttons, clickCount: type === 'mousePressed' ? 1 : 0,
    pointerType: 'mouse',
  });
}
await mouse('mousePressed', x, y);
for (let i = 1; i <= 6; i++) await mouse('mouseMoved', x - i * 22, y);
await mouse('mouseReleased', x - 132, y, 'left', 0);
await sleep(400);
const tx = await evaluate(`return document.querySelectorAll('.card')[0].style.transform || 'none'`);
const opened = await evaluate(`return !!document.querySelectorAll('.card')[0].dataset.open`);
check('左滑露出 编辑/删除', opened && /translateX\(-\d+px\)/.test(tx), `transform=${tx}`);

/* 6. 左滑后点击删除按钮 */
await evaluate(`document.querySelectorAll('.shell')[0].querySelector('.ra-del').click();`);
await sleep(250);
const toastTxt = await evaluate(`return document.querySelector('#toast span').textContent`);
check('左滑后点「删除」有反馈', /删除/.test(toastTxt), `toast="${toastTxt}"`);

/* 7. 排序模式 */
await evaluate(`document.querySelector('#sortBtn').click();`);
await sleep(250);
const sortOn = await evaluate(`return document.body.classList.contains('sortmode')`);
const handleVisible = await evaluate(`return getComputedStyle(document.querySelector('.handle')).display`);
check('排序模式开启并显示手柄', sortOn && handleVisible !== 'none', `display=${handleVisible}`);
await evaluate(`document.querySelector('#sortBtn').click();`);
await sleep(200);

/* 8. 排序模式下左滑应被禁用 */
await evaluate(`document.querySelector('#sortBtn').click();`);
await sleep(200);
const box2 = JSON.parse(await evaluate(`const r=document.querySelectorAll('.shell')[0].getBoundingClientRect();
  return JSON.stringify({x:r.left+r.width/2, y:r.top+r.height/2});`));
await mouse('mousePressed', box2.x, box2.y);
for (let i = 1; i <= 5; i++) await mouse('mouseMoved', box2.x - i * 22, box2.y);
await mouse('mouseReleased', box2.x - 110, box2.y, 'left', 0);
await sleep(300);
const txSort = await evaluate(`return document.querySelectorAll('.card')[0].style.transform || 'none'`);
check('排序模式下禁用左滑', txSort === 'none' || txSort === '', `transform=${txSort}`);

console.log(`\n${basename(file)}: ${results.filter(r => r.pass).length}/${results.length} 通过`);

ws.close();
chrome.kill();
try { unlinkSync(tmp); } catch {}
process.exit(results.every(r => r.pass) ? 0 : 1);
