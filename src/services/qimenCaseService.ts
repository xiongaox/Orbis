import { localPrivateStore } from './localPrivateStore';
import type { PaiPanMethod } from '../lib/csp-qimen/qimenService';

export const QIMEN_CATEGORIES = [
  { id: 'work', name: '工作事业' }, { id: 'study', name: '求学考试' },
  { id: 'love', name: '恋爱婚姻' }, { id: 'wealth', name: '生意财运' },
  { id: 'lost', name: '失物失人' }, { id: 'travel', name: '出行出国' },
  { id: 'health', name: '疾病身体' }, { id: 'other', name: '其他杂项' },
] as const;

export type QimenCategory = typeof QIMEN_CATEGORIES[number]['id'];

export interface QimenCase {
  id: string;
  title: string;
  test_date: string;
  category: QimenCategory;
  description?: string;
  feedback?: string;
  analysis?: string;
  qimen_data?: Record<string, unknown>;
  /** 保存案例时使用的排盘方式（旧数据可能缺失） */
  pai_pan_method?: PaiPanMethod;
  created_at: string;
  updated_at: string;
}

export type CreateQimenCaseInput = Omit<QimenCase, 'id' | 'created_at' | 'updated_at'>;
export type UpdateQimenCaseInput = Partial<CreateQimenCaseInput>;

const toCase = (payload: Record<string, unknown>) => payload as unknown as QimenCase;

export const qimenCaseService = {
  async getCases(): Promise<QimenCase[]> {
    const records = await localPrivateStore.list('qimen_case');
    // store 默认按 updated_at 排序；列表契约是「最新创建在前」
    return records
      .map((record) => toCase(record.payload))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  },

  async createCase(input: CreateQimenCaseInput): Promise<QimenCase> {
    const timestamp = new Date().toISOString();
    const record = await localPrivateStore.put('qimen_case', {
      ...input, created_at: timestamp, updated_at: timestamp,
    });
    return toCase(record.payload);
  },

  async createCases(inputs: CreateQimenCaseInput[]): Promise<number> {
    for (const input of inputs) await this.createCase(input);
    return inputs.length;
  },

  async updateCase(id: string, input: UpdateQimenCaseInput): Promise<QimenCase> {
    const current = await localPrivateStore.get('qimen_case', id);
    if (!current) throw new Error('未找到要更新的奇门案例');
    const record = await localPrivateStore.put('qimen_case', {
      ...current.payload, ...input, id,
      created_at: current.payload.created_at, updated_at: new Date().toISOString(),
    }, id);
    return toCase(record.payload);
  },

  async deleteCase(id: string): Promise<void> {
    await localPrivateStore.remove('qimen_case', id);
  },
};
