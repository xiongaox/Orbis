/**
 * backupPackageService - 应用服务层
 *
 * 模块定位：
 * - 负责备份产物的模块化多 JSON 归档与解包恢复。
 * - 将原有单一的大 JSON 拆分为：
 *   - account_settings.json：账户与通用业务配置
 *   - [术数]_cases.json：按术数（八字、奇门、三元等）独立分包的命盘案例
 *   - [术数]_chat_history.json：按术数独立分包的 AI 研判对话历史（可选不备份）
 *   - manifest.json：包含版本与模块清单的归档元数据
 * - 打包为标准 ZIP 归档，向下完全兼容老版本单一 JSON 备份的无缝恢复。
 */

import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { localPrivateStore, type PrivateRecord } from './localPrivateStore';
import { aiChatHistoryService, type AiChatSession } from './aiChatHistoryService';

export interface BackupContentOptions {
  /**
   * 是否在备份中包含 AI 研判对话历史（关闭后仅备份命盘案例与核心配置）
   * @default true
   */
  includeChatHistory: boolean;
}

export const DEFAULT_BACKUP_CONTENT_OPTIONS: BackupContentOptions = {
  includeChatHistory: true,
};

export interface BackupManifest {
  schemaVersion: number;
  appName: string;
  exportedAt: string;
  options: BackupContentOptions;
  files: Record<string, {
    description: string;
    recordCount?: number;
    sessionCount?: number;
  }>;
}

export interface RestoreSummary {
  format: 'zip' | 'legacy_json';
  restoredRecordsCount: number;
  restoredSessionsCount: number;
  restoredCaseTypes: string[];
}

/** 备份配置和系统凭据类型，避免在另一设备恢复时覆盖目标设备的备份凭证 */
const EXCLUDED_CONFIG_RECORD_TYPES = new Set([
  'webdav_config',
  's3_config',
  'backup_method',
]);

/**
 * 将当前工作区数据打包为模块化多 JSON 的 ZIP 压缩包
 */
