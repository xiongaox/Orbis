import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface Entry { id: string; }
interface Directory { entries: Entry[]; total: number; }

const baseUrl = process.env.CASE_LIBRARY_URL?.replace(/\/$/, '');
if (!baseUrl) throw new Error('请设置 CASE_LIBRARY_URL');

async function fetchDirectory(): Promise<Entry[]> {
    const first = await fetch(baseUrl + '/api/public/cases?page=1&pageSize=250').then(async (response) => {
        if (!response.ok) throw new Error('目录请求失败：' + response.status);
        return response.json() as Promise<Directory>;
    });
    const pages = Array.from({ length: Math.ceil(first.total / 250) - 1 }, (_, index) => index + 2);
    const rest = await Promise.all(pages.map(async (page) => {
        const response = await fetch(baseUrl + '/api/public/cases?page=' + page + '&pageSize=250');
        if (!response.ok) throw new Error('目录分页请求失败：' + response.status);
        return (await response.json() as Directory).entries;
    }));
    return first.entries.concat(rest.flat());
}

async function check(id: string): Promise<boolean> {
    const response = await fetch(baseUrl + '/api/public/cases/' + encodeURIComponent(id) + '/content', { method: 'HEAD' });
    return response.ok;
}

const entries = await fetchDirectory();
const missing: string[] = [];
let cursor = 0;
const worker = async () => {
    while (cursor < entries.length) {
        const entry = entries[cursor++];
        if (!(await check(entry.id))) missing.push(entry.id);
    }
};
await Promise.all(Array.from({ length: 20 }, worker));

await mkdir(resolve('.wrangler/case-library-import'), { recursive: true });
await writeFile(resolve('.wrangler/case-library-import/missing.json'), JSON.stringify({ checked: entries.length, missing: missing.sort(), verifiedAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ checked: entries.length, available: entries.length - missing.length, missing: missing.length }, null, 2));
if (missing.length) process.exitCode = 2;
