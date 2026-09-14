/**
 * cases-keygen - 作者端密钥与激活码签发工具
 *
 * 用法：
 *   npx tsx scripts/cases-keygen.ts init-keys [--force]
 *     生成 keys/author_private.key（Ed25519 私钥种子，严禁提交 git）、
 *          keys/public_key.txt（十六进制公钥，可公开预埋进客户端）、
 *          keys/master.key（案例包 AES-256-GCM 主密钥）。
 *
 *   npx tsx scripts/cases-keygen.ts sign --machine <MACHINE_ID>
 *     根据用户提供的机器识别码签发专属激活码（ACT-XXXX...）。
 *
 *   npx tsx scripts/cases-keygen.ts verify --machine <MACHINE_ID> --code <ACTIVATION_CODE>
 *     本地自检激活码是否与机器码匹配。
 *
 *   npx tsx scripts/cases-keygen.ts set-master-password [--password <PW> | --clear]
 *     设置/清除作者管理密码（面对面激活用）。不传 --password 时隐藏式输入，
 *     避免进入 shell 历史。仅把 PBKDF2 校验哈希写入
 *     src-tauri/src/cases/master_password.rs（可提交，原密码不落任何文件），
 *     换密码后需重新构建发版。
 *
 *   npx tsx scripts/cases-keygen.ts export-signing [--password <PW>]
 *     管理员版专用：把 Ed25519 私钥用管理密码派生密钥（AES-256-GCM）封印，
 *     写入 keys/signing_blob.rs（gitignored）。管理员版构建（cargo feature
 *     admin-signing）把它嵌进二进制，配合管理密码在应用内直接签发激活码；
 *     普通版（GitHub Actions）不含该文件与 feature，无私钥材料。
 *     注意：换管理密码时需同时重跑 set-master-password 与 export-signing。
 *
 * 激活码格式契约（客户端 Rust 层依赖，勿随意变更）：
 *   ACT- + base32(64字节 Ed25519 签名) 按 6 字符分组，组间以 '-' 连接。
 *   签名消息 = "orbis-case-activation:" + 机器识别码（UTF-8，大写）。
 */
import { createCipheriv, createPrivateKey, createPublicKey, generateKeyPairSync, pbkdf2Sync, randomBytes, sign as ed25519Sign, verify as ed25519Verify } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const workspace = resolve(import.meta.dirname, '..');
const keysDir = resolve(workspace, 'keys');
const privateKeyPath = resolve(keysDir, 'author_private.key');
const publicKeyPath = resolve(keysDir, 'public_key.txt');
const masterKeyPath = resolve(keysDir, 'master.key');
const masterPasswordRsPath = resolve(workspace, 'src-tauri/src/cases/master_password.rs');
const signingBlobPath = resolve(keysDir, 'signing_blob.rs');

const SIGN_MESSAGE_PREFIX = 'orbis-case-activation:';
const ACTIVATION_CODE_PREFIX = 'ACT-';
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
// 与 src-tauri/src/cases/crypto.rs 的 MASTER_PASSWORD_PBKDF2 常量一致，改动需同步。
const MASTER_PASSWORD_ITERATIONS = 210_000;
const MASTER_PASSWORD_SALT = 'orbis-master-pw:v1';
// 与 src-tauri/src/cases/signing.rs 的 SIGNING_KEK_SALT 一致，改动需同步。
const SIGNING_KEK_SALT = 'orbis-signing-kek:v1';

function masterPasswordVerifyHash(password: string): Buffer {
    return pbkdf2Sync(password, MASTER_PASSWORD_SALT, MASTER_PASSWORD_ITERATIONS, 32, 'sha256');
}

