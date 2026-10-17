/**
 * case-library 校验脚本（原 verify-case-library.ts + verify-case-library-full.ts 合并）
 *
 * 默认抽样：取目录首条，校验内容可读且为 Markdown。
 * --full：逐条 HEAD 校验全部条目，缺失清单落盘到 .wrangler/case-library-import/missing.json，
 *         有缺失时退出码 2。
 *
 * 用法：
 *   CASE_LIBRARY_URL=https://orbis.<subdomain>.workers.dev tsx scripts/verify-case-library.ts
 *   CASE_LIBRARY_URL=... tsx scripts/verify-case-library.ts --full
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface Entry { id: string }
interface Directory { entries: Entry[]; total: number }

const PAGE_SIZE = 250;

const baseUrl = process.env.CASE_LIBRARY_URL?.replace(/\/$/, '');
if (!baseUrl) throw new Error('请设置 CASE_LIBRARY_URL，例如 https://orbis.<subdomain>.workers.dev');

const full = process.argv.includes('--full');

async function fetchDirectory(): Promise<Directory> {
    const response = await fetch(baseUrl + '/api/public/cases?page=1&pageSize=' + PAGE_SIZE);
    if (!response.ok) throw new Error('目录请求失败：' + response.status);
    return await response.json() as Directory;
}

/** 拉取全部分页。抽样模式下只需首页。 */
async function fetchAllEntries(first: Directory): Promise<Entry[]> {
    const pages = Array.from({ length: Math.ceil(first.total / PAGE_SIZE) - 1 }, (_, index) => index + 2);
    const rest = await Promise.all(pages.map(async (page) => {
        const response = await fetch(baseUrl + '/api/public/cases?page=' + page + '&pageSize=' + PAGE_SIZE);
        if (!response.ok) throw new Error('目录分页请求失败：' + response.status);
        return (await response.json() as Directory).entries;
    }));
    return first.entries.concat(rest.flat());
}

if (!full) {
    const directory = await fetchDirectory();
    if (!directory.entries.length) throw new Error('目录为空。');

    const sample = directory.entries[0];
    const contentResponse = await fetch(baseUrl + '/api/public/cases/' + encodeURIComponent(sample.id) + '/content');
    if (!contentResponse.ok) throw new Error('样例内容请求失败：' + contentResponse.status);
    const body = await contentResponse.text();
    if (!body.startsWith('#')) throw new Error('样例内容不是预期的 Markdown。');
    console.log(JSON.stringify({ total: directory.total, sampledId: sample.id, sampledBytes: body.length }, null, 2));
} else {
    const entries = await fetchAllEntries(await fetchDirectory());

    const missing: string[] = [];
    let cursor = 0;
    const worker = async () => {
        while (cursor < entries.length) {
            const entry = entries[cursor++];
            const response = await fetch(baseUrl + '/api/public/cases/' + encodeURIComponent(entry.id) + '/content', { method: 'HEAD' });
            if (!response.ok) missing.push(entry.id);
        }
    };
    await Promise.all(Array.from({ length: 20 }, worker));

    await mkdir(resolve('.wrangler/case-library-import'), { recursive: true });
    await writeFile(
        resolve('.wrangler/case-library-import/missing.json'),
        JSON.stringify({ checked: entries.length, missing: missing.sort(), verifiedAt: new Date().toISOString() }, null, 2),
    );
    console.log(JSON.stringify({ checked: entries.length, available: entries.length - missing.length, missing: missing.length }, null, 2));
    if (missing.length) process.exitCode = 2;
}
