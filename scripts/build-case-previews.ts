/**
 * build-case-previews - 案例试读数据生成工具（作者端）
 *
 * 用法：
 *   npx tsx scripts/build-case-previews.ts [--chars <n>] [--per-group <n>] [--ratio <0-1>] [--out <path>]
 *   --ratio 1 配合较大的 --chars 即为“整篇试读”（用于临时放量或取消截断）。
 *
 * 处理流：扫描 src/data/cases 下 域/作者/分类/*.md → 按“域/分类”分组 → 每组挑选 2 篇
 *         → 截取试读片段 → 写入 src/lib/caseStudy/casePreviews.generated.ts（构建时随前端打包）。
 *
 * 试读片段策略：
 * - 保留原文首部结构（`# 标题` + 命主生辰/性别/日主/格局/令地 元数据行），以便复用现有
 *   正文渲染与解析逻辑（渲染层会自动剥离这些行）；
 * - 正文按段落累积到试读字数预算（默认 1200 字，且不超过全文 60%），在段落边界截断；
 * - 生成的是截断文本：打包进前端产物只暴露试读量级的明文，完整正文仍只存在于加密包内。
 *
 * 选篇规则：
 * - 默认“作者轮转 + 标题排序”确定性挑篇，使同一分类下尽量覆盖不同作者；
 * - 可在 scripts/case-preview-picks.json 中按 `"域/分类": ["标题", ...]` 指定篇目覆盖默认挑篇。
 *
 * 与 pack-cases.ts 的关系：id（域/作者/相对路径去扩展名）、summary 抽取规则必须与打包脚本
 * 保持一致，激活后前端才能用同一个 id 从试读无缝切换到完整正文。
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

type Domain = 'bazi' | 'qimen';

interface RawCase {
    id: string;
    title: string;
    domain: Domain;
    authorKey: string;
    authorName: string;
    group: string;
    summary: string;
    content: string;
    bodyChars: number;
}

interface PreviewCase {
    id: string;
    title: string;
    domain: Domain;
    authorKey: string;
    authorName: string;
    group: string;
    summary: string;
    excerpt: string;
    truncated: boolean;
    excerptChars: number;
    fullChars: number;
}

const workspace = resolve(import.meta.dirname, '..');
const dataRoot = resolve(workspace, 'src/data/cases');
const picksPath = resolve(workspace, 'scripts/case-preview-picks.json');
const defaultOut = resolve(workspace, 'src/lib/caseStudy/casePreviews.generated.ts');

const DEFAULT_PREVIEW_CHARS = 1200;
const DEFAULT_PER_GROUP = 2;
/** 过短的案例不做试读样本，否则试读片段几乎等于全文 */
const MIN_BODY_CHARS = 900;
const MIN_BUDGET_CHARS = 400;
/** 试读占全文比例上限：短篇也要给完整正文留出余量，避免试读变成“几乎全文” */
const MAX_EXCERPT_RATIO = 0.4;

const authorNames: Record<string, string> = { lishuanglin: '李双林', nanxuanzi: '南玄子', buchuiniu: '不吹牛', zhangzhichun: '张志春' };
/** 断法专栏在应用内本就以明文提供（DUANFA_FILES），不参与试读挑篇，但仍计入全库篇数 */
const excludedAuthors = new Set(['duanfa']);

function option(name: string): string | undefined {
    const argv = process.argv.slice(2);
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
}

function numberOption(name: string, fallback: number): number {
    const raw = option(name);
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(name + ' 需要正整数参数');
    return parsed;
}

/** 试读占比：--ratio 1 表示整篇可读（配合较大的 --chars） */
function ratioOption(name: string, fallback: number): number {
    const raw = option(name);
    if (!raw) return fallback;
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) throw new Error(name + ' 需要 0 到 1 之间的数值');
    return parsed;
}

async function walk(directory: string): Promise<string[]> {
    const children = await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? walk(path) : entry.isFile() && path.endsWith('.md') ? [path] : [];
    }));
    return children.flat();
}