export async function packBackupZip(options: BackupContentOptions = DEFAULT_BACKUP_CONTENT_OPTIONS): Promise<{
  data: Uint8Array;
  manifest: BackupManifest;
}> {
  // 1. 获取本地私有存储快照
  const snapshot = await localPrivateStore.snapshot();
  const allRecords = snapshot.records || [];

  // 2. 分流案例与系统设置
  const accountRecords: PrivateRecord[] = [];
  const caseRecordsByType = new Map<string, PrivateRecord[]>();

  for (const record of allRecords) {
    if (EXCLUDED_CONFIG_RECORD_TYPES.has(record.type)) {
      continue;
    }

    if (record.type.endsWith('_case')) {
      // 提取术数名称，例如 'bazi_case' -> 'bazi'
      const divination = record.type.slice(0, -'_case'.length);
      const list = caseRecordsByType.get(divination) || [];
      list.push(record);
      caseRecordsByType.set(divination, list);
    } else {
      accountRecords.push(record);
    }
  }

  // 3. 构建待打包文件映射
  const zipFiles: Record<string, Uint8Array> = {};
  const manifestFiles: BackupManifest['files'] = {};

  // 3.1 账户与通用设置
  zipFiles['account_settings.json'] = strToU8(JSON.stringify(accountRecords, null, 2));
  manifestFiles['account_settings.json'] = {
    description: '账户配置、AI模型服务、案例收藏与通用业务设置',
    recordCount: accountRecords.length,
  };

  // 3.2 各术数命盘案例（八字、奇门、三元天星等）
  const knownDivinations = new Set(['bazi', 'qimen', 'sanyuan']);
  for (const div of caseRecordsByType.keys()) {
    knownDivinations.add(div);
  }

  const DIVINATION_NAMES: Record<string, string> = {
    bazi: '八字命盘案例',
    qimen: '奇门排盘案例',
    sanyuan: '三元天星案例',
  };

  for (const div of knownDivinations) {
    const records = caseRecordsByType.get(div) || [];
    const filename = `${div}_cases.json`;
    zipFiles[filename] = strToU8(JSON.stringify(records, null, 2));
    manifestFiles[filename] = {
      description: DIVINATION_NAMES[div] || `${div} 术数案例`,
      recordCount: records.length,
    };
  }

  // 3.3 AI 研判对话历史（按术数独立分包，用户可配置是否排除）
  if (options.includeChatHistory) {
    const allSessions = aiChatHistoryService.getAllSessions();

    // 按 session.divinationType 分组
    const sessionsByType = new Map<string, AiChatSession[]>();
    for (const session of allSessions) {
      const type = session.divinationType || 'bazi';
      const list = sessionsByType.get(type) || [];
      list.push(session);
      sessionsByType.set(type, list);
    }

    // 为已知术数及所有包含会话的术数独立归档
    for (const div of knownDivinations) {
      const sessions = sessionsByType.get(div) || [];
      const filename = `${div}_chat_history.json`;
      zipFiles[filename] = strToU8(JSON.stringify(sessions, null, 2));
      manifestFiles[filename] = {
        description: `${DIVINATION_NAMES[div] ? DIVINATION_NAMES[div].replace('案例', '') : div} AI 研判对话历史`,
        sessionCount: sessions.length,
      };
    }
  }

  // 3.4 归档清单 manifest.json
  const manifest: BackupManifest = {
    schemaVersion: 3,
    appName: 'Orbis',
    exportedAt: new Date().toISOString(),
    options,
    files: manifestFiles,
  };
  zipFiles['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));

  // 4. 执行 ZIP 压缩
  const compressedZipData = zipSync(zipFiles, { level: 6 });

  return {
    data: compressedZipData,
    manifest,
  };
}

/**
 * 判断数据是否为 ZIP 压缩包（通过扩展名或 PK 魔数）
 */
export function isZipArchive(data: Uint8Array | string, filename?: string): boolean {
  if (filename && filename.toLowerCase().endsWith('.zip')) {
    return true;
  }
  if (filename && filename.toLowerCase().endsWith('.json')) {
    return false;
  }
  if (typeof data !== 'string' && data.length >= 4) {
    // PK 头部魔数：0x50 0x4b 0x03 0x04
    return data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04;
  }
  return false;
}

/**
 * 解包并恢复备份（兼容多 JSON 的 ZIP 与旧版单一 JSON）
 */
export async function unpackAndRestoreBackup(
  rawInput: Uint8Array | string,
  filename?: string,
): Promise<RestoreSummary> {
  const isZip = isZipArchive(rawInput, filename);

  if (!isZip) {
    // -------------------------------------------------------------
    // 兼容模式：恢复旧版单一 JSON 快照
    // -------------------------------------------------------------
    let jsonText: string;
    if (typeof rawInput === 'string') {
      jsonText = rawInput;
    } else {
      jsonText = new TextDecoder('utf-8').decode(rawInput);
    }

    const snapshot = JSON.parse(jsonText) as { records?: PrivateRecord[] };
    await localPrivateStore.restore(snapshot as never);

    const caseTypes = new Set<string>();
    for (const r of snapshot.records || []) {
      if (r.type.endsWith('_case')) {
        caseTypes.add(r.type.replace('_case', ''));
      }
    }

    return {
      format: 'legacy_json',
      restoredRecordsCount: snapshot.records?.length || 0,
      restoredSessionsCount: 0,
      restoredCaseTypes: Array.from(caseTypes),
    };
  }

  // -------------------------------------------------------------
  // 新版模式：解包 ZIP 并分模块还原
  // -------------------------------------------------------------
  let zipBytes: Uint8Array;
  if (typeof rawInput === 'string') {
    zipBytes = strToU8(rawInput);
  } else {
    zipBytes = rawInput;
  }

  const unzipped = unzipSync(zipBytes);

  const restoredRecords: PrivateRecord[] = [];
  const restoredSessions: AiChatSession[] = [];
  const caseTypes = new Set<string>();

  // 遍历解压出来的所有 JSON 文件
  for (const [entryPath, u8Content] of Object.entries(unzipped)) {
    if (entryPath.endsWith('/') || !entryPath.endsWith('.json')) {
      continue;
    }

    const jsonStr = strFromU8(u8Content);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      continue;
    }

    // 1. 案例文件：*_cases.json
    if (entryPath.endsWith('_cases.json')) {
      const div = entryPath.replace('_cases.json', '');
      caseTypes.add(div);
      if (Array.isArray(parsed)) {
        restoredRecords.push(...(parsed as PrivateRecord[]));
      }
      continue;
    }

    // 2. 账户与配置：account_settings.json
    if (entryPath === 'account_settings.json') {
      if (Array.isArray(parsed)) {
        restoredRecords.push(...(parsed as PrivateRecord[]));
      }
      continue;
    }

    // 3. 对话历史：*_chat_history.json
    if (entryPath.endsWith('_chat_history.json')) {
      if (Array.isArray(parsed)) {
        restoredSessions.push(...(parsed as AiChatSession[]));
      }
      continue;
    }
  }

  // 执行案例与配置恢复
  if (restoredRecords.length > 0) {
    await localPrivateStore.restore({
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      records: restoredRecords,
    });
  }

  // 执行 AI 对话历史增量合并恢复
  if (restoredSessions.length > 0) {
    aiChatHistoryService.importSessions(restoredSessions, 'merge');
  }

  return {
    format: 'zip',
    restoredRecordsCount: restoredRecords.length,
    restoredSessionsCount: restoredSessions.length,
    restoredCaseTypes: Array.from(caseTypes),
  };
}