function writeMasterPasswordRs(verify: Buffer | null): void {
    const rows = verify
        ? Array.from({ length: 4 }, (_, index) =>
              '    ' + Array.from(verify.subarray(index * 8, index * 8 + 8), (byte) => '0x' + byte.toString(16).padStart(2, '0')).join(', '))
        : ['    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00', '    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00', '    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00', '    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00'];
    const content = [
        '// 自动生成：npx tsx scripts/cases-keygen.ts set-master-password。请勿手动编辑。',
        '// 作者管理密码的 PBKDF2-HMAC-SHA256 校验哈希（盐 ' + MASTER_PASSWORD_SALT + '，' + MASTER_PASSWORD_ITERATIONS + ' 轮）。',
        '// 原密码不出现在任何文件中；全零表示未启用管理密码激活。',
        'pub const MASTER_PASSWORD_SALT: &str = "' + MASTER_PASSWORD_SALT + '";',
        'pub const MASTER_PASSWORD_ITERATIONS: u32 = ' + MASTER_PASSWORD_ITERATIONS + ';',
        '',
        'pub const MASTER_PASSWORD_VERIFY: [u8; 32] = [',
        rows.join(',\n'),
        '];',
        '',
    ].join('\n');
    writeFileSync(masterPasswordRsPath, content);
}

async function promptHidden(question: string): Promise<string> {
    return new Promise((resolvePromise) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        // 隐藏式输入：只回显问题与 *，避免密码进入终端记录。
        rl._writeToOutput = (output: string): void => {
            if (output.includes(question) || output.includes('\n') || output.includes('\r')) {
                rl.output.write(output.includes(question) ? question : '\n');
            } else {
                rl.output.write('*');
            }
        };
        rl.question(question, (answer) => {
            rl.close();
            resolvePromise(answer);
        });
    });
}

async function cmdSetMasterPassword(): Promise<void> {
    const argv = process.argv.slice(2);
    if (argv.includes('--clear')) {
        writeMasterPasswordRs(null);
        console.log('已清除管理密码（客户端将拒绝该方式激活）。');
        return;
    }
    let password = argv.includes('--password') ? argv[argv.indexOf('--password') + 1] : undefined;
    if (!password) {
        password = await promptHidden('设置管理密码（输入不回显）: ');
        const confirmed = await promptHidden('再次输入确认: ');
        if (password !== confirmed) throw new Error('两次输入不一致，未做任何修改');
    }
    if (password.length < 8) throw new Error('管理密码至少 8 位');
    writeMasterPasswordRs(masterPasswordVerifyHash(password));
    console.log('已写入 ' + masterPasswordRsPath.slice(workspace.length + 1) + '（仅哈希，可提交；重新构建发版后生效）。');
}

async function cmdExportSigning(): Promise<void> {
    if (!existsSync(privateKeyPath)) throw new Error('未找到 keys/author_private.key，请先执行 init-keys');
    const argv = process.argv.slice(2);
    let password = argv.includes('--password') ? argv[argv.indexOf('--password') + 1] : undefined;
    if (!password) {
        password = await promptHidden('管理密码（用于封印私钥，输入不回显）: ');
    }
    if (password.length < 8) throw new Error('管理密码至少 8 位');
    const seed = Buffer.from(readFileSync(privateKeyPath, 'utf8').trim(), 'hex');
    if (seed.length !== 32) throw new Error('私钥文件格式无效');
    const kek = pbkdf2Sync(password, SIGNING_KEK_SALT, MASTER_PASSWORD_ITERATIONS, 32, 'sha256');
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', kek, nonce);
    const sealed = Buffer.concat([cipher.update(seed), cipher.final(), cipher.getAuthTag()]);
    const nonceHex = Array.from(nonce, (byte) => '0x' + byte.toString(16).padStart(2, '0')).join(', ');
    const sealedHex = Array.from({ length: 6 }, (_, index) =>
        '        ' + Array.from(sealed.subarray(index * 8, index * 8 + 8), (byte) => '0x' + byte.toString(16).padStart(2, '0')).join(', ')).join(',\n');
    const content = [
        '// 自动生成：npx tsx scripts/cases-keygen.ts export-signing。位于 gitignored keys/，严禁提交。',
        '// 内容为 Ed25519 私钥种子的 AES-256-GCM 封印（密钥 = PBKDF2(管理密码, "' + SIGNING_KEK_SALT + '", ' + MASTER_PASSWORD_ITERATIONS + ')）。',
        '// 仅管理员版构建（--features admin-signing）会把它嵌入二进制。',
        'pub const SIGNING_BLOB: Option<(&[u8; 12], &[u8; 48])> = Some((',
        '    (&[' + nonceHex + ']),',
        '    (&[',
        sealedHex,
        '    ]),',
        '));',
        '',
    ].join('\n');
    writeFileSync(signingBlobPath, content);
    console.log('已写入 ' + signingBlobPath.slice(workspace.length + 1) + '（管理员版构建时自动嵌入）。');
}

