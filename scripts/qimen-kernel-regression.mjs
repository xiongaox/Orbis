// 奇门内核回归快照工具（JSON 结构化指纹版）
// 用法：
//   node scripts/qimen-kernel-regression.mjs                    # 打印快照到 stdout
//   node scripts/qimen-kernel-regression.mjs baseline.json      # 快照写入文件
//   node scripts/qimen-kernel-regression.mjs --check baseline.json  # 与基线对比，不一致时退出码 1
//
// 对 public/wasm/csp_qimen.js 内核按固定日期集 × 四种盘式（+手动定局用例）调用 runJson，
// 提取值符/值使/定局标签 + 九宫内容作为指纹。内核升级（build_wasm.sh）前后各跑一次并 --check，
// 即可确认盘面无意外漂移。日期集覆盖节气交界与茅山定元窗口；茅山回加验收见
// docs/qimen-panmethod-fix-plan.md P5。

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WASM_DIR = join(ROOT, 'public', 'wasm');

// 覆盖节气交界与茅山定元窗口（交节后 0-5 天上元 / 5-10 天中元 / ≥10 天下元）
const DATES = [
    [2026, 9, 8],   // 白露后1天
    [2026, 9, 10],  // 白露后3天
    [2026, 9, 15],  // 白露后8天（中元窗口）
    [2026, 9, 20],  // 白露后13天（下元窗口，置润超神分歧日）
    [2026, 9, 23],  // 秋分交节日
    [2026, 9, 25],  // 秋分后2天（上元窗口，茅山 bug 探针）
    [2026, 10, 1],  // 秋分后8天（中元窗口，茅山 bug 探针）
    [2026, 10, 3],  // 寒露交界前
    [2026, 10, 8],  // 寒露交节日
    [2026, 10, 15], // 寒露后7天（中元窗口，茅山 bug 探针）
    [2026, 10, 20], // 寒露后12天（下元窗口）
    [2026, 12, 22], // 冬至交节日（阳遁）
    [2027, 1, 5],   // 小寒交节日附近
];

// [type, ju] 组合：1-4 自动定局 + 手动定局用例
const TYPE_JU_CASES = [
    [1, 0], [2, 0], [3, 0], [4, 0],
    [1, -6], // 手动阴遁六局
    [2, 5],  // 手动阳遁五局
];

function loadKernel() {
    const src = readFileSync(join(WASM_DIR, 'csp_qimen.js'), 'utf8');
    // emscripten 产物在 Node 下需要注入 require/__dirname/__filename
    const factory = new Function('require', '__dirname', '__filename', src + '\n;return createCspModule;')(
        createRequire(import.meta.url), WASM_DIR, 'csp_qimen.js'
    );
    return factory({ locateFile: (p) => join(WASM_DIR, p) });
}

const CN_NUMS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const YUAN_LABEL = { 3: '上元', 2: '中元', 1: '下元' };

function fingerprint(j) {
    const yuanLabel = j.yuan === -1 ? '自动定局' : j.yuan === 0 ? '手动定局' : `${j.jieQi}${YUAN_LABEL[j.yuan]}`;
    const juLabel = `${j.isYin ? '阴遁' : '阳遁'}${CN_NUMS[j.ju] || j.ju}局`;
    const palaces = [...j.palaces]
        .sort((a, b) => a.pos - b.pos)
        .map((p) =>
            `${p.pos}:${p.shen || '-'}|${p.anGan || '-'}|${p.xing || '-'}|${(p.tianPan || '') + (p.tianPanJi || '')}|${p.men || '-'}|${(p.diPan || '') + (p.diPanJi || '')}${p.isKong ? '空' : ''}${p.isMa ? '马' : ''}`
        )
        .join(' ');
    return {
        zhiFu: j.zhiFu,
        zhiShi: j.zhiShi,
        dingJu: `${yuanLabel}·${juLabel}`,
        yueJiang: j.yueJiang || '',
        wuBuYu: !!j.wuBuYu,
        siZhu: `${j.siZhu.year} ${j.siZhu.month} ${j.siZhu.day} ${j.siZhu.hour}`,
        palaces,
    };
}

async function main() {
    const args = process.argv.slice(2);
    const checkIdx = args.indexOf('--check');
    const checkPath = checkIdx >= 0 ? args[checkIdx + 1] : null;
    const resolveArg = (p) => (isAbsolute(p) ? p : join(process.cwd(), p));
    const outPath = !checkPath && args[0] ? resolveArg(args[0]) : null;

    const mod = await loadKernel();
    const results = [];
    let runKernelVersion = '';

    for (const [y, m, d] of DATES) {
        for (const [type, ju] of TYPE_JU_CASES) {
            const param = new mod.CmdParam();
            param.year = y; param.mon = m; param.day = d;
            param.hour = 10; param.min = 30; param.sec = 0;
            param.zone = 0.0; param.angan = 1; param.ju = ju; param.type = type;
            const out = mod.runJson(param);
            param.delete();
            const j = JSON.parse(out);
            runKernelVersion = j.kernel || runKernelVersion;
            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            results.push({ key: `${dateStr}|t${type}|j${ju}`, fp: fingerprint(j) });
        }
    }

    const kernelVersion = existsSync(join(WASM_DIR, 'UPSTREAM_VERSION'))
        ? readFileSync(join(WASM_DIR, 'UPSTREAM_VERSION'), 'utf8').trim()
        : `CSP ${runKernelVersion}`;
    const snapshot = { kernel: kernelVersion, generatedAt: new Date().toISOString(), results };

    if (checkPath) {
        const baseline = JSON.parse(readFileSync(resolveArg(checkPath), 'utf8'));
        const baseMap = new Map(baseline.results.map((r) => [r.key, r.fp]));
        const diffs = [];
        for (const r of results) {
            const base = baseMap.get(r.key);
            if (base === undefined) diffs.push(`[缺失基线] ${r.key}`);
            else {
                const fp = r.fp;
                for (const field of Object.keys(fp)) {
                    if (JSON.stringify(base[field]) !== JSON.stringify(fp[field])) {
                        diffs.push(`[漂移] ${r.key} ${field}\n  基线: ${base[field]}\n  当前: ${fp[field]}`);
                    }
                }
            }
        }
        if (diffs.length > 0) {
            console.error(`内核输出与基线不一致（${diffs.length} 处）：\n${diffs.join('\n')}`);
            process.exit(1);
        }
        console.log(`✅ 内核输出与基线一致（${results.length} 用例，基线内核: ${baseline.kernel}，当前内核: ${kernelVersion}）`);
    } else if (outPath) {
        writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n');
        console.log(`✅ 快照已写入 ${outPath}（${results.length} 用例，内核: ${kernelVersion}）`);
    } else {
        console.log(JSON.stringify(snapshot, null, 2));
    }
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
