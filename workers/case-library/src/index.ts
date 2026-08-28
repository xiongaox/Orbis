interface Env {
    CASE_LIBRARY_DB: D1Database;
    CASE_LIBRARY_BUCKET: R2Bucket;
    ASSETS: Fetcher;
}

interface CaseRow {
    id: string;
    title: string;
    domain: 'bazi' | 'qimen';
    author_key: string;
    author_name: string;
    category: string;
    summary: string;
}

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;
const requestWindows = new Map<string, { count: number; resetAt: number }>();

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
    return Response.json(data, {
        status,
        headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, HEAD, OPTIONS', 'access-control-allow-headers': 'content-type, if-none-match', ...headers },
    });
}

function error(code: string, message: string, status: number): Response {
    return json({ error: { code, message } }, status);
}

function allowRequest(request: Request): boolean {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const now = Date.now();
    const current = requestWindows.get(ip);
    if (!current || current.resetAt <= now) {
        requestWindows.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return true;
    }
    if (current.count >= RATE_LIMIT) return false;
    current.count += 1;
    return true;
}

function limit(value: string | null, fallback: number, maximum: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, maximum)) : fallback;
}

function isValidId(id: string): boolean {
    return id.length > 0 && id.length <= 600 && !id.includes('..') && !id.includes('\\');
}

async function listCases(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const domain = url.searchParams.get('domain');
    const author = url.searchParams.get('author');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('q')?.trim() ?? '';
    const page = limit(url.searchParams.get('page'), 1, 10_000);
    const pageSize = limit(url.searchParams.get('pageSize'), 100, 250);

    if (domain && domain !== 'bazi' && domain !== 'qimen') {
        return error('invalid_query', 'domain 仅支持 bazi 或 qimen。', 400);
    }

    const clauses: string[] = [];
    const bindings: string[] = [];
    if (domain) { clauses.push('domain = ?'); bindings.push(domain); }
    if (author) { clauses.push('author_key = ?'); bindings.push(author); }
    if (category) { clauses.push('category = ?'); bindings.push(category); }
    if (search) { clauses.push('(title LIKE ? OR summary LIKE ?)'); bindings.push(`%${search}%`, `%${search}%`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;
    const [entries, count] = await env.CASE_LIBRARY_DB.batch([
        env.CASE_LIBRARY_DB.prepare(`SELECT id, title, domain, author_key, author_name, category, summary FROM case_entries ${where} ORDER BY domain, category, title COLLATE NOCASE LIMIT ? OFFSET ?`).bind(...bindings, pageSize, offset),
        env.CASE_LIBRARY_DB.prepare(`SELECT COUNT(*) AS total FROM case_entries ${where}`).bind(...bindings),
    ]);
    const total = Number((count.results[0] as { total?: number } | undefined)?.total ?? 0);
    return json({ entries: entries.results as CaseRow[], page, pageSize, total });
}

async function serveObject(key: string, request: Request, env: Env): Promise<Response> {
    const object = await env.CASE_LIBRARY_BUCKET.get(key, {
        onlyIf: { etagDoesNotMatch: request.headers.get('if-none-match')?.replaceAll('"', '') ?? '' },
    });
    if (!object) return error('not_found', '案例不存在。', 404);
    if (!object.body) return new Response(null, { status: 304, headers: { etag: object.httpEtag, 'access-control-allow-origin': '*' } });
    const headers = new Headers({ 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*' });
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    return new Response(object.body, { headers });
}

async function serveCaseContent(id: string, request: Request, env: Env): Promise<Response> {
    if (!isValidId(id)) return error('invalid_id', '案例标识不合法。', 400);
    const row = await env.CASE_LIBRARY_DB.prepare('SELECT object_key FROM case_entries WHERE id = ?').bind(id).first<{ object_key: string }>();
    return row ? serveObject(row.object_key, request, env) : error('not_found', '案例不存在。', 404);
}

async function serveAuthorProfile(authorKey: string, request: Request, env: Env): Promise<Response> {
    const row = await env.CASE_LIBRARY_DB.prepare('SELECT object_key FROM case_author_profiles WHERE author_key = ?').bind(authorKey).first<{ object_key: string }>();
    return row ? serveObject(row.object_key, request, env) : error('not_found', '作者介绍不存在。', 404);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        if (!url.pathname.startsWith('/api/public/cases')) return env.ASSETS.fetch(request);
        if (request.method === 'OPTIONS') return new Response(null, {
            status: 204,
            headers: {
                'access-control-allow-origin': '*',
                'access-control-allow-methods': 'GET, HEAD, OPTIONS',
                'access-control-allow-headers': 'content-type, if-none-match',
            },
        });
        if (request.method !== 'GET' && request.method !== 'HEAD') return error('method_not_allowed', '仅支持只读 GET/HEAD 请求。', 405);
        if (!allowRequest(request)) return error('rate_limited', '请求过于频繁，请稍后再试。', 429);

        try {
            if (url.pathname === '/api/public/cases') return listCases(request, env);
            const contentMatch = url.pathname.match(/^\/api\/public\/cases\/(.+)\/content$/);
            if (contentMatch) return serveCaseContent(decodeURIComponent(contentMatch[1]), request, env);
            const profileMatch = url.pathname.match(/^\/api\/public\/cases\/authors\/([^/]+)\/profile$/);
            if (profileMatch) return serveAuthorProfile(decodeURIComponent(profileMatch[1]), request, env);
            return error('not_found', '接口不存在。', 404);
        } catch (cause) {
            console.error('case-library request failed', cause);
            return error('internal_error', '案例库暂时不可用。', 500);
        }
    },
} satisfies ExportedHandler<Env>;
