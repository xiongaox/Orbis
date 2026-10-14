/**
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
import {
  localPrivateStore,
  DEVICE_LOCAL_CONFIG_RECORD_TYPES,
  SCHEMA_VERSION,
  type PrivateRecord,
  type PrivateRecordType,
} from './localPrivateStore';
import { aiChatHistoryService, type AiChatSession } from './aiChatHistoryService';
import { preloadAppSettings } from './appSettingStore';
import { preloadTheme } from './themeService';
import { preloadAiResearchStatuses } from './aiTaskStatusService';
import { detectBackupPlatform, isBackupPlatform, platformFromFilename, type BackupPlatform } from './remoteBackupShared';

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
  /** 备份来源端；旧的备份包没有此字段 */
  platform?: BackupPlatform;
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
  /** 覆盖同步时删除的本机多余记录数（本机有、备份没有），恢复结果与备份一致 */
  removedRecordsCount: number;
  /** 备份来源端（取自 manifest 或文件名后缀，旧备份为 null），供界面判断是否跨端恢复 */
  sourcePlatform: BackupPlatform | null;
}

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

  // 空快照必须报错，不能照常打包上传：
  // 各项案例文件即使无数据也会写成 []，压缩后仅 1KB 出头，与正常包（几十到上百 KB）
  // 在远端列表里几乎无从分辨，而「备份成功」的提示会让空包被当成有效备份留存下来。
  if (allRecords.length === 0) {
    throw new Error('本地没有可备份的数据：请确认当前设备已有案例或配置，或本机存储是否正常');
  }

  // 2. 分流案例与系统设置
  const accountRecords: PrivateRecord[] = [];
  const caseRecordsByType = new Map<string, PrivateRecord[]>();

  for (const record of allRecords) {
    // 打包排除设备本地配置（备份凭据不跨设备覆盖）
    if (DEVICE_LOCAL_CONFIG_RECORD_TYPES.has(record.type)) {
      continue;
    }
    // AI 对话历史单独经 getAllSessions() 打进 *_chat_history.json（受 includeChatHistory 控制），
    // 此处排除记录本体以免重复打包
    if (record.type === 'ai_chat_sessions') {
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
  // 清单以 DIVINATION_NAMES 为单一来源：即使某术数暂无案例也输出空文件，
  // 新增术数只需在此登记一次，避免与实际案例类型脱节
  const DIVINATION_NAMES: Record<string, string> = {
    bazi: '八字命盘案例',
    qimen: '奇门排盘案例',
    sanyuan: '三元天星案例',
  };

  const knownDivinations = new Set([...Object.keys(DIVINATION_NAMES), ...caseRecordsByType.keys()]);

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
    platform: detectBackupPlatform(),
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

/** 解包后的备份内容（纯内存结构，不落盘），供预览与恢复复用 */
export interface UnpackedBackup {
  format: RestoreSummary['format'];
  records: PrivateRecord[];
  sessions: AiChatSession[];
  /** 备份中声明的案例术数类型（每个 *_cases.json 都算，即使内容为空数组） */
  caseTypes: string[];
  /** 备份是否包含对话历史文件（决定恢复时是否覆盖本机会话） */
  hasChatHistoryFiles: boolean;
  sourcePlatform: BackupPlatform | null;
}

/**
 * 解包备份（兼容多 JSON 的 ZIP 与旧版单一 JSON），不写入本机。
 */
export function unpackBackup(rawInput: Uint8Array | string, filename?: string): UnpackedBackup {
  if (!isZipArchive(rawInput, filename)) {
    // -------------------------------------------------------------
    // 兼容模式：旧版单一 JSON 快照
    // -------------------------------------------------------------
    const jsonText = typeof rawInput === 'string' ? rawInput : new TextDecoder('utf-8').decode(rawInput);
    const snapshot = JSON.parse(jsonText) as { schemaVersion?: number; records?: PrivateRecord[] } | null;
    if (!snapshot || !Array.isArray(snapshot.records) || ![1, SCHEMA_VERSION].includes(snapshot.schemaVersion as number)) {
      throw new Error('备份文件版本不受支持');
    }
    const caseTypes = new Set<string>();
    for (const r of snapshot.records) {
      if (r.type.endsWith('_case')) caseTypes.add(r.type.replace('_case', ''));
    }
    return {
      format: 'legacy_json',
      records: snapshot.records,
      sessions: [],
      caseTypes: Array.from(caseTypes),
      hasChatHistoryFiles: false,
      // 旧版单一 JSON 快照没有端信息，只能靠文件名后缀
      sourcePlatform: filename ? platformFromFilename(filename) : null,
    };
  }

  // -------------------------------------------------------------
  // 新版模式：解包 ZIP 并分模块还原
  // -------------------------------------------------------------
  const zipBytes = typeof rawInput === 'string' ? strToU8(rawInput) : rawInput;
  const unzipped = unzipSync(zipBytes);

  const records: PrivateRecord[] = [];
  const sessions: AiChatSession[] = [];
  const caseTypes = new Set<string>();
  let hasChatHistoryFiles = false;
  let manifestPlatform: BackupPlatform | null = null;

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

    // 0. 归档元数据：取来源端（旧包无此字段）
    if (entryPath === 'manifest.json') {
      const platform = (parsed as BackupManifest | null)?.platform;
      if (isBackupPlatform(platform)) manifestPlatform = platform;
      continue;
    }

    // 1. 案例文件：*_cases.json
    if (entryPath.endsWith('_cases.json')) {
      const div = entryPath.replace('_cases.json', '');
      caseTypes.add(div);
      if (Array.isArray(parsed)) {
        records.push(...(parsed as PrivateRecord[]));
      }
      continue;
    }

    // 2. 账户与配置：account_settings.json
    if (entryPath === 'account_settings.json') {
      if (Array.isArray(parsed)) {
        records.push(...(parsed as PrivateRecord[]));
      }
      continue;
    }

    // 3. 对话历史：*_chat_history.json
    if (entryPath.endsWith('_chat_history.json')) {
      hasChatHistoryFiles = true;
      if (Array.isArray(parsed)) {
        sessions.push(...(parsed as AiChatSession[]));
      }
      continue;
    }
  }

  return {
    format: 'zip',
    records,
    sessions,
    caseTypes: Array.from(caseTypes),
    hasChatHistoryFiles,
    // manifest 优先（准确记录打包端），旧包回退到文件名后缀
    sourcePlatform: manifestPlatform ?? (filename ? platformFromFilename(filename) : null),
  };
}

/** 覆盖同步时会被同步的类型清单（与 restore 的 syncTypes 规则一致） */
function collectSyncTypes(unpacked: UnpackedBackup): Set<string> {
  const syncTypes = new Set<string>(unpacked.records.map((record) => record.type));
  for (const div of unpacked.caseTypes) syncTypes.add(`${div}_case`);
  return syncTypes;
}

/**
 * 预估恢复影响：按 restore 的覆盖同步规则，计算确认后将删除本机多少条记录/多少段会话。
 * 确认弹窗在用户点「确认恢复」之前展示该数字，防止误恢复不可逆地清掉本机数据。
 */
export async function estimateRestoreImpact(unpacked: UnpackedBackup): Promise<{ removedRecordsCount: number; removedSessionsCount: number }> {
  // 空备份不触发同步删除（与 restore 行为一致），预估同样为 0
  if (unpacked.records.length === 0) return { removedRecordsCount: 0, removedSessionsCount: 0 };

  const syncedIds = new Map<string, Set<string>>();
  for (const record of unpacked.records) {
    let ids = syncedIds.get(record.type);
    if (!ids) {
      ids = new Set<string>();
      syncedIds.set(record.type, ids);
    }
    ids.add(record.id);
  }

  let removedRecordsCount = 0;
  for (const type of collectSyncTypes(unpacked)) {
    if (DEVICE_LOCAL_CONFIG_RECORD_TYPES.has(type)) continue;
    const keepIds = syncedIds.get(type) ?? new Set<string>();
    for (const local of await localPrivateStore.list(type as PrivateRecordType)) {
      if (!keepIds.has(local.id)) removedRecordsCount += 1;
    }
  }

  let removedSessionsCount = 0;
  // importSessions 在会话列表为空时直接返回（不删本机），预估保持一致
  if (unpacked.hasChatHistoryFiles && unpacked.sessions.length > 0) {
    const importedTypes = new Set(unpacked.sessions.map((session) => session.divinationType));
    removedSessionsCount = aiChatHistoryService.getAllSessions().filter((session) => importedTypes.has(session.divinationType)).length;
  }

  return { removedRecordsCount, removedSessionsCount };
}

/**
 * 执行解包后备份的恢复：恢复即按备份覆盖同步——
 * 需要完全同步的类型 = 每个 *_cases.json 对应的案例类型（即使备份里该类型为空数组，
 * 也要清掉本机多余案例）+ 备份记录中出现的其他类型（profile、收藏、进度等）。
 * 空备份（无任何记录）不触发同步删除，避免畸形包把本机清空。
 */
export async function restoreUnpackedBackup(unpacked: UnpackedBackup): Promise<RestoreSummary> {
  let removedRecordsCount = 0;
  if (unpacked.records.length > 0) {
    ({ removedRecordsCount } = await localPrivateStore.restore({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      records: unpacked.records,
    }, { syncTypes: collectSyncTypes(unpacked) }));
  }

  // 备份包含对话历史文件时按备份覆盖本机对应术数的会话；
  // 备份未含对话历史（打包时关闭了该选项）则保留本机会话，不做增删。
  // ponytail: 源端某术数会话为空数组时该术数类型不进 replace 集合，本机会话残留；
  // 升级路径：让 importSessions 接收备份中声明的全部术数类型。
  if (unpacked.hasChatHistoryFiles) {
    aiChatHistoryService.importSessions(unpacked.sessions, 'replace');
  }

  // app_setting 类记录（主题/布局/隐私/导航槽/锁定盘/研判状态/角色 prompt）恢复后已写入 SQLite，
  // 但内存缓存仍是恢复前的旧值；重载缓存及其派生态（theme DOM、研判状态），让恢复即时生效而非等重启。
  await preloadAppSettings();
  preloadTheme();
  preloadAiResearchStatuses();

  return {
    format: unpacked.format,
    restoredRecordsCount: unpacked.records.length,
    restoredSessionsCount: unpacked.sessions.length,
    restoredCaseTypes: [...unpacked.caseTypes],
    removedRecordsCount,
    sourcePlatform: unpacked.sourcePlatform,
  };
}

/**
 * 解包并恢复备份（兼容多 JSON 的 ZIP 与旧版单一 JSON）
 */
export async function unpackAndRestoreBackup(
  rawInput: Uint8Array | string,
  filename?: string,
): Promise<RestoreSummary> {
  return await restoreUnpackedBackup(unpackBackup(rawInput, filename));
}
