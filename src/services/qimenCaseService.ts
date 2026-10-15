import { localPrivateStore } from './localPrivateStore';
import { readSetting, writeSetting } from './appSettingStore';
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
  /**
   * 案例正文的完整顺序流（提问/回答/断法，含断法归属）。
   * 上面三个字段是它的文本投影，供列表卡片/导出/备份使用；
   * 界面读写以本字段为准，否则断法挂在哪条回答下会丢。
   */
  dialog_lines?: { kind: 'q' | 'a' | 'r'; text: string; answerId?: string }[];
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

  /** 清空本模块全部案例（案例库弹窗的「清除数据」入口，仅影响奇门，不动其他术数与备份配置） */
  async clearCases(): Promise<void> {
    await localPrivateStore.clear('qimen_case');
  },
};

/**
 * 一次性迁移：把存量奇门案例的标题补进正文首句（description 首段）。
 * 背景：此前新建案例只存标题，正文要进详情一个个手填；
 * 新逻辑（见 QimenNewCaseModal）已让新建案例自带标题为首句。
 * 跳过已有正文的案例（description 非空，或已有 dialog_lines 记录流），
 * 迁移标志存 app_setting，幂等：失败不置位，下次启动重试。
 * 返回实际补写的案例数。
 */
export async function migrateQimenTitlesIntoDescription(): Promise<number> {
  if (readSetting<boolean>('qimen_title_desc_migrated', false)) return 0;
  const cases = await qimenCaseService.getCases();
  let migrated = 0;
  for (const c of cases) {
    // 已有填充数据（正文或记录流）的案例不动
    if ((c.description ?? '').trim() || (c.dialog_lines ?? []).length > 0) continue;
    const title = c.title.trim();
    if (!title) continue;
    await qimenCaseService.updateCase(c.id, { description: title });
    migrated += 1;
  }
  writeSetting('qimen_title_desc_migrated', true);
  return migrated;
}

/**
 * 一次性迁移：回正 CSV 迁移批次被整体减 8 小时的 test_date。
 *
 * 背景：这批案例由 Supabase 导出的 CSV 迁入。CSV 里的 test_date 是带 "+00" 的真实 UTC
 * （同一行的 created_at 由 PostgreSQL 生成，两者只差几十秒，可证），迁移时却被当成
 * 「北京墙钟」再转了一次 UTC，于是全部早了 8 小时——例如「爷爷什么时候去世？」存成
 * 2026-07-09T19:58Z（北京 03:58），实际是 2026-07-10T03:58Z（北京 11:58）。
 *
 * 以旧值为键精确匹配（这些毫秒级时间戳不会与正常新建的案例撞车），只覆盖这 18 条；
 * 改完后旧值不复存在，重复执行不会再命中，天然幂等，无需另设标志位。
 * 返回实际回正的案例数。
 */
const LEGACY_UTC_SHIFTED_TEST_DATES: Record<string, string> = {
  '2026-03-30T01:20:00.000Z': '2026-03-30T09:20:58.488Z', // 母问子学业
  '2026-08-24T06:03:00.000Z': '2026-08-24T14:03:24.839Z', // 妈的健康问题
  '2026-07-13T01:15:00.000Z': '2026-07-13T09:15:50.766Z', // 晚公能不能走过这关
  '2026-08-13T03:43:00.000Z': '2026-08-13T11:43:00.000Z', // 燕姑蓉
  '2026-04-25T19:53:00.000Z': '2026-04-26T03:53:29.390Z', // 姐今年还能怀孕么
  '2026-07-09T19:58:00.000Z': '2026-07-10T03:58:00.000Z', // 爷爷什么时候去世？
  '2026-08-17T16:57:00.000Z': '2026-08-18T00:57:32.432Z', // 明年能不能做公司的一套模具？
  '2026-07-23T05:29:00.000Z': '2026-07-23T13:29:27.094Z', // 奶奶健康问题
  '2026-02-20T18:16:00.000Z': '2026-02-21T02:16:43.560Z', // 去到那边能学到这么技术么？
  '2026-08-19T22:17:00.000Z': '2026-08-20T06:17:03.319Z', // 这个月能不能回本？
  '2025-01-26T20:57:00.000Z': '2025-01-27T04:57:00.000Z', // 妹妹能留任茂名么？
  '2026-07-06T23:15:00.000Z': '2026-07-07T07:15:57.059Z', // 我这个月适合投资么？
  '2026-01-25T18:23:00.000Z': '2026-01-26T02:23:00.000Z', // 年会抽奖事宜
  '2026-08-13T05:25:00.000Z': '2026-08-13T13:25:00.000Z', // 燕姑瑶
  '2026-01-25T20:10:00.000Z': '2026-01-26T04:10:00.000Z', // 测算能不能学有所成
  '2026-03-31T00:26:00.000Z': '2026-03-31T08:26:33.037Z', // 三个月后，我能掌握所有流程么？
  '2025-09-24T00:50:00.000Z': '2025-09-24T08:50:00.000Z', // 杨矜持问事业
  '2026-02-28T03:49:00.000Z': '2026-02-28T11:49:05.551Z', // 鼎哥哥的电宝在哪里？
};

export async function migrateQimenTimezoneShift(): Promise<number> {
  const cases = await qimenCaseService.getCases();
  let fixed = 0;
  for (const c of cases) {
    const corrected = LEGACY_UTC_SHIFTED_TEST_DATES[c.test_date];
    if (!corrected) continue;
    await qimenCaseService.updateCase(c.id, { test_date: corrected });
    fixed += 1;
  }
  return fixed;
}
