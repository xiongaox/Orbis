/**
 * pack-cases - 案例语料离线加密打包工具（作者端）
 *
 * 用法：
 *   npx tsx scripts/pack-cases.ts [--out <path>] [--bundle-version <v>]
 *       [--rust-secret-out <path>] [--no-rust-secret] [--verify-only <path>]
 *   npx tsx scripts/pack-cases.ts --unpack <encPath> [--out <dir>] [--force]
 *       （开发机还原：把加密包解密为语料目录，语料源库存放在 orbis-lore 私有仓）
 *
 * 处理流：扫描 src/data/cases 下全部 .md（含子目录）→ 组装 JSON → Gzip 压缩 →
 *         AES-256-GCM 加密 → 输出 dist-cases/cases_v1.enc
 *         （build.rs 会在构建时把该文件嵌入客户端，无需云端分发）。
 * 同时生成 src-tauri/src/cases/bundle_secret.rs（混淆后的主密钥，供客户端解包）。
 *
 * 加密包文件格式契约（客户端 Rust 层依赖，勿随意变更）：
 *   [0..8)   magic "ORBSCSv1"
 *   [8..10)  格式版本 u16 LE（当前 1）
 *   [10..22) AES-256-GCM nonce（12 字节）
 *   [22..)   密文（末尾 16 字节为 auth tag）
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

type Domain = 'bazi' | 'qimen';

interface PackagedCaseItem {
    id: string;
    title: string;
    domain: Domain;
    author_key: string;
    author_name: string;
    category: string;
    summary: string;
    content: string;
}

interface PackagedBundle {
    version: string;
    createdAt: string;
    total: number;
    cases: PackagedCaseItem[];
    authorProfiles: Record<string, string>;
}

const BUNDLE_MAGIC = 'ORBSCSv1';
const BUNDLE_FORMAT_VERSION = 1;
const RUST_SECRET_MASK_DOMAIN = 'orbis-bundle-mask:v1:';

const workspace = resolve(import.meta.dirname, '..');
const dataRoot = resolve(workspace, 'src/data/cases');
const keysDir = resolve(workspace, 'keys');
const masterKeyPath = resolve(keysDir, 'master.key');
const publicKeyPath = resolve(keysDir, 'public_key.txt');
const defaultRustSecretOut = resolve(workspace, 'src-tauri/src/cases/bundle_secret.rs');
const authorNames: Record<string, string> = { lishuanglin: '李双林', nanxuanzi: '南玄子', buchuiniu: '不吹牛', zhangzhichun: '张志春' };

function option(name: string): string | undefined {
    const argv = process.argv.slice(2);
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
}

async function walk(directory: string): Promise<string[]> {
    const children = await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? walk(path) : entry.isFile() && path.endsWith('.md') ? [path] : [];
    }));
    return children.flat();
}

function extractSummary(content: string, domain: Domain): string {
    if (domain === 'qimen') return content.match(/(?:\*\*)?公元(?:\*\*)?[：:]\s*([^\n]+)/)?.[1]?.trim() ?? '未知时间';
    const birth = content.match(/命主生辰[：:]\s*([^\n]+)/)?.[1]?.trim();
    const master = content.match(/日主[：:]\s*([^\n]+)/)?.[1]?.trim();
    return birth && master ? birth + ' ' + master : '未知八字';
}

async function collect(): Promise<{ cases: PackagedCaseItem[]; authorProfiles: Record<string, string> }> {
    const cases: PackagedCaseItem[] = [];
    const authorProfiles: Record<string, string> = {};
    for (const path of await walk(dataRoot)) {
        const parts = relative(dataRoot, path).split(sep);
        const [domain, authorKey, ...rest] = parts;
        if ((domain !== 'bazi' && domain !== 'qimen') || !authorKey || !rest.length) continue;
        const content = await readFile(path, 'utf8');
        const authorName = authorNames[authorKey] ?? authorKey;
        const title = rest.at(-1)?.replace(/\.md$/, '') ?? '无标题';
        if (rest.length === 1 && title === authorName) {
            authorProfiles[authorKey] = content;
            continue;
        }
        cases.push({
            id: domain + '/' + authorKey + '/' + rest.join('/'),
            title,
            domain,
            author_key: authorKey,
            author_name: authorName,
            category: rest.length > 1 ? rest.at(-2) ?? '未分类' : '未分类',
            summary: extractSummary(content, domain),
            content,
        });
    }
    return { cases, authorProfiles };
}

function loadMasterKey(): Buffer {
    if (!existsSync(masterKeyPath)) {
        throw new Error('未找到主密钥 keys/master.key，请先执行 npx tsx scripts/cases-keygen.ts init-keys');
    }
    const masterKey = Buffer.from(readFileSync(masterKeyPath, 'utf8').trim(), 'hex');
    if (masterKey.length !== 32) throw new Error('keys/master.key 必须是 64 位十六进制字符（32 字节）');
    return masterKey;
}

function encryptBundle(payload: Buffer, masterKey: Buffer): Buffer {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', masterKey, nonce);
    const header = Buffer.alloc(10);
    header.write(BUNDLE_MAGIC, 0, 8, 'ascii');
    header.writeUInt16LE(BUNDLE_FORMAT_VERSION, 8);
    const ciphertext = Buffer.concat([cipher.update(payload), cipher.final(), cipher.getAuthTag()]);
    return Buffer.concat([header, nonce, ciphertext]);
}

function decryptBundle(file: Buffer, masterKey: Buffer): Buffer {
    if (file.length < 38 || file.subarray(0, 8).toString('ascii') !== BUNDLE_MAGIC) {
        throw new Error('加密包头部无效（缺少 ORBSCSv1 魔数或文件被截断）');
    }
    const formatVersion = file.readUInt16LE(8);
    if (formatVersion !== BUNDLE_FORMAT_VERSION) throw new Error('不支持的加密包格式版本：' + formatVersion);
    const nonce = file.subarray(10, 22);
    const ciphertext = file.subarray(22);
    const decipher = createDecipheriv('aes-256-gcm', masterKey, nonce);
    decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
    return Buffer.concat([decipher.update(ciphertext.subarray(0, ciphertext.length - 16)), decipher.final()]);
}

function maskedMasterKeyRustSource(masterKey: Buffer, publicKeyHex: string): string {
    // 主密钥以"掩码异或"形式预埋：mask 由公钥（同样预埋在客户端）派生。
    // 这只能防止密钥以明文形式出现在二进制里；真正的安全边界是
    // Ed25519 防伪造激活码 + 本机派生 LocalKey 落盘加密。
    const mask = createHash('sha256').update(RUST_SECRET_MASK_DOMAIN + publicKeyHex, 'utf8').digest();
    const masked = masterKey.map((byte, index) => byte ^ mask[index % mask.length]);
    const rows: string[] = [];
    for (let index = 0; index < masked.length; index += 8) {
        const bytes = Array.from(masked.subarray(index, index + 8), (byte) => '0x' + byte.toString(16).padStart(2, '0'));
        rows.push('    ' + bytes.join(', '));
    }
    return [
        '// 自动生成：npx tsx scripts/pack-cases.ts（--rust-secret-out）。请勿手动编辑。',
        '// 内容为案例包 AES-256-GCM 主密钥的掩码异或形式；',
        '// 解掩码：mask = SHA256("' + RUST_SECRET_MASK_DOMAIN + '" + 公钥十六进制)。',
        'pub const BUNDLE_FORMAT_VERSION: u16 = ' + BUNDLE_FORMAT_VERSION + ';',
        '',
        'pub const MASKED_MASTER_KEY: [u8; 32] = [',
        rows.join(',\n'),
        '];',
        '',
    ].join('\n');
}

async function verifyBundleFile(path: string, masterKey: Buffer): Promise<PackagedBundle> {
    const file = await readFile(path);
    const payload = decryptBundle(file, masterKey);
    const bundle = JSON.parse(gunzipSync(payload).toString('utf8')) as PackagedBundle;
    console.log('✓ 解包校验通过：版本 ' + bundle.version + '，案例 ' + bundle.cases.length + ' 篇，作者生平 ' + Object.keys(bundle.authorProfiles).length + ' 位。');
    return bundle;
}

/** 还原条目路径：拒绝绝对路径与目录穿越，保证输出不越出目标根目录。 */
function safeJoin(root: string, id: string): string {
    if (id.startsWith('/') || id.split(/[\\/]/).includes('..')) {
        throw new Error('加密包内出现非法条目路径：' + id);
    }
    return resolve(root, id);
}

