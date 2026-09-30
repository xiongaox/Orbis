/* 奇门侧栏案例列表改版 demo · 共享逻辑：数据、分类筛选、搜索、左滑、选中、toast
   骨架沿用 design-demos/sidebar-case-list/app.js（八字侧栏定稿 demo）。
   各稿只需提供 renderCard(item) 返回卡片 HTML 字符串。 */

/* 分类取自 src/services/qimenCaseService.ts 的 QIMEN_CATEGORIES */
const TAGS = [
  { id: 'work', name: '工作事业' }, { id: 'study', name: '求学考试' },
  { id: 'love', name: '恋爱婚姻' }, { id: 'wealth', name: '生意财运' },
  { id: 'lost', name: '失物失人' }, { id: 'travel', name: '出行出国' },
  { id: 'health', name: '疾病身体' }, { id: 'other', name: '其他杂项' },
];
const CAT_NAME = id => (TAGS.find(t => t.id === id) || {}).name || '';

/* 样例 12 条：四柱由 lunar-typescript 从 test_date 精确排出（含立春前年柱乙巳），
   时辰为对应占测时刻的真时辰；覆盖已验 / 待验两种反馈状态。 */
const CASES = [
  { id: '1',  t: '测跳槽新公司是否值得去', cat: 'work',   date: '2026-02-14', time: '09:30', xz: '巳时', st: 1, p: [['丙','午'],['庚','寅'],['己','未'],['己','巳']], desc: '现公司内耗严重，收到某大厂 offer，占去留吉凶。' },
  { id: '2',  t: '夜占男友行踪真假',       cat: 'love',   date: '2026-01-28', time: '22:10', xz: '亥时', st: 0, p: [['乙','巳'],['己','丑'],['壬','寅'],['辛','亥']], desc: '近三月对我冷淡，夜占其是否在外有人，看玄武临宫真假。' },
  { id: '3',  t: '股票被套何时能解套',     cat: 'wealth', date: '2026-02-03', time: '10:05', xz: '巳时', st: 1, p: [['乙','巳'],['己','丑'],['戊','申'],['丁','巳']], desc: '持仓两月深套三成，占何时回本、从哪一爻出局。' },
  { id: '4',  t: '走失布偶猫三日内可寻否', cat: 'lost',   date: '2026-02-09', time: '18:40', xz: '酉时', st: 1, p: [['丙','午'],['庚','寅'],['甲','寅'],['癸','酉']], desc: '晚间开门走失，白色布偶，占走失方向与寻回时机。' },
  { id: '5',  t: '明日大厂面试能否通过',   cat: 'study',  date: '2026-02-11', time: '08:15', xz: '辰时', st: 0, p: [['丙','午'],['庚','寅'],['丙','辰'],['壬','辰']], desc: '二面已过等 offer，占成否及入职时间。' },
  { id: '6',  t: '持续低烧半月查因',       cat: 'health', date: '2026-01-20', time: '07:50', xz: '辰时', st: 1, p: [['乙','巳'],['己','丑'],['甲','午'],['戊','辰']], desc: '医学检查无果，占病在何脏腑、何时好转。' },
  { id: '7',  t: '申时航班是否延误',       cat: 'travel', date: '2026-02-06', time: '14:20', xz: '未时', st: 1, p: [['丙','午'],['庚','寅'],['辛','亥'],['乙','未']], desc: '当日赶重要会议，占航班能否准点成行。' },
  { id: '8',  t: '与合伙人签约可成否',     cat: 'other',  date: '2026-01-31', time: '16:00', xz: '申时', st: 0, p: [['乙','巳'],['己','丑'],['乙','巳'],['甲','申']], desc: '对赌条款仍有分歧，占能否谈成与后续顺逆。' },
  { id: '9',  t: '房屋买卖何时成交',       cat: 'wealth', date: '2026-02-12', time: '20:30', xz: '戌时', st: 1, p: [['丙','午'],['庚','寅'],['丁','巳'],['庚','戌']], desc: '挂牌两月无人出价，占成交月份与价位区间。' },
  { id: '10', t: '考公面试排名几何',       cat: 'study',  date: '2026-02-05', time: '11:40', xz: '午时', st: 0, p: [['丙','午'],['庚','寅'],['庚','戌'],['壬','午']], desc: '笔试第三进面，占能否上岸与名次。' },
  { id: '11', t: '母亲手术顺利否',         cat: 'health', date: '2026-01-25', time: '15:20', xz: '申时', st: 1, p: [['乙','巳'],['己','丑'],['己','亥'],['壬','申']], desc: '下周全麻手术，占过程顺逆与术后恢复。' },
  { id: '12', t: '失物快递能否找回',       cat: 'lost',   date: '2026-02-08', time: '12:00', xz: '午时', st: 1, p: [['丙','午'],['庚','寅'],['癸','丑'],['戊','午']], desc: '显示签收未收到，占包裹所在与寻回可能。' },
];

