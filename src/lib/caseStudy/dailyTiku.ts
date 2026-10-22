import { TIKU_BANKS, type TikuBank, type TikuEdition, type TikuVolume } from './tikuData';

/** 每日一题选中的命例卷及其所属题库/届次 */
export interface DailyTikuPick {
    bank: TikuBank;
    edition: TikuEdition;
    volume: TikuVolume;
}

/** 本地日期键 YYYY-MM-DD（按用户时区，跨零点自动换题） */
export function todayKey(now: Date = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** 由日期键取稳定哈希：同一天恒定，换天才换题 */
function hashKey(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

/** 全部命例卷（跨题库汇总），每日一题的候选池 */
export function allTikuVolumes(): DailyTikuPick[] {
    const picks: DailyTikuPick[] = [];
    for (const bank of TIKU_BANKS) {
        for (const edition of bank.editions) {
            for (const volume of edition.volumes) {
                picks.push({ bank, edition, volume });
            }
        }
    }
    return picks;
}

/**
 * 今日命例卷：以日期为种子在所有题库的所有命例卷里取一个。
 * 不写存储——同一天任何时候进来都是同一题，明天自然换成另一题。
 * offset 用于「换一题」：沿候选池顺延若干位，0 即当日默认题。
 */
export function pickDailyTiku(dateKey: string = todayKey(), offset = 0): DailyTikuPick | null {
    const pool = allTikuVolumes();
    if (pool.length === 0) return null;
    const index = (hashKey(dateKey) + offset) % pool.length;
    return pool[index];
}
