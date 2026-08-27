import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPrivateUserId: vi.fn(),
  localPrivateStore: {
    get: vi.fn(),
    put: vi.fn(),
    snapshot: vi.fn(),
    restore: vi.fn(),
  },
}));

vi.mock('./localPrivateStore', () => mocks);
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }));

import { webDavBackupService } from './webdavBackupService';

const response = (status: number, body = '') => ({
  ok: status >= 200 && status < 300,
  status,
  text: vi.fn().mockResolvedValue(body),
});

const config = {
  endpoint: 'https://dav.example.com/dav/',
  username: 'user',
  password: 'secret',
  backupDirectory: 'orbis/backups',
  autoBackupEnabled: false,
  autoBackupIntervalMinutes: 1440,
};

describe('WebDAV 备份服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrivateUserId.mockResolvedValue('user-a');
    mocks.localPrivateStore.snapshot.mockResolvedValue({ schemaVersion: 1, exportedAt: '2026-08-26T00:00:00.000Z', records: [] });
    vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() });
  });

  it('按当前用户隔离保存配置，并迁移旧的固定文件路径', async () => {
    mocks.localPrivateStore.get.mockResolvedValue({
      payload: { endpoint: config.endpoint, username: config.username, password: config.password, filePath: 'orbis/private-data.json', autoBackupIntervalHours: 2 },
    });

    await expect(webDavBackupService.readConfig()).resolves.toMatchObject({
      endpoint: config.endpoint, username: config.username, password: config.password, backupDirectory: 'orbis', autoBackupEnabled: false, autoBackupIntervalMinutes: 120,
    });

    await webDavBackupService.saveConfig(config);

    expect(mocks.localPrivateStore.get).toHaveBeenCalledWith('user-a', 'webdav_config', 'user-a:webdav_config');
    expect(mocks.localPrivateStore.put).toHaveBeenCalledWith('user-a', 'webdav_config', config, 'user-a:webdav_config');
  });

  it('上传前创建父目录，并生成带日期时间的独立文件', async () => {
    vi.setSystemTime(new Date('2026-08-26T13:20:30.000Z'));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(405))
      .mockResolvedValueOnce(response(201))
      .mockResolvedValueOnce(response(204));
    vi.stubGlobal('fetch', fetchMock);

    const result = await webDavBackupService.backup(config);

    expect(result.backup).toEqual({
      path: 'orbis/backups/private-data_2026-08-26T13_20_30_000.json',
      filename: 'private-data_2026-08-26T13_20_30_000.json',
      createdAt: '2026-08-26T13:20:30.000Z',
      size: null,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://dav.example.com/dav/orbis', expect.objectContaining({ method: 'MKCOL' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://dav.example.com/dav/orbis/backups', expect.objectContaining({ method: 'MKCOL' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://dav.example.com/dav/orbis/backups/private-data_2026-08-26T13_20_30_000.json', expect.objectContaining({ method: 'PUT' }));
  });

  it('列出并按时间倒序返回可恢复的备份版本', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(207, `
      <d:multistatus xmlns:d="DAV:">
        <d:response><d:href>/dav/orbis/backups/</d:href></d:response>
        <d:response><d:href>/dav/orbis/backups/private-data_2026-08-25T11_00_00_000.json</d:href><d:getcontentlength>1024</d:getcontentlength></d:response>
        <d:response><d:href>/dav/orbis/backups/private-data_2026-08-26T13_20_30_000.json</d:href><d:getcontentlength>2048</d:getcontentlength></d:response>
        <d:response><d:href>/dav/orbis/backups/unrelated.json</d:href></d:response>
      </d:multistatus>
    `)));

    await expect(webDavBackupService.listBackups(config)).resolves.toEqual([
      { path: 'orbis/backups/private-data_2026-08-26T13_20_30_000.json', filename: 'private-data_2026-08-26T13_20_30_000.json', createdAt: '2026-08-26T13:20:30.000', size: 2048 },
      { path: 'orbis/backups/private-data_2026-08-25T11_00_00_000.json', filename: 'private-data_2026-08-25T11_00_00_000.json', createdAt: '2026-08-25T11:00:00.000', size: 1024 },
    ]);
  });

  it('仅允许恢复当前备份目录内的已命名版本', async () => {
    await expect(webDavBackupService.restore(config, 'orbis/private-data.json')).rejects.toThrow('请选择当前备份目录中的有效备份版本');
  });

  it('删除当前备份目录中的指定版本', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(204));
    vi.stubGlobal('fetch', fetchMock);

    await webDavBackupService.deleteBackup(config, 'orbis/backups/private-data_2026-08-26T13_20_30_000.json');

    expect(fetchMock).toHaveBeenCalledWith('https://dav.example.com/dav/orbis/backups/private-data_2026-08-26T13_20_30_000.json', expect.objectContaining({ method: 'DELETE' }));
  });
});