/* 五行映射：与 src/lib/xuan-bazi/maps 同源，仅日干取五行色 */
const EL = {
  '甲': 'e-wood', '乙': 'e-wood', '丙': 'e-fire', '丁': 'e-fire', '戊': 'e-earth',
  '己': 'e-earth', '庚': 'e-metal', '辛': 'e-metal', '壬': 'e-water', '癸': 'e-water',
};

const cnDate = d => { const [y, m, day] = d.split('-'); return `${+y}年${+m}月${+day}日`; };
const mdDate = d => d.slice(5);           /* 02-14，省宽用 */
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
let selectedId = CASES[0].id;

/* ---------------- 页头 ---------------- */
function renderChips() {
  const counts = { all: CASES.length };
  TAGS.forEach(t => { counts[t.id] = CASES.filter(c => c.cat === t.id).length; });
  el('#chips').innerHTML =
    `<button class="chip${selectedTag === null ? ' on' : ''}" data-t="">全部 ${counts.all}</button>` +
    TAGS.filter(t => counts[t.id]).map(t =>
      `<button class="chip${selectedTag === t.id ? ' on' : ''}" data-t="${t.id}">${t.name} ${counts[t.id]}</button>`
    ).join('');
}

function filtered() {
  const k = search.trim();
  return CASES.filter(c =>
    (!selectedTag || c.cat === selectedTag) &&
    (!k || c.t.includes(k) || c.desc.includes(k) || c.date.includes(k) || CAT_NAME(c.cat).includes(k))
  );
}

/* ---------------- 渲染 ---------------- */
/* 由各稿覆写 */
let renderCard = () => '';

function renderList() {
  const items = filtered();
  el('#total').textContent = `(${CASES.length})`;

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
      ${renderCard(c)}
    </div>`).join('');
}

/* ---------------- 左滑 ---------------- */
const SWIPE = { WIDTH: 120, THRESHOLD: 34 };
let drag = null;
let dragTimer = null;

function cardEl(node) { return node.querySelector('.card'); }

function closeAll(except) {
  document.querySelectorAll('.card').forEach(c => {
    if (c !== except) { c.style.transform = ''; c.dataset.open = ''; }
  });
}

el('#list').addEventListener('pointerdown', e => {
  const shell = e.target.closest('.shell');
  if (!shell) return;
  const card = cardEl(shell);
  const startX = Number(card.dataset.open ? -SWIPE.WIDTH : 0);
  drag = { card, shell, x0: e.clientX, y0: e.clientY, base: startX, active: false, lock: null, longPress: false };
  clearTimeout(dragTimer);
  dragTimer = setTimeout(() => { if (drag && !drag.active) drag.longPress = true; }, 350);
});

el('#list').addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x0;
  const dy = e.clientY - drag.y0;

  if (drag.lock === null) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
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
    toast(act.dataset.act === 'edit' ? `编辑「${item.t}」（demo）` : `删除「${item.t}」（demo）`);
    return;
  }
  if (shell.dataset.suppress === '1') { shell.dataset.suppress = ''; return; }
  if (cardEl(shell).dataset.open) { closeAll(); return; }
  selectedId = shell.dataset.id;
  renderList();
  const item = CASES.find(c => c.id === selectedId);
  toast(`选中「${item.t}」`);
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
el('#createBtn').addEventListener('click', () => toast('新建案例（demo）'));
el('#importBtn').addEventListener('click', () => toast('导入案例（demo）'));
el('#exportBtn').addEventListener('click', () => toast('导出案例（demo）'));
el('#openLibrary').addEventListener('click', () => toast('打开案例库整页（demo）'));

renderChips();
renderList();
