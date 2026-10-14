import { localPrivateStore } from './localPrivateStore';

export const CASE_TAGS = [
  '家人', '恋人', '自己', '朋友', '父母', '孩子', '亲友', '同事', '领导',
  '老师', '学生', '案例', '名人', '其他',
] as const;

export type CaseTag = typeof CASE_TAGS[number];

/**
 * 生平时间记录：一条大运或一个流年上发生的事。
 * 用「年份」而非大运 index 锚定：出生日期改动会重算大运导致 index 错位，
 * 年份能按新区间重新归位（归不上的在时间轴末尾单列，不静默丢数据）。
 */
export interface LifeEvent {
  kind: 'dayun' | 'liunian';
  /** 大运取起始年、流年取该年，统一转字符串 */
  ref: string;
  /** 冗余存干支：案例重排盘后仍能显示记录当时的干支 */
  ganZhi: string;
  text: string;
}

export interface BaziCase {
  id: string;
  name: string;
  gender: 'male' | 'female';
  birth_date: string;
  tags: CaseTag[];
  notes?: string;
  bazi_data?: Record<string, unknown>;
  /** 生平时间轴记录（大运/流年事件） */
  life_events?: LifeEvent[];
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export type CreateCaseInput = Omit<BaziCase, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCaseInput = Partial<CreateCaseInput>;

const toCase = (payload: Record<string, unknown>) => payload as unknown as BaziCase;

async function listCases() {
  const records = await localPrivateStore.list('bazi_case');
  // store 默认按 sort_order/updated_at 排序；拖拽手动排序已移除，
  // 列表契约统一为「最新新建在前」（与奇门一致）
  return records
    .map((record) => toCase(record.payload))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}

export const baziCaseService = {
  async getCases(): Promise<BaziCase[]> {
    return listCases();
  },

  async getCaseById(id: string): Promise<BaziCase | null> {
    const record = await localPrivateStore.get('bazi_case', id);
    return record ? toCase(record.payload) : null;
  },

  async createCase(input: CreateCaseInput): Promise<BaziCase> {
    const timestamp = new Date().toISOString();
    const record = await localPrivateStore.put('bazi_case', {
      ...input, created_at: timestamp, updated_at: timestamp,
    });
    return toCase(record.payload);
  },

  async createCases(inputs: CreateCaseInput[]): Promise<BaziCase[]> {
    const results: BaziCase[] = [];
    for (const input of inputs) results.push(await this.createCase(input));
    return results;
  },

  async updateCase(id: string, input: UpdateCaseInput): Promise<BaziCase> {
    const current = await localPrivateStore.get('bazi_case', id);
    if (!current) throw new Error('未找到要更新的八字案例');
    const updated = await localPrivateStore.put('bazi_case', {
      ...current.payload, ...input, id,
      created_at: current.payload.created_at, updated_at: new Date().toISOString(),
    }, id);
    return toCase(updated.payload);
  },

  async deleteCase(id: string): Promise<void> {
    await localPrivateStore.remove('bazi_case', id);
  },

  /** 清空本模块全部案例（案例库弹窗的「清除数据」入口，仅影响八字，不动其他术数与备份配置） */
  async clearCases(): Promise<void> {
    await localPrivateStore.clear('bazi_case');
  },

  async getCasesByTags(tags: CaseTag[]): Promise<BaziCase[]> {
    const cases = await listCases();
    return cases.filter((item) => tags.some((tag) => item.tags?.includes(tag)));
  },

  async searchCases(query: string): Promise<BaziCase[]> {
    const normalized = query.trim().toLocaleLowerCase();
    const cases = await listCases();
    return normalized ? cases.filter((item) => item.name.toLocaleLowerCase().includes(normalized)) : cases;
  },
};
