import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  localPrivateStore: {
    get: vi.fn(),
    put: vi.fn(),
    snapshot: vi.fn(),
    restore: vi.fn(),
  },
}));

vi.mock('./localPrivateStore', () => mocks);
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }));

import { s3BackupService } from './s3BackupService';
import { EMPTY_PAYLOAD_SHA256, signSigV4 } from './s3SigV4';

const response = (status: number, body = '') => ({
  ok: status >= 200 && status < 300,
  status,
  text: vi.fn().mockResolvedValue(body),
});

const config = {
  endpoint: 'https://s3.us-east-1.amazonaws.com',
  region: 'us-east-1',
  bucket: 'examplebucket',
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'secretKey',
  sessionToken: '',
  backupPrefix: 'orbis/backups',
  pathStyle: false,
  autoBackupEnabled: false,
  autoBackupIntervalMinutes: 1440,
  includeChatHistory: true,
};

describe('S3 签名工具', () => {
  it('与 AWS 官方 GET Object 示例向量一致', async () => {
    const result = await signSigV4({
      method: 'GET',
      canonicalUri: '/test.txt',
      canonicalQuery: '',
      headers: {
        host: 'examplebucket.s3.amazonaws.com',
        range: 'bytes=0-9',
        'x-amz-content-sha256': EMPTY_PAYLOAD_SHA256,
        'x-amz-date': '20130524T000000Z',
      },
      payloadHash: EMPTY_PAYLOAD_SHA256,
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      region: 'us-east-1',
      amzDate: '20130524T000000Z',
    });

    expect(result.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request,'
      + 'SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,'
      + 'Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
    );
  });
});

describe('S3 备份服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.localPrivateStore.snapshot.mockResolvedValue({ schemaVersion: 1, exportedAt: '2026-08-26T00:00:00.000Z', records: [] });
    vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() });
  });

  it('保存配置到 s3_config 记录', async () => {
    mocks.localPrivateStore.get.mockResolvedValue(null);

    await expect(s3BackupService.readConfig()).resolves.toMatchObject({ backupPrefix: 'orbis/backups', region: 'us-east-1', autoBackupIntervalMinutes: 1440, includeChatHistory: true });

    await s3BackupService.saveConfig(config);

    expect(mocks.localPrivateStore.put).toHaveBeenCalledWith('s3_config', config, 's3_config');
  });

  it('上传备份对象并携带 SigV4 授权头', async () => {
    vi.setSystemTime(new Date('2026-08-26T13:20:30.000Z'));
    const fetchMock = vi.fn().mockResolvedValue(response(200));
    vi.stubGlobal('fetch', fetchMock);

    const result = await s3BackupService.backup(config);

    expect(result.backup).toEqual({
      path: 'orbis/backups/orbis_20260826_132030_000.zip',
      filename: 'orbis_20260826_132030_000.zip',
      createdAt: '2026-08-26T13:20:30.000Z',
      size: null,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://examplebucket.s3.us-east-1.amazonaws.com/orbis/backups/orbis_20260826_132030_000.zip',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'x-amz-date': '20260826T132030Z',
          'x-amz-content-sha256': expect.stringMatching(/^[0-9a-f]{64}$/),
          Authorization: expect.stringMatching(/^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/20260826\/us-east-1\/s3\/aws4_request,SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date,Signature=[0-9a-f]{64}$/),
        }),
      }),
    );
  });

  it('列出并按时间倒序返回备份前缀下的版本，兼容新旧命名', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, `
      <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
        <Contents><Key>orbis/backups/private-data_2026-08-25T11_00_00_000.json</Key><LastModified>2026-08-25T11:00:00.000Z</LastModified><Size>1024</Size></Contents>
        <Contents><Key>orbis/backups/orbis_20260826_132030_000.json</Key><LastModified>2026-08-26T13:20:30.000Z</LastModified><Size>2048</Size></Contents>
        <Contents><Key>orbis/backups/nested/orbis_20260826_140000_000.json</Key><LastModified>2026-08-26T14:00:00.000Z</LastModified><Size>512</Size></Contents>
        <Contents><Key>other/orbis_20260826_150000_000.json</Key><LastModified>2026-08-26T15:00:00.000Z</LastModified><Size>256</Size></Contents>
      </ListBucketResult>
    `)));

    await expect(s3BackupService.listBackups(config)).resolves.toEqual([
      { path: 'orbis/backups/orbis_20260826_132030_000.json', filename: 'orbis_20260826_132030_000.json', createdAt: '2026-08-26T13:20:30.000Z', size: 2048 },
      { path: 'orbis/backups/private-data_2026-08-25T11_00_00_000.json', filename: 'private-data_2026-08-25T11_00_00_000.json', createdAt: '2026-08-25T11:00:00.000Z', size: 1024 },
    ]);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://examplebucket.s3.us-east-1.amazonaws.com/?list-type=2&prefix=orbis%2Fbackups%2F',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('仅允许恢复当前备份前缀内的已命名版本', async () => {
    await expect(s3BackupService.restore(config, 'orbis/private-data.json')).rejects.toThrow('请选择当前备份目录中的有效备份版本');
  });

  it('删除当前备份前缀中的指定版本', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(204));
    vi.stubGlobal('fetch', fetchMock);

    await s3BackupService.deleteBackup(config, 'orbis/backups/private-data_2026-08-26T13_20_30_000.json');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://examplebucket.s3.us-east-1.amazonaws.com/orbis/backups/private-data_2026-08-26T13_20_30_000.json',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('路径风格访问自建服务时使用 {endpoint}/{bucket}/{key}', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(204));
    vi.stubGlobal('fetch', fetchMock);

    await s3BackupService.deleteBackup({ ...config, endpoint: 'http://localhost:9000', pathStyle: true }, 'orbis/backups/private-data_2026-08-26T13_20_30_000.json');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:9000/examplebucket/orbis/backups/private-data_2026-08-26T13_20_30_000.json',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('测试连接时检查 Bucket 可列举性', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200));
    vi.stubGlobal('fetch', fetchMock);

    await s3BackupService.testConnection(config);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://examplebucket.s3.us-east-1.amazonaws.com/?list-type=2&max-keys=1&prefix=orbis%2Fbackups%2F',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('缺少必填配置时按表单顺序抛出业务错误', async () => {
    await expect(s3BackupService.backup({ ...config, endpoint: '' })).rejects.toThrow('请填写 S3 服务地址');
    await expect(s3BackupService.backup({ ...config, bucket: '' })).rejects.toThrow('请填写 Bucket 名称');
    await expect(s3BackupService.testConnection({ ...config, accessKeyId: '' })).rejects.toThrow('请填写 Access Key ID');
    await expect(s3BackupService.testConnection({ ...config, secretAccessKey: '' })).rejects.toThrow('请填写 Secret Access Key');
  });

  it('失败时透出服务端错误码与描述', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403, `
      <?xml version="1.0" encoding="UTF-8"?>
      <Error>
        <Code>AccessDenied</Code>
        <Message>The bucket you access does not exist</Message>
      </Error>
    `)));

    await expect(s3BackupService.testConnection(config)).rejects.toThrow('S3 GET 失败（HTTP 403）：AccessDenied，The bucket you access does not exist');
  });
});
