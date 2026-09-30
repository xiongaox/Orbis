/* 自验脚本：量测每张卡的真实盒模型，确认不超出 224px 侧栏、无溢出
   用法：node measure.mjs plan-a.html
   注意：探针文件必须写在 demo 同目录，否则 shared.css / app.js 的相对路径失效，
   页面会渲染成空壳，量测结果全部为 0（这个坑已踩过一次）。 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const file = resolve(process.argv[2]);
const dir = dirname(file);

const probe = `
<script>
window.addEventListener('load', () => {
  const sb = document.querySelector('.sidebar');
  const body = document.querySelector('.sb-body');
  const out = {
    sidebarWidth: +sb.getBoundingClientRect().width.toFixed(1),
    horizontalScroll: body.scrollWidth - body.clientWidth,
    cardCount: document.querySelectorAll('.shell').length,
    cards: [],
    overflowing: [],
    clipped: [],
  };
  document.querySelectorAll('.shell').forEach((shell, i) => {
    const card = shell.querySelector('.card');
    const cr = card.getBoundingClientRect();
    let minL = 1e9, maxR = -1e9, widest = '';
    card.querySelectorAll('*').forEach(n => {
      const b = n.getBoundingClientRect();
      if (!b.width && !b.height) return;
      if (b.left < minL) minL = b.left;
      if (b.right > maxR) { maxR = b.right; widest = (n.className || n.tagName) + ''; }
    });
    const over = maxR - cr.right;
    // 关键：元素盒「装不下」自身文字时（scrollWidth > clientWidth）会画到盒子外面，
    // 但它的 getBoundingClientRect 仍然在卡内，只看几何会漏检。故单独查文字溢出。
    // 例外：显式声明了 text-overflow:ellipsis 的元素是有意省略，不算缺陷。
    let textOverflow = [];
    card.querySelectorAll('*').forEach(n => {
      if (n.scrollWidth - n.clientWidth <= 1 || n.clientWidth <= 0) return;
      const ellipsis = getComputedStyle(n).textOverflow === 'ellipsis';
      if (!ellipsis) {
        textOverflow.push((n.className || n.tagName) + '[' + n.scrollWidth + '>' + n.clientWidth + ']');
      }
    });
    if (i < 3 || over > 0.5 || textOverflow.length) {
      out.cards.push({
        idx: i + 1,
        height: +cr.height.toFixed(1),
        overflowPx: +over.toFixed(2),
        leftSpill: +(cr.left - minL).toFixed(2),
        widest: widest.slice(0, 34),
        textOverflow: textOverflow.slice(0, 4),
      });
    }
    if (over > 0.5) out.overflowing.push(i + 1);
    if (textOverflow.length) out.clipped.push(i + 1);
  });
  document.title = 'MEASURED:' + JSON.stringify(out);
});
<\/script>`;

const tmp = resolve(dir, `_measure_${basename(file)}`);
writeFileSync(tmp, readFileSync(file, 'utf8').replace('</body>', probe + '</body>'));

let dom;
try {
  dom = execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--dump-dom',
    '--virtual-time-budget=3000', '--window-size=700,950',
    `file://${tmp}`,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} finally {
  unlinkSync(tmp);
}

const m = /MEASURED:(\{.*?\})<\/title>/s.exec(dom);
if (!m) { console.error('✗ 未取到量测结果'); process.exit(1); }
const r = JSON.parse(m[1]);

console.log(`【${basename(file)}】`);
console.log(`  侧栏宽度 ${r.sidebarWidth}px（应恒为 224）  列表横向溢出 ${r.horizontalScroll}px  卡片 ${r.cardCount} 张`);
r.cards.forEach(c => console.log(
  `  卡#${String(c.idx).padStart(2)}  高 ${String(c.height).padStart(5)}px  右溢出 ${String(c.overflowPx).padStart(6)}px  左溢 ${c.leftSpill}px  [${c.widest}]`
  + (c.textOverflow && c.textOverflow.length ? `\n        ✗ 文字溢出盒: ${c.textOverflow.join(', ')}` : '')
));
const ok = r.sidebarWidth === 224 && r.overflowing.length === 0
  && r.horizontalScroll <= 0 && r.cardCount > 0 && r.clipped.length === 0;
console.log(ok
  ? '  ✓ 通过：宽度未变、无横向溢出、无内容越界、无文字截断'
  : `  ✗ 失败：越界卡 ${r.overflowing.join(',') || '无'} / 文字截断卡 ${r.clipped.join(',') || '无'} / 宽度 ${r.sidebarWidth}`);
process.exit(ok ? 0 : 1);