/** 字数口径：忽略空白与换行，贴近中文“字数”直觉 */
function countChars(text: string): number {
    return text.replace(/\s+/g, '').length;
}

/** 与 pack-cases.ts 保持一致：试读列表摘要需与激活后的案例列表摘要完全同源 */
function extractSummary(content: string, domain: Domain): string {
    if (domain === 'qimen') return content.match(/(?:\*\*)?公元(?:\*\*)?[：:]\s*([^\n]+)/)?.[1]?.trim() ?? '未知时间';
    const birth = content.match(/命主生辰[：:]\s*([^\n]+)/)?.[1]?.trim();
    const master = content.match(/日主[：:]\s*([^\n]+)/)?.[1]?.trim();
    return birth && master ? birth + ' ' + master : '未知八字';
}

const META_LINE = /^(命主生辰|性别|日主|格局|令地)\s*[：:]/;

/** 拆出首部结构：标题行、元数据行、正文 */
function splitContent(content: string): { titleLine: string; metaLines: string[]; body: string } {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let cursor = 0;
    while (cursor < lines.length && lines[cursor].trim() === '') cursor++;
    let titleLine = '';
    if (lines[cursor]?.startsWith('# ')) {
        titleLine = lines[cursor].trim();
        cursor++;
    }
    const metaLines: string[] = [];
    while (cursor < lines.length && lines[cursor].trim() === '') cursor++;
    while (cursor < lines.length && META_LINE.test(lines[cursor])) {
        metaLines.push(lines[cursor].trim());
        cursor++;
    }
    return { titleLine, metaLines, body: lines.slice(cursor).join('\n').trim() };
}

/** 单段超预算时按句读边界硬截，避免试读片段在句中突兀结束 */
function cutAtSentence(text: string, limit: number): string {
    let used = 0;
    let lastStop = -1;
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (!/\s/.test(char)) used++;
        if ('。！？；'.includes(char)) lastStop = index;
        if (used >= limit) {
            const end = lastStop > 0 ? lastStop + 1 : index + 1;
            return text.slice(0, end).trim();
        }
    }
    return text.trim();
}

function buildExcerpt(content: string, budget: number, ratio: number): { excerpt: string; truncated: boolean; excerptChars: number; fullChars: number } {
    const { titleLine, metaLines, body } = splitContent(content);
    const paragraphs = body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
    const fullChars = countChars(body);
    const limit = Math.min(budget, Math.max(MIN_BUDGET_CHARS, Math.floor(fullChars * ratio)));

    const picked: string[] = [];
    let used = 0;
    let truncated = false;
    for (const paragraph of paragraphs) {
        const size = countChars(paragraph);
        if (used + size > limit) {
            if (used === 0) {
                picked.push(cutAtSentence(paragraph, limit));
                used = limit;
            }
            truncated = true;
            break;
        }
        picked.push(paragraph);
        used += size;
    }

    const head = [titleLine, metaLines.join('\n')].filter(Boolean).join('\n\n');
    const excerpt = [head, picked.join('\n\n')].filter(Boolean).join('\n\n');
    return { excerpt, truncated, excerptChars: countChars(excerpt), fullChars };
}

function sortByTitle<T extends { title: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
}

/** 作者轮转挑篇：每轮从各作者桶取一篇，保证同分类下作者分布尽量均匀 */
function pickByAuthorRotation(candidates: RawCase[], count: number): RawCase[] {
    const sorted = sortByTitle(candidates);
    const buckets = new Map<string, RawCase[]>();
    for (const item of sorted) {
        const bucket = buckets.get(item.authorKey);
        if (bucket) bucket.push(item);
        else buckets.set(item.authorKey, [item]);
    }
    const authors = [...buckets.keys()].sort();
    const picked: RawCase[] = [];
    for (let round = 0; picked.length < count; round++) {
        let advanced = false;
        for (const author of authors) {
            const bucket = buckets.get(author) ?? [];
            const item = bucket[round];
            if (!item) continue;
            picked.push(item);
            advanced = true;
            if (picked.length >= count) break;
        }
        if (!advanced) break;
    }
    return picked;
}