async function unpackBundle(bundlePath: string, outputRoot: string, force: boolean): Promise<void> {
    const masterKey = loadMasterKey();
    const bundle = await verifyBundleFile(bundlePath, masterKey);

    const existing = await readdir(outputRoot).catch(() => null);
    if (existing && existing.length > 0 && !force) {
        throw new Error('目标目录非空（' + outputRoot + '），确认覆盖请追加 --force');
    }
    await mkdir(outputRoot, { recursive: true });

    // 作者简介文件与作者案例同域存放：按 authorKey 在包内出现的 domain 还原
    const authorDomains = new Map<string, Set<string>>();
    let written = 0;
    for (const item of bundle.cases) {
        const parts = item.id.split('/');
        if (parts.length < 3) throw new Error('加密包内条目 id 不符合 domain/author/文件 约定：' + item.id);
        const target = safeJoin(outputRoot, item.id);
        await mkdir(resolve(target, '..'), { recursive: true });
        await writeFile(target, item.content, 'utf8');
        written++;
        const domains = authorDomains.get(item.author_key) ?? new Set<string>();
        domains.add(parts[0]);
        authorDomains.set(item.author_key, domains);
    }
    for (const [authorKey, domains] of authorDomains) {
        const profile = bundle.authorProfiles[authorKey];
        if (!profile) continue;
        const authorName = bundle.cases.find((item) => item.author_key === authorKey)?.author_name ?? authorKey;
        for (const domain of domains) {
            const target = safeJoin(outputRoot, domain + '/' + authorKey + '/' + authorName + '.md');
            await mkdir(resolve(target, '..'), { recursive: true });
            await writeFile(target, profile, 'utf8');
            written++;
        }
    }
    console.log('✓ 还原完成：' + relative(workspace, resolve(outputRoot)) + '，共写出 ' + written + ' 个文件（案例 ' + bundle.cases.length + ' 篇 + 作者简介）。');
}

