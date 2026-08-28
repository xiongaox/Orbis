export interface PublicCaseEntry {
    id: string;
    title: string;
    domain: 'bazi' | 'qimen';
    author_key: string;
    author_name: string;
    category: string;
    summary: string;
}

interface DirectoryResponse {
    entries: PublicCaseEntry[];
    total: number;
}

const configuredBaseUrl = import.meta.env.VITE_PUBLIC_CASE_LIBRARY_URL?.replace(/\/$/, '');
const caseLibraryBaseUrl = configuredBaseUrl || 'https://orbis.xiongaox.workers.dev/api/public/cases';

async function request(path: string): Promise<Response> {
    const response = await fetch(caseLibraryBaseUrl + path);
    if (!response.ok) throw new Error('公共案例库请求失败（' + response.status + '）');
    return response;
}

export const publicCaseLibraryService = {
    async getEntries(): Promise<PublicCaseEntry[]> {
        const response = await request('?page=1&pageSize=250');
        const first = await response.json() as DirectoryResponse;
        if (first.entries.length >= first.total) return first.entries;
        const pages = Array.from({ length: Math.ceil(first.total / 250) - 1 }, (_, index) => index + 2);
        const rest = await Promise.all(pages.map(async (page) => (await (await request('?page=' + page + '&pageSize=250')).json() as DirectoryResponse).entries));
        return first.entries.concat(rest.flat());
    },
    async getContent(id: string): Promise<string> {
        return (await request('/' + encodeURIComponent(id) + '/content')).text();
    },
    async getAuthorProfile(authorKey: string): Promise<string> {
        return (await request('/authors/' + encodeURIComponent(authorKey) + '/profile')).text();
    },
};