function base32Encode(bytes: Buffer): string {
    let bitBuffer = 0;
    let bitCount = 0;
    let output = '';
    for (const byte of bytes) {
        bitBuffer = (bitBuffer << 8) | byte;
        bitCount += 8;
        while (bitCount >= 5) {
            output += BASE32_ALPHABET[(bitBuffer >>> (bitCount - 5)) & 31];
            bitCount -= 5;
        }
    }
    if (bitCount > 0) output += BASE32_ALPHABET[(bitBuffer << (5 - bitCount)) & 31];
    return output;
}

export function base32Decode(text: string): Buffer {
    let bitBuffer = 0;
    let bitCount = 0;
    const bytes: number[] = [];
    for (const char of text.toUpperCase()) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index < 0) continue;
        bitBuffer = (bitBuffer << 5) | index;
        bitCount += 5;
        if (bitCount >= 8) {
            bytes.push((bitBuffer >>> (bitCount - 8)) & 255);
            bitCount -= 8;
        }
    }
    return Buffer.from(bytes);
}

function formatActivationCode(signature: Buffer): string {
    const encoded = base32Encode(signature);
    const groups = encoded.match(/.{1,6}/g) ?? [];
    return ACTIVATION_CODE_PREFIX + groups.join('-');
}

function parseActivationCode(code: string): Buffer {
    const normalized = code.trim().toUpperCase().replace(/^ACT-/, '').replaceAll('-', '');
    const signature = base32Decode(normalized);
    if (signature.length !== 64) throw new Error('激活码格式无效（解码后不是 64 字节 Ed25519 签名）');
    return signature;
}

function normalizeMachineId(machineId: string): string {
    const normalized = machineId.trim().toUpperCase();
    if (!/^ORBIS-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(normalized)) {
        throw new Error('机器识别码格式无效，应为 ORBIS-XXXX-XXXX-XXXX（十六进制）：' + machineId);
    }
    return normalized;
}

function loadPrivateKey(): ReturnType<typeof createPrivateKey> {
    if (!existsSync(privateKeyPath) || !existsSync(publicKeyPath)) {
        throw new Error('未找到 keys/author_private.key 或 keys/public_key.txt，请先执行 init-keys');
    }
    const seed = Buffer.from(readFileSync(privateKeyPath, 'utf8').trim(), 'hex');
    const publicBytes = Buffer.from(readFileSync(publicKeyPath, 'utf8').trim(), 'hex');
    return createPrivateKey({
        key: {
            kty: 'OKP',
            crv: 'Ed25519',
            d: seed.toString('base64url'),
            x: publicBytes.toString('base64url'),
        },
        format: 'jwk',
    });
}

function loadPublicKey(): ReturnType<typeof createPublicKey> {
    if (!existsSync(publicKeyPath)) {
        throw new Error('未找到公钥文件 keys/public_key.txt，请先执行 init-keys');
    }
    const publicBytes = Buffer.from(readFileSync(publicKeyPath, 'utf8').trim(), 'hex');
    return createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: publicBytes.toString('base64url') }, format: 'jwk' });
}

