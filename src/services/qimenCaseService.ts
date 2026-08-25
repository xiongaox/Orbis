import { getPrivateUserId, localPrivateStore } from './localPrivateStore';

export const QIMEN_CATEGORIES = [
  { id: 'work', name: '工作事业' }, { id: 'study', name: '求学考试' },
  { id: 'love', name: '恋爱婚姻' }, { id: 'wealth', name: '生意财运' },
  { id: 'lost', name: '失物失人' }, { id: 'travel', name: '出行出国' },
  { id: 'health', name: '疾病身体' }, { id: 'other', name: '其他杂项' },
] as const;

export type QimenCategory = typeof QIMEN_CATEGORIES[number]['id'];

export interface QimenCase {
  id: string;
  user_id: string;
  title: string;
  test_date: string;
  category: QimenCategory;
  description?: string;
  feedback?: string;
  analysis?: string;
  qimen_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type CreateQimenCaseInput = Omit<QimenCase, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateQimenCaseInput = Partial<CreateQimenCaseInput>;

const toCase = (payload: Record<string, unknown>) => payload as unknown as QimenCase;

export const qimenCaseService = {
  async getCases(): Promise<QimenCase[]> {
    const records = await localPrivateStore.list(await getPrivateUserId(), 'qimen_case');
    return records.map((record) => toCase(record.payload));
  },

  async createCase(input: CreateQimenCaseInput): Promise<QimenCase> {
    const userId = await getPrivateUserId();
    const timestamp = new Date().toISOString();
    const record = await localPrivateStore.put(userId, 'qimen_case', {
      ...input, user_id: userId, created_at: timestamp, updated_at: timestamp,
    });
    return toCase(record.payload);
  },

  async createCases(inputs: CreateQimenCaseInput[]): Promise<number> {
    for (const input of inputs) await this.createCase(input);
    return inputs.length;
  },

  async updateCase(id: string, input: UpdateQimenCaseInput): Promise<QimenCase> {
    const userId = await getPrivateUserId();
    const current = await localPrivateStore.get(userId, 'qimen_case', id);
    if (!current) throw new Error('未找到要更新的奇门案例');
    const record = await localPrivateStore.put(userId, 'qimen_case', {
      ...current.payload, ...input, id, user_id: userId,
      created_at: current.payload.created_at, updated_at: new Date().toISOString(),
    }, id);
    return toCase(record.payload);
  },

  async deleteCase(id: string): Promise<void> {
    await localPrivateStore.remove(await getPrivateUserId(), 'qimen_case', id);
  },
};
