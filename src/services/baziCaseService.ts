import { getPrivateUserId, localPrivateStore } from './localPrivateStore';

export const CASE_TAGS = [
  '家人', '恋人', '自己', '朋友', '父母', '孩子', '亲友', '同事', '领导',
  '老师', '学生', '案例', '名人', '其他',
] as const;

export type CaseTag = typeof CASE_TAGS[number];

export interface BaziCase {
  id: string;
  user_id: string;
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

export type CreateCaseInput = Omit<BaziCase, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateCaseInput = Partial<CreateCaseInput>;

const toCase = (payload: Record<string, unknown>) => payload as unknown as BaziCase;

async function listCases() {
  const userId = await getPrivateUserId();
  const records = await localPrivateStore.list(userId, 'bazi_case');
  return records.map((record) => toCase(record.payload));
}

export const baziCaseService = {
  async getCases(): Promise<BaziCase[]> {
    return listCases();
  },

  async getCaseById(id: string): Promise<BaziCase | null> {
    const userId = await getPrivateUserId();
    const record = await localPrivateStore.get(userId, 'bazi_case', id);
    return record ? toCase(record.payload) : null;
  },

  async createCase(input: CreateCaseInput): Promise<BaziCase> {
    const userId = await getPrivateUserId();
    const timestamp = new Date().toISOString();
    const record = await localPrivateStore.put(userId, 'bazi_case', {
      ...input, user_id: userId, created_at: timestamp, updated_at: timestamp,
    });
    return toCase(record.payload);
  },

  async createCases(inputs: CreateCaseInput[]): Promise<BaziCase[]> {
    const results: BaziCase[] = [];
    for (const input of inputs) results.push(await this.createCase(input));
    return results;
  },

  async updateCase(id: string, input: UpdateCaseInput): Promise<BaziCase> {
    const userId = await getPrivateUserId();
    const current = await localPrivateStore.get(userId, 'bazi_case', id);
    if (!current) throw new Error('未找到要更新的八字案例');
    const updated = await localPrivateStore.put(userId, 'bazi_case', {
      ...current.payload, ...input, id, user_id: userId,
      created_at: current.payload.created_at, updated_at: new Date().toISOString(),
    }, id, typeof input.sort_order === 'number' ? input.sort_order : current.sortOrder);
    return toCase(updated.payload);
  },

  async deleteCase(id: string): Promise<void> {
    await localPrivateStore.remove(await getPrivateUserId(), 'bazi_case', id);
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

  async updateSortOrder(orderedIds: string[]): Promise<void> {
    const userId = await getPrivateUserId();
    for (const [index, id] of orderedIds.entries()) {
      const current = await localPrivateStore.get(userId, 'bazi_case', id);
      if (current) await localPrivateStore.put(userId, 'bazi_case', { ...current.payload, sort_order: index + 1 }, id, index + 1);
    }
  },
};
