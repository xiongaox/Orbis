import { localPrivateStore } from './localPrivateStore';

export const CASE_TAGS = [
  '家人', '恋人', '自己', '朋友', '父母', '孩子', '亲友', '同事', '领导',
  '老师', '学生', '案例', '名人', '其他',
] as const;

export type CaseTag = typeof CASE_TAGS[number];

export interface BaziCase {
  id: string;
  name: string;
  gender: 'male' | 'female';
  birth_date: string;
  tags: CaseTag[];
  notes?: string;
  bazi_data?: Record<string, unknown>;
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