/** 挑篇：人工指定优先，其余按作者轮转补齐；过短样本不入选，除非该分类没有足够长文 */
function pickForGroup(candidates: RawCase[], count: number, pickedTitles: string[] | undefined): RawCase[] {
    const picked: RawCase[] = [];
    for (const title of pickedTitles ?? []) {
        const matched = candidates.find((item) => item.title === title && !picked.includes(item));
        if (matched) picked.push(matched);
        else console.warn('⚠ 试读指定篇目未找到，已回落默认挑篇：' + title);
    }
    if (picked.length >= count) return picked.slice(0, count);

    const remaining = candidates.filter((item) => !picked.includes(item));
    const eligible = remaining.filter((item) => item.bodyChars >= MIN_BODY_CHARS);
    const pool = eligible.length >= count - picked.length
        ? eligible
        : [...remaining].sort((a, b) => b.bodyChars - a.bodyChars);
    return picked.concat(pickByAuthorRotation(pool, count - picked.length));
}

async function collect(): Promise<RawCase[]> {
    const cases: RawCase[] = [];
    for (const path of await walk(dataRoot)) {
        const parts = relative(dataRoot, path).split(sep);
        const [domain, authorKey, ...rest] = parts;
        if ((domain !== 'bazi' && domain !== 'qimen') || !authorKey || !rest.length) continue;
        const title = rest.at(-1)?.replace(/\.md$/, '') ?? '无标题';
        const authorName = authorNames[authorKey] ?? authorKey;
        // 作者生平文件（作者目录下的同名 md）不是案例，不计入分组与总篇数
        if (rest.length === 1 && title === authorName) continue;
        const content = await readFile(path, 'utf8');
        cases.push({
            id: [domain, authorKey, ...rest].join('/'),
            title,
            domain,
            authorKey,
            authorName,
            group: rest.length > 1 ? rest.at(-2) ?? '未分类' : '未分类',
            summary: extractSummary(content, domain),
            content,
            bodyChars: countChars(splitContent(content).body),
        });
    }
    return cases;
}

/** 全库篇数（含断法专栏）：与加密包 total 口径一致 */
function libraryTotalOf(totalsByGroup: Record<string, number>): number {
    return Object.values(totalsByGroup).reduce((sum, count) => sum + count, 0);
}

async function loadPicks(): Promise<Record<string, string[]>> {
    if (!existsSync(picksPath)) return {};
    const parsed = JSON.parse(await readFile(picksPath, 'utf8')) as Record<string, string[]>;
    for (const [key, value] of Object.entries(parsed)) {
        if (!Array.isArray(value) || value.some((title) => typeof title !== 'string')) {
            throw new Error('scripts/case-preview-picks.json 的 ' + key + ' 需要字符串数组');
        }
    }
    return parsed;
}

