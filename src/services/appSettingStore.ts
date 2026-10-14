/**
 * 通用应用设置存储：把原先散落在 localStorage 的键值（theme、布局、隐私开关、
 * 导航槽位、锁定盘、研判状态、AI 角色 prompt 等）统一迁到 SQLite，避免
 * localStorage 被 WebView 清理/origin 变动时静默丢失（曾导致备份漏掉对话历史）。
 *
 * 设计要点：
 * - 对外仍是**同步读**：SQLite 是异步的，故用内存缓存 + 启动预热（preloadAppSettings）
 *   保持 readSetting 同步签名，9 个调用点无需改签名、也不会因异步产生首屏闪烁。
 * - 每个设置一条 app_setting 记录，id 即设置键，payload.value 为值。
 * - 备份：app_setting 会被 localPrivateStore.snapshot 收进 account_settings.json，
 *   随备份跨设备同步（用户已确认「全部进备份」）。唯一例外 auto_backup_state，
 *   它存独立记录类型并列入 DEVICE_LOCAL_CONFIG，不进备份。
 */

import { localPrivateStore, type PrivateRecordType } from './localPrivateStore';

const SETTING_TYPE: PrivateRecordType = 'app_setting';

let cache = new Map<string, unknown>();
let ready = false;

/**
 * 启动预热：一次性把所有 app_setting 记录读入内存缓存。
 * 必须在首屏渲染前 await 完成，否则同步读只会拿到默认值。
 */
export async function preloadAppSettings(): Promise<void> {
  const records = await localPrivateStore.list(SETTING_TYPE);
  cache = new Map(records.map((record) => [record.id, record.payload.value]));
  ready = true;
}

/** 同步读设置；未预热或无记录时返回 fallback。 */
export function readSetting<T>(key: string, fallback: T): T {
  if (!ready || !cache.has(key)) return fallback;
  return cache.get(key) as T;
}

/** 同步写设置：先更新内存缓存保证读到最新值，再异步落盘 SQLite。 */
export function writeSetting(key: string, value: unknown): void {
  cache.set(key, value);
  void localPrivateStore.put(SETTING_TYPE, { value }, key).catch((error: unknown) => {
    console.warn('写入应用设置失败', key, error);
  });
}

/** 供测试/诊断：当前是否已完成预热。 */
export function isAppSettingReady(): boolean {
  return ready;
}
