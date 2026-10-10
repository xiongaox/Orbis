import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createBackupFile,
  detectBackupPlatform,
  platformFromFilename,
  timestampFromFilename,
} from './remoteBackupShared';

/** 伪造 UA 与 Tauri 运行时标记 */
function stubEnv(userAgent: string, isTauri: boolean) {
  vi.stubGlobal('navigator', { userAgent });
  vi.stubGlobal('window', isTauri ? { __TAURI_INTERNALS__: {} } : {});
}

describe('备份来源端识别', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('区分各端：桌面 Windows/macOS、安卓、以及浏览器打开的网页版', () => {
    stubEnv('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/120.0', true);
    expect(detectBackupPlatform()).toBe('windows');

    stubEnv('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1', true);
    expect(detectBackupPlatform()).toBe('macos');

    stubEnv('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36', true);
    expect(detectBackupPlatform()).toBe('android');

    // 网页版：macOS 浏览器同样带 Macintosh，但非 Tauri 运行时必须判为 web，
    // 否则会把网页端导出的备份误标成桌面 mac
    stubEnv('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1', false);
    expect(detectBackupPlatform()).toBe('web');
  });
});

describe('备份文件名端后缀', () => {
  it('新建备份把端标识写进文件名，不破坏时间戳解析', () => {
    const backup = createBackupFile('orbis/backups', 'windows');
    expect(backup.filename).toMatch(/^orbis_\d{8}_\d{6}_\d{3}_win\.zip$/);
    expect(platformFromFilename(backup.filename)).toBe('windows');

    // 时间戳仍能解析（列表在没有服务器时间时依赖它）
    const parsed = timestampFromFilename(backup.filename);
    expect(Number.isNaN(new Date(parsed).getTime())).toBe(false);
  });

  it('旧的 orbis_<时间戳>.zip 命名继续可用：时间戳可解析、端标识为未标注', () => {
    const legacy = 'orbis_20261010_094813_216.zip';
    expect(timestampFromFilename(legacy)).toBe('2026-10-10T09:48:13.216');
    expect(platformFromFilename(legacy)).toBeNull();

    // 更早的旧前缀同样不受影响
    expect(platformFromFilename('private-data_2026-08-01T10_00_00_000.zip')).toBeNull();
  });
});
