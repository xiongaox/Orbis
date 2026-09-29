/* 侧栏案例 demo 共享逻辑：数据、筛选、搜索、左滑、排序模式、toast
   各稿只需提供 renderCard(item) 返回卡片 HTML 字符串。 */

const TAGS = ['家人', '恋人', '自己', '朋友', '父母', '案例'];

/* 样本取自截图里的真实案例 + 少量补充，覆盖 1 岁 / 30+ / 60+ 各年龄段，用于校验排版韧性 */
const CASES = [
  { id: '1',  name: '阿曾二女儿', g: 'f', tag: '朋友', date: '2026-01-13', time: '20:00', age: 1,  p: [['乙','巳'],['己','丑'],['丁','亥'],['庚','戌']] },
  { id: '2',  name: '羊刃格3',    g: 'f', tag: '案例', date: '1996-12-31', time: '16:00', age: 31, p: [['丙','子'],['庚','子'],['壬','寅'],['戊','申']] },
  { id: '3',  name: '羊刃格2',    g: 'f', tag: '案例', date: '1995-02-04', time: '04:00', age: 32, p: [['乙','亥'],['己','卯'],['甲','子'],['丙','寅']] },
  { id: '4',  name: '羊刃格1',    g: 'm', tag: '案例', date: '1982-05-14', time: '12:00', age: 45, p: [['壬','戌'],['乙','巳'],['丁','酉'],['丙','午']] },
  { id: '5',  name: '建禄格4',    g: 'm', tag: '案例', date: '1995-08-09', time: '06:00', age: 32, p: [['乙','亥'],['甲','申'],['壬','申'],['癸','卯']] },
  { id: '6',  name: '建禄格3',    g: 'f', tag: '案例', date: '1996-04-01', time: '14:30', age: 31, p: [['丙','子'],['辛','卯'],['丁','酉'],['癸','卯']] },
  { id: '7',  name: '建禄格2',    g: 'f', tag: '朋友', date: '1997-09-13', time: '09:20', age: 29, p: [['丁','丑'],['己','酉'],['庚','辰'],['癸','未']] },
  { id: '8',  name: '母亲',       g: 'f', tag: '父母', date: '1962-08-09', time: '09:20', age: 64, p: [['壬','寅'],['己','酉'],['己','酉'],['己','巳']] },
  { id: '9',  name: '父亲',       g: 'm', tag: '父母', date: '1958-11-23', time: '05:10', age: 67, p: [['戊','戌'],['癸','亥'],['辛','丑'],['辛','卯']] },
  { id: '10', name: '女儿',       g: 'f', tag: '家人', date: '2016-06-18', time: '22:40', age: 10, p: [['丙','申'],['甲','午'],['乙','酉'],['丁','亥']] },
  { id: '11', name: '我自己',     g: 'm', tag: '自己', date: '1988-03-27', time: '08:15', age: 38, p: [['戊','辰'],['乙','卯'],['癸','巳'],['丙','辰']] },
  { id: '12', name: '阿曾长子',   g: 'm', tag: '朋友', date: '2024-07-02', time: '11:30', age: 2,  p: [['甲','辰'],['辛','未'],['辛','丑'],['甲','午']] },
];

/* 五行映射：与 src/lib/xuan-bazi/maps 同源，仅日干取五行色 */
const EL = {
  '甲': 'e-wood', '乙': 'e-wood', '丙': 'e-fire', '丁': 'e-fire', '戊': 'e-earth',
  '己': 'e-earth', '庚': 'e-metal', '辛': 'e-metal', '壬': 'e-water', '癸': 'e-water',
};
const ZHI_EL = {
  '子': 'e-water', '丑': 'e-earth', '寅': 'e-wood', '卯': 'e-wood', '辰': 'e-earth', '巳': 'e-fire',
  '午': 'e-fire', '未': 'e-earth', '申': 'e-metal', '酉': 'e-metal', '戌': 'e-earth', '亥': 'e-water',
};

const cnDate = d => { const [y, m, day] = d.split('-'); return `${+y}年${+m}月${+day}日`; };
const GAN_LABEL = ['年', '月', '日', '时'];