function signMachineId(machineId: string): Buffer {
    const privateKey = loadPrivateKey();
    return ed25519Sign(null, Buffer.from(SIGN_MESSAGE_PREFIX + machineId, 'utf8'), privateKey);
}

function cmdInitKeys(force: boolean): void {
    if (existsSync(privateKeyPath) && !force) {
        throw new Error('密钥已存在（keys/author_private.key）。如确认要重新生成（旧激活码将全部失效），请追加 --force');
    }
    mkdirSync(keysDir, { recursive: true });
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const privateJwk = privateKey.export({ format: 'jwk' }) as { d?: string };
    const publicJwk = publicKey.export({ format: 'jwk' }) as { x?: string };
    if (!privateJwk.d || !publicJwk.x) throw new Error('Ed25519 密钥导出失败');
    const seed = Buffer.from(privateJwk.d, 'base64url');
    const publicBytes = Buffer.from(publicJwk.x, 'base64url');
    if (seed.length !== 32 || publicBytes.length !== 32) throw new Error('Ed25519 密钥长度异常');

    writeFileSync(privateKeyPath, seed.toString('hex') + '\n', { mode: 0o600 });
    writeFileSync(publicKeyPath, publicBytes.toString('hex') + '\n');
    if (!existsSync(masterKeyPath)) {
        writeFileSync(masterKeyPath, randomBytes(32).toString('hex') + '\n', { mode: 0o600 });
    }

    console.log('已生成密钥：');
    console.log('  私钥（严禁提交 git）：keys/author_private.key');
    console.log('  公钥（可预埋客户端）：' + publicBytes.toString('hex'));
    console.log('  案例包主密钥：keys/master.key');
    console.log('');
    console.log('请将上方公钥配置为 Rust 构建环境变量 ORBIS_CASE_SIGN_PUBLIC_KEY。');
}

function cmdSign(machineId: string): void {
    const normalized = normalizeMachineId(machineId);
    const signature = signMachineId(normalized);
    const code = formatActivationCode(signature);
    console.log('机器识别码：' + normalized);
    console.log('专属激活码：');
    console.log(code);
}

function cmdVerify(machineId: string, code: string): void {
    const normalized = normalizeMachineId(machineId);
    const signature = parseActivationCode(code);
    const valid = ed25519Verify(null, Buffer.from(SIGN_MESSAGE_PREFIX + normalized, 'utf8'), loadPublicKey(), signature);
    console.log(valid ? '✓ 激活码与机器识别码匹配' : '✗ 激活码与机器识别码不匹配');
    if (!valid) process.exitCode = 1;
}

function main(): void {
    const [command, ...rest] = process.argv.slice(2);
    const option = (name: string): string | undefined => {
        const index = rest.indexOf(name);
        return index >= 0 ? rest[index + 1] : undefined;
    };
    if (command === 'init-keys') {
        cmdInitKeys(rest.includes('--force'));
        return;
    }
    if (command === 'sign') {
        cmdSign(option('--machine') ?? '');
        return;
    }
    if (command === 'verify') {
        cmdVerify(option('--machine') ?? '', option('--code') ?? '');
        return;
    }
    if (command === 'set-master-password') {
        void cmdSetMasterPassword().catch((error: unknown) => {
            console.error(error instanceof Error ? error.message : error);
            process.exitCode = 1;
        });
        return;
    }
    if (command === 'export-signing') {
        void cmdExportSigning().catch((error: unknown) => {
            console.error(error instanceof Error ? error.message : error);
            process.exitCode = 1;
        });
        return;
    }
    console.log('未知命令。可用命令：init-keys [--force] | sign --machine <ID> | verify --machine <ID> --code <CODE> | set-master-password [--password <PW> | --clear] | export-signing [--password <PW>]');
    process.exitCode = 1;
}

main();