function renderSource(previews: PreviewCase[], totalsByGroup: Record<string, number>, libraryTotal: number, perGroup: number, budget: number, ratio: number): string {
    const trimRule = ratio >= 1
        ? '正文按整篇提供'
        : '正文按段落截取到约 ' + budget + ' 字（不超过全文 ' + Math.round(ratio * 100) + '%）';
    const header = [
        '/**',
        ' * casePreviews.generated - 案例试读数据（自动生成，请勿手工编辑）',
        '',
        ' * 生成命令：npm run cases:previews（scripts/build-case-previews.ts）',
        '',
        ' * 说明：',
        ' * - 每个分类开放 ' + perGroup + ' 篇试读，' + trimRule + '，标题与元数据行保留原貌；',
        ' * - id 与加密包一致，激活后可用同一 id 无缝切换为完整正文；',
        ' * - 本文件是刻意公开的试读明文，完整正文仍只存在于加密包内，不要在应用层写入明文副本。',
        ' */',
        '',
        'export interface CasePreviewItem {',
        '    /** 与加密包一致的案例 id，激活后可用同 id 切换为完整正文 */',
        '    id: string;',
        '    title: string;',
        '    domain: \'bazi\' | \'qimen\';',
        '    authorKey: string;',
        '    authorName: string;',
        '    /** 分类：八字为日主/格局，奇门为占事主题 */',
        '    group: string;',
        '    summary: string;',
        '    excerpt: string;',
        '    /** 试读是否被截断；false 表示该篇正文短于试读预算 */',
        '    truncated: boolean;',
        '    excerptChars: number;',
        '    fullChars: number;',
        '}',
        '',
        '/** 全库篇数（含断法专栏），用于试读态提示解锁后的可读规模 */',
        'export const CASE_LIBRARY_TOTAL: number = ' + libraryTotal + ';',
        '',
        'export const CASE_PREVIEWS_PER_GROUP: number = ' + perGroup + ';',
        '',
        '/** 各分类在全库中的真实篇数，键为 `域/分类`（试读态下列表仍展示真实规模） */',
        'export const CASE_TOTALS_BY_GROUP: Record<string, number> = ' + JSON.stringify(totalsByGroup, null, 4) + ';',
        '',
        'export const CASE_PREVIEWS: CasePreviewItem[] = ' + JSON.stringify(previews, null, 4) + ';',
        '',
    ];
    return header.join('\n');
}

async function main(): Promise<void> {
    const budget = numberOption('--chars', DEFAULT_PREVIEW_CHARS);
    const perGroup = numberOption('--per-group', DEFAULT_PER_GROUP);
    const ratio = ratioOption('--ratio', MAX_EXCERPT_RATIO);
    const output = resolve(workspace, option('--out') ?? relative(workspace, defaultOut));
    const picks = await loadPicks();

    const cases = await collect();
    if (cases.length === 0) throw new Error('未扫描到任何案例文件，请检查 src/data/cases 目录');

    const totalsByGroup: Record<string, number> = {};
    const groups = new Map<string, RawCase[]>();
    for (const item of cases) {
        const key = item.domain + '/' + item.group;
        totalsByGroup[key] = (totalsByGroup[key] ?? 0) + 1;
        const bucket = groups.get(key);
        if (bucket) bucket.push(item);
        else groups.set(key, [item]);
    }

    const previews: PreviewCase[] = [];
    let previewedGroups = 0;
    for (const key of [...groups.keys()].sort((a, b) => a.localeCompare(b, 'zh-CN'))) {
        const candidates = (groups.get(key) ?? []).filter((item) => !excludedAuthors.has(item.authorKey));
        if (candidates.length === 0) continue;
        previewedGroups++;
        const picked = pickForGroup(candidates, perGroup, picks[key]);
        for (const item of picked) {
            const { excerpt, truncated, excerptChars, fullChars } = buildExcerpt(item.content, budget, ratio);
            previews.push({
                id: item.id,
                title: item.title,
                domain: item.domain,
                authorKey: item.authorKey,
                authorName: item.authorName,
                group: item.group,
                summary: item.summary,
                excerpt,
                truncated,
                excerptChars,
                fullChars,
            });
        }
    }

    const libraryTotal = libraryTotalOf(totalsByGroup);
    await mkdir(resolve(output, '..'), { recursive: true });
    await writeFile(output, renderSource(previews, totalsByGroup, libraryTotal, perGroup, budget, ratio));

    const shortGroups = [...groups.keys()].filter((key) => {
        const candidates = (groups.get(key) ?? []).filter((item) => !excludedAuthors.has(item.authorKey));
        return candidates.length > 0 && candidates.length < perGroup;
    });
    console.log('试读数据生成完成：' + relative(workspace, output));
    console.log('  试读分类 ' + previewedGroups + ' 个 · 试读 ' + previews.length + ' 篇 · 全库 ' + libraryTotal + ' 篇 · 试读预算 ' + budget + ' 字');
    if (shortGroups.length > 0) console.log('  ⚠ 篇数不足 ' + perGroup + ' 的分类：' + shortGroups.join('、'));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
