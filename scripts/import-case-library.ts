import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

type Domain = 'bazi' | 'qimen';

interface LibraryFile {
    id: string;
    objectKey: string;
    sourcePath: string;
    title: string;
    domain: Domain;
    authorKey: string;
    authorName: string;
    category: string;
    summary: string;
    sha256: string;
    byteSize: number;
    profile: boolean;
}

const workspace = resolve(import.meta.dirname, '..');
const dataRoot = resolve(workspace, 'src/data/cases');
const outputRoot = resolve(workspace, '.wrangler/case-library-import');
const authorNames: Record<string, string> = { lishuanglin: '李双林', nanxuanzi: '南玄子', buchuiniu: '不吹牛', zhangzhichun: '张志春' };

function run(command: string, args: string[]): Promise<void> {
    return new Promise((resolvePromise, reject) => {
        const child = spawn(command, args, { cwd: workspace, stdio: 'inherit' });
        child.once('error', reject);
        child.once('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(command + ' 失败，退出码：' + code)));
    });
}

async function walk(directory: string): Promise<string[]> {
    const children = await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? walk(path) : entry.isFile() && path.endsWith('.md') ? [path] : [];
    }));
    return children.flat();
}

function quote(value: string | number): string {
    return typeof value === 'number' ? String(value) : "'" + value.replaceAll("'", "''") + "'";
}

function summary(content: string, domain: Domain): string {
    if (domain === 'qimen') return content.match(/(?:\*\*)?公元(?:\*\*)?[：:]\s*([^\n]+)/)?.[1]?.trim() ?? '未知时间';
    const birth = content.match(/命主生辰[：:]\s*([^\n]+)/)?.[1]?.trim();
    const master = content.match(/日主[：:]\s*([^\n]+)/)?.[1]?.trim();
    return birth && master ? birth + ' ' + master : '未知八字';
}

async function collect(): Promise<LibraryFile[]> {
    const files: LibraryFile[] = [];
    for (const path of await walk(dataRoot)) {
        const parts = relative(dataRoot, path).split(sep);
        const [domain, authorKey, ...rest] = parts;
        if ((domain !== 'bazi' && domain !== 'qimen') || !authorKey || !rest.length) continue;
        const content = await readFile(path, 'utf8');
        const authorName = authorNames[authorKey] ?? authorKey;
        const title = rest.at(-1)?.replace(/\.md$/, '') ?? '无标题';
        const isProfile = rest.length === 1 && title === authorName;
        const relativeKey = domain + '/' + authorKey + '/' + rest.join('/');
        files.push({
            id: relativeKey,
            objectKey: 'case-library/' + relativeKey,
            sourcePath: relative(workspace, path).split(sep).join('/'),
            title,
            domain,
            authorKey,
            authorName,
            category: rest.length > 1 ? rest.at(-2) ?? '未分类' : '未分类',
            summary: summary(content, domain),
            sha256: createHash('sha256').update(content).digest('hex'),
            byteSize: (await stat(path)).size,
            profile: isProfile,
        });
    }
    return files;
}

function upsert(table: string, columns: string[], values: Array<string | number>, key: string): string {
    const assignments = columns.filter((column) => column !== key).map((column) => column + '=excluded.' + column).join(', ');
    return 'INSERT INTO ' + table + ' (' + columns.join(', ') + ') VALUES (' + values.map(quote).join(', ') + ') ON CONFLICT(' + key + ') DO UPDATE SET ' + assignments + ';';
}

function buildSeed(files: LibraryFile[]): string {
    const now = new Date().toISOString();
    const statements = ['BEGIN;'];
    for (const file of files) {
        if (file.profile) {
            statements.push(upsert('case_author_profiles', ['author_key', 'author_name', 'object_key', 'sha256', 'byte_size', 'updated_at'], [file.authorKey, file.authorName, file.objectKey, file.sha256, file.byteSize, now], 'author_key'));
        } else {
            statements.push(upsert('case_entries', ['id', 'object_key', 'title', 'domain', 'author_key', 'author_name', 'category', 'summary', 'sha256', 'byte_size', 'source_path', 'updated_at'], [file.id, file.objectKey, file.title, file.domain, file.authorKey, file.authorName, file.category, file.summary, file.sha256, file.byteSize, file.sourcePath, now], 'id'));
        }
    }
    statements.push('COMMIT;');
    return statements.join('\n');
}

async function upload(files: LibraryFile[]): Promise<void> {
    let next = 0;
    const failures: string[] = [];
    const worker = async () => {
        while (next < files.length) {
            const file = files[next++];
            try {
                await run('wrangler', ['r2', 'object', 'put', 'orbis/' + file.objectKey, '--remote', '--file', resolve(workspace, file.sourcePath), '--content-type', 'text/markdown; charset=utf-8', '--cache-control', 'public, max-age=300']);
            } catch (error) {
                failures.push(file.sourcePath + ': ' + String(error));
            }
        }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    if (failures.length) throw new Error('R2 上传失败：\n' + failures.join('\n'));
}

async function main(): Promise<void> {
    const files = await collect();
    await rm(outputRoot, { recursive: true, force: true });
    await mkdir(outputRoot, { recursive: true });
    await writeFile(resolve(outputRoot, 'seed.sql'), buildSeed(files));
    await upload(files);
    await run('wrangler', ['d1', 'execute', 'orbis', '--remote', '--file', resolve(outputRoot, 'seed.sql'), '--yes']);
    const entries = files.filter((file) => !file.profile);
    await writeFile(resolve(outputRoot, 'report.json'), JSON.stringify({ entries: entries.length, profiles: files.length - entries.length, bytes: entries.reduce((sum, file) => sum + file.byteSize, 0), generatedAt: new Date().toISOString() }, null, 2));
    console.log('导入完成：' + entries.length + ' 篇案例。');
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
