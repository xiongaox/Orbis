import { beforeEach, describe, expect, it, vi } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';

const mocks = vi.hoisted(() => ({
  localPrivateStore: {
    snapshot: vi.fn(),
    restore: vi.fn(),
  },
  aiChatHistoryService: {
    getAllSessions: vi.fn(),
    importSessions: vi.fn(),
  },
}));

vi.mock('./localPrivateStore', () => mocks);
vi.mock('./aiChatHistoryService', () => mocks);

import {
  packBackupZip,
  unpackAndRestoreBackup,
  isZipArchive,
} from './backupPackageService';

describe('backupPackageService 多模块 ZIP 备份与恢复', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('打包为模块化 ZIP，分离账户配置、各术数案例与对话历史', async () => {
    mocks.localPrivateStore.snapshot.mockResolvedValue({
      schemaVersion: 2,
      exportedAt: '2026-09-15T00:00:00.000Z',
      records: [
        { id: 'prof-1', type: 'profile', payload: { name: '命主A' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: 'bazi-1', type: 'bazi_case', payload: { title: '八字案例1' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: 'qimen-1', type: 'qimen_case', payload: { title: '奇门案例1' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: 'sanyuan-1', type: 'sanyuan_case', payload: { title: '三元案例1' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: 'cfg-1', type: 'webdav_config', payload: { endpoint: 'secret' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      ],
    });

    mocks.aiChatHistoryService.getAllSessions.mockReturnValue([
      { id: 's-bazi-1', divinationType: 'bazi', caseName: '八字1', messages: [{ id: 'm1', role: 'user', content: '问事业', timestamp: 1 }] },
      { id: 's-qimen-1', divinationType: 'qimen', caseName: '奇门1', messages: [{ id: 'm2', role: 'user', content: '测出行', timestamp: 2 }] },
    ]);

    const result = await packBackupZip({ includeChatHistory: true });
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(isZipArchive(result.data)).toBe(true);

    const unzipped = unzipSync(result.data);
    const filenames = Object.keys(unzipped);

    expect(filenames).toContain('manifest.json');
    expect(filenames).toContain('account_settings.json');
    expect(filenames).toContain('bazi_cases.json');
    expect(filenames).toContain('qimen_cases.json');
    expect(filenames).toContain('sanyuan_cases.json');
    expect(filenames).toContain('bazi_chat_history.json');
    expect(filenames).toContain('qimen_chat_history.json');

    // 验证账户配置排除了 webdav_config 密钥
    const accountRecords = JSON.parse(strFromU8(unzipped['account_settings.json']));
    expect(accountRecords).toHaveLength(1);
    expect(accountRecords[0].type).toBe('profile');

    // 验证八字案例独立性
    const baziCases = JSON.parse(strFromU8(unzipped['bazi_cases.json']));
    expect(baziCases).toHaveLength(1);
    expect(baziCases[0].id).toBe('bazi-1');

    // 验证八字对话历史独立性
    const baziChats = JSON.parse(strFromU8(unzipped['bazi_chat_history.json']));
    expect(baziChats).toHaveLength(1);
    expect(baziChats[0].id).toBe('s-bazi-1');

    // 验证奇门对话历史独立性
    const qimenChats = JSON.parse(strFromU8(unzipped['qimen_chat_history.json']));
    expect(qimenChats).toHaveLength(1);
    expect(qimenChats[0].id).toBe('s-qimen-1');
  });

  it('当选择不备份对话历史时，ZIP 包中不生成任何 chat_history 文件', async () => {
    mocks.localPrivateStore.snapshot.mockResolvedValue({
      schemaVersion: 2,
      exportedAt: '2026-09-15T00:00:00.000Z',
      records: [
        { id: 'bazi-1', type: 'bazi_case', payload: { title: '案例' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      ],
    });

    mocks.aiChatHistoryService.getAllSessions.mockReturnValue([
      { id: 's-1', divinationType: 'bazi', caseName: '私密研判', messages: [] },
    ]);

    const result = await packBackupZip({ includeChatHistory: false });
    const unzipped = unzipSync(result.data);
    const filenames = Object.keys(unzipped);

    expect(filenames).toContain('manifest.json');
    expect(filenames).toContain('bazi_cases.json');
    expect(filenames.some((f) => f.includes('chat_history'))).toBe(false);
  });

  it('解包 ZIP 并将数据完整分流恢复至 localPrivateStore 与 aiChatHistoryService', async () => {
    mocks.localPrivateStore.snapshot.mockResolvedValue({
      schemaVersion: 2,
      exportedAt: '2026-09-15T00:00:00.000Z',
      records: [
        { id: 'bazi-1', type: 'bazi_case', payload: { title: '八字案例' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: 'prof-1', type: 'profile', payload: { name: '命主' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      ],
    });
    mocks.aiChatHistoryService.getAllSessions.mockReturnValue([
      { id: 's-1', divinationType: 'bazi', caseName: '八字1', messages: [] },
    ]);

    const packResult = await packBackupZip({ includeChatHistory: true });
    const restoreSummary = await unpackAndRestoreBackup(packResult.data, 'orbis_20260915_120000_000.zip');

    expect(restoreSummary.format).toBe('zip');
    expect(restoreSummary.restoredRecordsCount).toBe(2);
    expect(restoreSummary.restoredSessionsCount).toBe(1);
    expect(restoreSummary.restoredCaseTypes).toContain('bazi');

    expect(mocks.localPrivateStore.restore).toHaveBeenCalledTimes(1);
    expect(mocks.aiChatHistoryService.importSessions).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 's-1' })]),
      'merge',
    );
  });

  it('平滑向下兼容：遇到旧版单一 JSON 备份时，无缝恢复 records', async () => {
    const legacySnapshot = {
      schemaVersion: 2,
      exportedAt: '2026-08-01T00:00:00.000Z',
      records: [
        { id: 'old-bazi-1', type: 'bazi_case', payload: { title: '旧案例' }, createdAt: '2026-08-01', updatedAt: '2026-08-01' },
      ],
    };
    const jsonString = JSON.stringify(legacySnapshot);

    const restoreSummary = await unpackAndRestoreBackup(jsonString, 'orbis_20260801_100000_000.json');

    expect(restoreSummary.format).toBe('legacy_json');
    expect(restoreSummary.restoredRecordsCount).toBe(1);
    expect(restoreSummary.restoredSessionsCount).toBe(0);
    expect(restoreSummary.restoredCaseTypes).toContain('bazi');

    expect(mocks.localPrivateStore.restore).toHaveBeenCalledWith(expect.objectContaining({
      records: expect.arrayContaining([expect.objectContaining({ id: 'old-bazi-1' })]),
    }));
    expect(mocks.aiChatHistoryService.importSessions).not.toHaveBeenCalled();
  });
});
