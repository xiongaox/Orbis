/**
 * verify-longpress.mjs — 在真实设备上验证长按不再触发左滑
 *
 * 场景：touchStart → 静置 600ms（模拟长按）→ 横向漂移 30px → 采样卡片位移与操作层挂载情况 → touchEnd
 * 期望：整个过程中卡片 transform 保持 translateX(0px)，DOM 中不出现编辑/删除操作层。
 */
import net from 'node:net';
import crypto from 'node:crypto';

const PORT = 9222;
const res = await fetch(`http://127.0.0.1:${PORT}/json`);
const page = (await res.json()).find(t => t.type === 'page');

const sock = net.connect(Number(new URL(page.webSocketDebuggerUrl).port), '127.0.0.1');
const key = crypto.randomBytes(16).toString('base64');
let buf = Buffer.alloc(0);
let id = 0;
const pending = new Map();
const sleep = ms => new Promise(r => setTimeout(r, ms));

await new Promise((resolve) => {
  sock.on('connect', () => sock.write(
    `GET ${new URL(page.webSocketDebuggerUrl).pathname} HTTP/1.1\r\nHost: 127.0.0.1:${PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
  ));
  let hs = false;
  sock.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    if (!hs) {
      const i = buf.indexOf('\r\n\r\n');
      if (i === -1) return;
      hs = true;
      buf = buf.slice(i + 4);
      resolve();
    }
    while (buf.length >= 2) {
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (buf.length < off + len) return;
      const payload = buf.slice(off, off + len).toString();
      buf = buf.slice(off + len);
      try {
        const msg = JSON.parse(payload);
        if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      } catch { /* ignore */ }
    }
  });
});

function send(method, params = {}) {
  const msgId = ++id;
  const data = Buffer.from(JSON.stringify({ id: msgId, method, params }));
  const mask = crypto.randomBytes(4);
  const len = data.length;
  let header;
  if (len < 126) header = Buffer.from([0x81, 0x80 | len]);
  else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(len, 2); }
  else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(len), 2); }
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = data[i] ^ mask[i % 4];
  sock.write(Buffer.concat([header, mask, masked]));
  return new Promise(r => pending.set(msgId, r));
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300));
  return r.result?.result?.value;
}

const touch = (type, x, y) => send('Input.dispatchTouchEvent', {
  type,
  touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 8, radiusY: 8, force: 1 }],
});

// 采样函数：读第一张可滑动卡片的位移与操作层挂载情况
const SAMPLE = `(() => {
  const cards=[...document.querySelectorAll("[role=button]")].filter(c=>c.className.includes("touch-pan-y"));
  const c=cards[0];
  if(!c) return "no-card";
  const layers=[...document.querySelectorAll("div.absolute")].filter(d=>d.textContent.trim().startsWith("编辑"));
  return JSON.stringify({ transform: c.style.transform, layerMounted: layers.length });
})()`;

const [x, y] = process.argv.slice(2).map(Number);
console.log(`起点: (${x}, ${y})`);

await touch('touchStart', x, y);
console.log('touchStart    →', await evaluate(SAMPLE));

await sleep(600); // 长按静置
console.log('静置 600ms    →', await evaluate(SAMPLE));

for (const dx of [-10, -20, -30]) {
  await touch('touchMove', x + dx, y);
  await sleep(30);
  console.log(`漂移 ${dx}px   →`, await evaluate(SAMPLE));
}

await touch('touchEnd', x - 30, y);
await sleep(300);
console.log('touchEnd 后   →', await evaluate(SAMPLE));

sock.end();