const el = s => document.querySelector(s);
let toastTimer;
function toast(msg) {
  const t = el('#toast');
  t.querySelector('span').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

let selectedTag = null;
let search = '';
let sortMode = false;
let selectedId = CASES[0].id;

/* ---------------- 页头 ---------------- */
function renderChips() {
  const counts = { all: CASES.length };
  TAGS.forEach(t => { counts[t] = CASES.filter(c => c.tag === t).length; });
  el('#chips').innerHTML =
    `<button class="chip${selectedTag === null ? ' on' : ''}" data-t="">全部 ${counts.all}</button>` +
    TAGS.filter(t => counts[t]).map(t =>
      `<button class="chip${selectedTag === t ? ' on' : ''}" data-t="${t}">${t} ${counts[t]}</button>`
    ).join('');
}

function filtered() {
  const k = search.trim();
  return CASES.filter(c =>
    (!selectedTag || c.tag === selectedTag) &&
    (!k || c.name.includes(k) || c.date.includes(k) || c.tag.includes(k))
  );
}

/* ---------------- 渲染 ---------------- */
/* 由各稿覆写 */
let renderCard = () => '';

function renderList() {
  const items = filtered();
  el('#total').textContent = `(${CASES.length})`;
  document.body.classList.toggle('sortmode', sortMode);
  el('#sortBtn').style.color = sortMode ? 'var(--primary)' : '';

  const listEl = el('#list');
  if (!items.length) {
    listEl.innerHTML = `<div class="empty">没有匹配的案例<br><span style="font-size:11px">换个关键词或分类试试</span></div>`;
    return;
  }
  listEl.innerHTML = items.map(c => `
    <div class="shell${c.id === selectedId ? ' sel' : ''}" data-id="${c.id}">
      <div class="row-actions">
        <button class="ra-edit" data-act="edit">✎<span>编辑</span></button>
        <button class="ra-del" data-act="del">🗑<span>删除</span></button>
      </div>
      <div class="handle" title="拖动排序">⣿</div>
      ${renderCard(c)}
    </div>`).join('');
}

/* ---------------- 左滑 ---------------- */
const SWIPE = { WIDTH: 120, THRESHOLD: 34 };
let drag = null;

function cardEl(node) { return node.querySelector('.card'); }

function closeAll(except) {
  document.querySelectorAll('.card').forEach(c => {
    if (c !== except) { c.style.transform = ''; c.dataset.open = ''; }
  });
}

el('#list').addEventListener('pointerdown', e => {
  if (sortMode) return;
  const shell = e.target.closest('.shell');
  if (!shell) return;
  const card = cardEl(shell);
  const startX = Number(card.dataset.open ? -SWIPE.WIDTH : 0);
  drag = { card, shell, x0: e.clientX, y0: e.clientY, base: startX, active: false, lock: null, longPress: false };
  clearTimeout(dragTimer);
  dragTimer = setTimeout(() => { if (drag && !drag.active) drag.longPress = true; }, 350);
});

let dragTimer = null;

el('#list').addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x0;
  const dy = e.clientY - drag.y0;

  if (drag.lock === null) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    // 长按后同一次手势不再左滑（与源码 longPress 守卫一致）
    if (drag.longPress) { drag = null; return; }
    if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
    drag.lock = 'x';
    drag.active = true;
    drag.card.style.transition = 'none';
    clearTimeout(dragTimer);
    closeAll(drag.card);
  }

  const next = Math.max(-SWIPE.WIDTH, Math.min(0, drag.base + dx));
  drag.card.style.transform = `translateX(${next}px)`;
  e.preventDefault();
}, { passive: false });

function endDrag() {
  clearTimeout(dragTimer);
  if (!drag) return;
  if (drag.active) {
    const m = /translateX\((-?[\d.]+)px\)/.exec(drag.card.style.transform);
    const x = m ? Number(m[1]) : 0;
    const open = x < -SWIPE.THRESHOLD;
    drag.card.dataset.open = open ? '1' : '';
    drag.card.style.transform = open ? `translateX(-${SWIPE.WIDTH}px)` : '';
    drag.shell.dataset.suppress = '1';
    setTimeout(() => { if (drag) drag.shell.dataset.suppress = ''; }, 0);
    delete (drag.card).dataset.pending;
  }
  drag.card.style.transition = '';
  drag = null;
}
el('#list').addEventListener('pointerup', endDrag);
el('#list').addEventListener('pointercancel', endDrag);
el('#list').addEventListener('pointerleave', () => { if (drag && drag.active) endDrag(); });

/* ---------------- 点击 ---------------- */
el('#list').addEventListener('click', e => {
  const shell = e.target.closest('.shell');
  if (!shell) return;
  const act = e.target.closest('[data-act]');
  if (act) {
    const item = CASES.find(c => c.id === shell.dataset.id);
    toast(act.dataset.act === 'edit' ? `编辑「${item.name}」（demo）` : `删除「${item.name}」（demo）`);
    return;
  }
  if (shell.dataset.suppress === '1') { shell.dataset.suppress = ''; return; }
  if (cardEl(shell).dataset.open) { closeAll(); return; }
  selectedId = shell.dataset.id;
  renderList();
  const item = CASES.find(c => c.id === selectedId);
  toast(`选中「${item.name}」`);
});

/* 点击空白处收起 */
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('.shell')) closeAll();
}, true);

/* ---------------- 页头交互 ---------------- */
el('#chips').addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (!c) return;
  selectedTag = c.dataset.t || null;
  renderChips(); renderList();
});
el('#search').addEventListener('input', e => { search = e.target.value; renderList(); });
el('#sortBtn').addEventListener('click', () => {
  sortMode = !sortMode;
  closeAll();
  renderList();
  toast(sortMode ? '排序模式：拖动卡片左侧手柄调整顺序' : '已退出排序模式');
});
el('#createBtn').addEventListener('click', () => toast('新建案例（demo）'));
el('#importBtn').addEventListener('click', () => toast('导入案例（demo）'));
el('#exportBtn').addEventListener('click', () => toast('导出案例（demo）'));
el('#openLibrary').addEventListener('click', () => toast('打开案例库整页（demo）'));

renderChips();
renderList();
