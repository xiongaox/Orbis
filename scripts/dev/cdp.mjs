/**
 * cdp.mjs — 极简 Chrome DevTools Protocol 客户端（仅用 node 内置模块）
 *
 * 用途：连接 Android WebView 的远程调试端口，执行 JS 表达式 / 派发触摸事件，
 * 以取证方式检查真实设备上的 DOM 状态。
 *
 * 用法：
 *   node scripts/dev/cdp.mjs eval '<js 表达式>'
 *   node scripts/dev/cdp.mjs longpress <x> <y> [holdMs]
 *   node scripts/dev/cdp.mjs tap <x> <y>
 *   node scripts/dev/cdp.mjs moveto <x> <y> [steps]   # 从当前点拖动（先 tap 起点）
 */
import net from 'node:net';
import crypto from 'node:crypto';

const HOST = '127.0.0.1';
const PORT = Number(process.env.CDP_PORT || 9222);

async function getWsUrl() {
    const res = await fetch(`http://${HOST}:${PORT}/json`);
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('no page target');
    return page.webSocketDebuggerUrl;
}

function connect(url) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const key = crypto.randomBytes(16).toString('base64');
        const sock = net.connect(Number(u.port), u.hostname, () => {
            sock.write(
                `GET ${u.pathname} HTTP/1.1\r\n` +
                `Host: ${u.host}\r\n` +
                `Upgrade: websocket\r\n` +
                `Connection: Upgrade\r\n` +
                `Sec-WebSocket-Key: ${key}\r\n` +
                `Sec-WebSocket-Version: 13\r\n\r\n`
            );
        });
        let handshakeDone = false;
        let buf = Buffer.alloc(0);

        const onData = (chunk) => {
            buf = Buffer.concat([buf, chunk]);
            if (!handshakeDone) {
                const idx = buf.indexOf('\r\n\r\n');
                if (idx === -1) return;
                const head = buf.slice(0, idx).toString();
                if (!head.includes('101')) return reject(new Error('handshake failed: ' + head));
                handshakeDone = true;
                buf = buf.slice(idx + 4);
                resolve(api);
            }
            // 解析帧
            while (buf.length >= 2) {
                const b1 = buf[1];
                let len = b1 & 0x7f;
                let off = 2;
                if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
                else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
                if (buf.length < off + len) return;
                const payload = buf.slice(off, off + len).toString();
                buf = buf.slice(off + len);
                try { handlers.forEach(h => h(JSON.parse(payload))); } catch { /* 忽略非 JSON */ }
            }
        };
        const handlers = [];
        sock.on('data', onData);
        sock.on('error', reject);

        let id = 0;
        const pending = new Map();
        const api = {
            send(method, params = {}) {
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
                return new Promise((res) => pending.set(msgId, res));
            },
            on(fn) { handlers.push(fn); },
            close() { sock.end(); },
        };
        handlers.push((msg) => {
            if (msg.id && pending.has(msg.id)) {
                pending.get(msg.id)(msg);
                pending.delete(msg.id);
            }
        });
    });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const [cmd, ...args] = process.argv.slice(2);
const api = await connect(await getWsUrl());

async function evaluate(expression) {
    const r = await api.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
}

async function touch(type, x, y) {
    await api.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 8, radiusY: 8, force: 1 }],
    });
}

if (cmd === 'eval') {
    console.log(JSON.stringify(await evaluate(args.join(' ')), null, 2));
} else if (cmd === 'longpress') {
    const [x, y, hold = 900] = args.map(Number);
    await touch('touchStart', x, y);
    await sleep(hold);
    await touch('touchEnd', x, y);
    await sleep(200);
    console.log('longpress done');
} else if (cmd === 'tap') {
    const [x, y] = args.map(Number);
    await touch('touchStart', x, y);
    await sleep(60);
    await touch('touchEnd', x, y);
    await sleep(200);
    console.log('tap done');
} else if (cmd === 'moveto') {
    // 按住并水平移动：moveto <startX> <startY> <dx> [steps]
    const [sx, sy, dx, steps = 8] = args.map(Number);
    await touch('touchStart', sx, sy);
    for (let i = 1; i <= steps; i++) {
        await touch('touchMove', sx + (dx * i) / steps, sy);
        await sleep(16);
    }
    await touch('touchEnd', sx + dx, sy);
    await sleep(300);
    console.log('moveto done');
}
api.close();