async function main(): Promise<void> {
    const verifyOnlyPath = option('--verify-only');
    const unpackPath = option('--unpack');
    const masterKey = loadMasterKey();
    if (verifyOnlyPath) {
        await verifyBundleFile(resolve(workspace, verifyOnlyPath), masterKey);
        return;
    }
    if (unpackPath) {
        const outputRoot = resolve(workspace, option('--out') ?? 'src/data/cases');
        await unpackBundle(resolve(workspace, unpackPath), outputRoot, process.argv.includes('--force'));
        return;
    }

    const output = resolve(workspace, option('--out') ?? 'dist-cases/cases_v1.enc');
    const bundleVersion = option('--bundle-version') ?? new Date().toISOString().slice(0, 10).replaceAll('-', '.');
    const rustSecretOut = option('--rust-secret-out');
    const skipRustSecret = process.argv.includes('--no-rust-secret');

    const { cases, authorProfiles } = await collect();
    if (cases.length === 0) throw new Error('未扫描到任何案例文件，请检查 src/data/cases 目录');

    const bundle: PackagedBundle = {
        version: bundleVersion,
        createdAt: new Date().toISOString(),
        total: cases.length,
        cases,
        authorProfiles,
    };
    const payload = gzipSync(Buffer.from(JSON.stringify(bundle), 'utf8'), { level: 9 });
    const encrypted = encryptBundle(payload, masterKey);

    await rm(resolve(output, '..'), { recursive: true, force: true }).catch(() => undefined);
    await mkdir(resolve(output, '..'), { recursive: true });
    await writeFile(output, encrypted);

    if (!skipRustSecret) {
        if (!existsSync(publicKeyPath)) throw new Error('未找到 keys/public_key.txt，无法生成 Rust 主密钥文件');
        const publicKeyHex = readFileSync(publicKeyPath, 'utf8').trim();
        await mkdir(resolve((rustSecretOut ?? defaultRustSecretOut), '..'), { recursive: true });
        await writeFile(rustSecretOut ?? defaultRustSecretOut, maskedMasterKeyRustSource(masterKey, publicKeyHex));
    }

    const report = {
        version: bundleVersion,
        cases: cases.length,
        authorProfiles: Object.keys(authorProfiles).length,
        rawJsonBytes: Buffer.from(JSON.stringify(bundle), 'utf8').length,
        gzipBytes: payload.length,
        encryptedBytes: encrypted.length,
        sha256: createHash('sha256').update(encrypted).digest('hex'),
        createdAt: bundle.createdAt,
    };
    await writeFile(resolve(output, '../report.json'), JSON.stringify(report, null, 2));
    console.log('打包完成：' + relative(workspace, output));
    console.log(JSON.stringify(report, null, 2));

    await verifyBundleFile(output, masterKey);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
