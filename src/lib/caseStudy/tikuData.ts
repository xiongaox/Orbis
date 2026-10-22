import { parseTikuBank, type TikuBank, type TikuEdition, type TikuVolume } from './tikuParser';

// 题库语料：一届一个 Markdown，目录本身即一个题库
const rawTikuFiles = import.meta.glob('../../data/cases/tiku/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

/** 全部题库；后续新增赛事时在这里追加一个目录即可 */
export const TIKU_BANKS: TikuBank[] = [
    parseTikuBank('dasai', '全球算命师大赛', rawTikuFiles),
];

export type { TikuBank, TikuEdition, TikuVolume };
export type { TikuQuestion } from './tikuParser';

export function findBank(bankId: string): TikuBank | null {
    return TIKU_BANKS.find((b) => b.id === bankId) ?? null;
}

export function findEdition(bankId: string, editionId: string): TikuEdition | null {
    return findBank(bankId)?.editions.find((e) => e.id === editionId) ?? null;
}

/** 届次列表项（侧栏用） */
export function editionItems(bankId: string): Array<{ id: string; label: string }> {
    const bank = findBank(bankId);
    if (!bank) return [];
    return bank.editions.map((e) => ({
        id: e.id,
        label: `${e.name} ${e.year} · ${e.volumes.length} 例`,
    }));
}

/** 题库下的题目总数 */
export function bankQuestionCount(bank: TikuBank): number {
    return bank.editions.reduce(
        (sum, e) => sum + e.volumes.reduce((s, v) => s + v.questions.length, 0),
        0,
    );
}
