/**
 * 模块定位：
 * - 负责全应用 AI 对话历史的会话隔离、本地持久化、多维索引、收藏管理与 Markdown 导出。
 * - 支持术数类型（八字、奇门、六爻、梅花等）及具体案例层级的树形组织。
 
*/

export type DivinationType = 'bazi' | 'qimen' | 'sanyuan' | string;

export interface DivinationTypeConfig {
  id: DivinationType;
  name: string;
  order: number;
}

export const SUPPORTED_DIVINATION_TYPES: DivinationTypeConfig[] = [
  { id: 'bazi', name: '四柱八字', order: 1 },
  { id: 'qimen', name: '奇门遁甲', order: 2 },
  { id: 'sanyuan', name: '三元天星', order: 3 },
];

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  timestamp: number;
  error?: boolean;
}

export interface AiChatSession {
  id: string; // 唯一会话标识，如 "bazi_case_123" 或 "bazi_free_20020125_..."
  divinationType: DivinationType; // 术数类型
  divinationTypeName: string; // 术数中文名
  caseId?: string; // 关联的案例 ID
  caseName: string; // 案例名称或命盘特征名
  title: string; // 会话标题（如首轮提问或自定义）
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean; // 是否收藏
  meta?: {
    solarDate?: string;
    lunarDate?: string;
    gender?: string;
    ganZhi?: string;
  };
  messages: ChatMessageItem[];
}

const STORAGE_KEY = 'orbis_ai_chat_sessions_v1';
const LISTENERS: Array<() => void> = [];

function notifyListeners() {
  LISTENERS.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('aiChatHistoryService listener error:', err);
    }
  });
}

import { extractSmartTitleFromQuestion } from './aiChatService';
import { exportTextFile } from '../utils/fileExportUtil';
import { localPrivateStore } from './localPrivateStore';
import { AI_CHAT_SESSIONS_CHANGED_EVENT } from '../data/caseConstants';

/** 每会话一条记录（recordId = sessionId），云同步按会话粒度手动推送（§4.3 第 11 条） */
const SESSIONS_RECORD_TYPE = 'ai_chat_session';
/** 遗留：旧版把整份会话数组存成一条记录，预载时迁移拆分后删除 */
const LEGACY_SESSIONS_RECORD_TYPE = 'ai_chat_sessions';
const LEGACY_SESSIONS_RECORD_ID = 'ai_chat_sessions';

let cachedSessions: AiChatSession[] | null = null;

/**
 * 「已落盘内容」快照（sessionId → JSON），差量落盘的比较基准。
 * 必须是内容字符串而非对象引用：调用方（updateSessionMessages/toggleFavorite 等）
 * 是原地修改会话对象的，而 loadAllSessionsFromStorage 返回的就是内存缓存本身，
 * 持有引用会让基准被同步改掉，差量判断失效（全部跳过、什么都不写盘）。
 */
let persistedSnapshot = new Map<string, string>();

/** 一次性迁移：localStorage 里的旧会话搬进 SQLite 后删除，避免双份。 */
async function migrateLegacySessionsFromLocalStorage(): Promise<AiChatSession[] | null> {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    localStorage.removeItem(STORAGE_KEY);
    return parsed as AiChatSession[];
  } catch (err) {
    console.warn('迁移旧 AI 对话历史失败：', err);
    return null;
  }
}

/**
 * 从本地存储载入全部会话：新格式（每会话一条）优先；为空时依次回退到
 * 旧版 SQLite 单条整份数组、localStorage 旧数据，回退来源载入后立即迁移为
 * 新格式并删除旧数据（避免下次重复迁移与双份）。
 */
async function loadSessionsFromStore(): Promise<AiChatSession[]> {
  const records = await localPrivateStore.list(SESSIONS_RECORD_TYPE);
  const sessions = records
    .map((record) => record.payload.value as AiChatSession | undefined)
    .filter((session): session is AiChatSession => Boolean(session?.id));
  if (sessions.length > 0) {
    // 新格式已有数据：清理可能残留的旧记录（迁移中途退出过）
    await removeLegacySessionsRecord();
    return sessions;
  }
  const legacyRecord = await localPrivateStore.get(LEGACY_SESSIONS_RECORD_TYPE, LEGACY_SESSIONS_RECORD_ID);
  const legacyList = legacyRecord?.payload.value;
  if (Array.isArray(legacyList) && legacyList.length > 0) {
    const migrated = legacyList as AiChatSession[];
    await writeSessions(migrated);
    await removeLegacySessionsRecord();
    return migrated;
  }
  const fromLocalStorage = await migrateLegacySessionsFromLocalStorage();
  if (fromLocalStorage && fromLocalStorage.length > 0) {
    await writeSessions(fromLocalStorage);
    return fromLocalStorage;
  }
  await removeLegacySessionsRecord();
  return [];
}

async function removeLegacySessionsRecord(): Promise<void> {
  await localPrivateStore.remove(LEGACY_SESSIONS_RECORD_TYPE, LEGACY_SESSIONS_RECORD_ID, { remoteOrigin: true });
}

/** 逐条写入会话记录（旧数据迁移用；手动同步类型不会因此自动入队） */
async function writeSessions(sessions: AiChatSession[]): Promise<void> {
  for (const session of sessions) {
    await localPrivateStore.put(SESSIONS_RECORD_TYPE, { value: session }, session.id);
  }
}

/**
 * 启动预热：把会话从本地存储载入内存缓存（含旧数据迁移）。
 * 必须在首屏渲染前 await 完成，否则同步的 getAllSessions 只会拿到空数组。
 */
export async function preloadAiChatSessions(): Promise<void> {
  const loaded = await loadSessionsFromStore();
  const normalized = normalizeSessions(loaded);
  cachedSessions = normalized;
  persistedSnapshot = new Map(normalized.map((session) => [session.id, JSON.stringify(session)]));
  notifyListeners();
}

/**
 * 失效内存缓存并从本地存储重载（云同步拉回对话历史后调用，§4.3 第 11 条）。
 * 不重载会让后续对话基于陈旧数组整体落盘，把刚拉回的内容覆盖掉。
 */
export async function reloadFromStore(): Promise<void> {
  cachedSessions = null;
  await preloadAiChatSessions();
}

function normalizeSessions(list: AiChatSession[]): AiChatSession[] {
  return list
    .map((s) => {
      // 纠正存量数据中直接使用 caseName 作为会话标题的缺陷
      if (!s.title || s.title === s.caseName) {
        const firstUserMsg = s.messages?.find((m) => m.role === 'user');
        if (firstUserMsg) {
          s.title = extractSmartTitleFromQuestion(firstUserMsg.content, s.divinationType);
        } else {
          s.title = '命理综合研判';
        }
      }
      return s;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function loadAllSessionsFromStorage(): AiChatSession[] {
  if (cachedSessions) return cachedSessions;
  // 预热未完成（极端时序）时退化为空，避免读到未初始化的 null
  cachedSessions = [];
  return cachedSessions;
}

function saveAllSessionsToStorage(sessions: AiChatSession[]): void {
  // 必须换新数组引用：订阅方（useSyncExternalStore）以 Object.is 比较快照，
  // 原引用入库会导致收藏等原地修改后界面不刷新。
  cachedSessions = [...sessions];
  // 逐会话差量落盘；内存缓存已更新，界面即时反映，不等待写盘
  void persistSessionsDiff(sessions).catch((err) =>
    console.error('保存 AI 对话历史失败：', err),
  );
  notifyListeners();
}

/**
 * 差量落盘（每会话一条记录）：内容与已落盘快照不同的会话逐条写、已被移除的逐条删。
 * 旧实现每次把整份数组覆盖进单条记录——一次对话要重写全部会话（数百 KB），
 * 且云同步只能整份推送；改为逐条后单次只写一个会话的几十 KB。
 * 注意：写盘失败时**不更新**快照，让下一轮整体重写（幂等），避免丢改动。
 */
async function persistSessionsDiff(sessions: AiChatSession[]): Promise<void> {
  const nextSnapshot = new Map<string, string>();
  for (const session of sessions) {
    const json = JSON.stringify(session);
    nextSnapshot.set(session.id, json);
    if (persistedSnapshot.get(session.id) === json) continue;
    await localPrivateStore.put(SESSIONS_RECORD_TYPE, { value: session }, session.id);
  }
  for (const id of persistedSnapshot.keys()) {
    if (!nextSnapshot.has(id)) {
      await localPrivateStore.remove(SESSIONS_RECORD_TYPE, id);
    }
  }
  persistedSnapshot = nextSnapshot;
}

export const aiChatHistoryService = {
  /**
   * 订阅会话变更事件（用于抽屉与弹窗状态联动）
   */
  subscribe(listener: () => void): () => void {
    LISTENERS.push(listener);
    return () => {
      const idx = LISTENERS.indexOf(listener);
      if (idx >= 0) LISTENERS.splice(idx, 1);
    };
  },

  /**
   * 获取所有会话，默认按更新时间倒序
   */
  getAllSessions(): AiChatSession[] {
    const sessions = loadAllSessionsFromStorage();
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  /**
   * 根据 ID 获取单个会话
   */
  getSession(id: string): AiChatSession | null {
    if (!id) return null;
    const sessions = loadAllSessionsFromStorage();
    return sessions.find((s) => s.id === id) || null;
  },

  /**
   * 获取指定命主/案例名下的所有历史会话
   */
  getSessionsByCase(params: {
    caseId?: string;
    caseName?: string;
    divinationType?: DivinationType;
  }): AiChatSession[] {
    const sessions = loadAllSessionsFromStorage();
    return sessions
      .filter((s) => {
        if (params.divinationType && s.divinationType !== params.divinationType) {
          return false;
        }
        if (params.caseId && s.caseId) {
          return s.caseId === params.caseId;
        }
        if (params.caseName) {
          return s.caseName === params.caseName;
        }
        return false;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  /**
   * 保存或更新会话
   */
  saveSession(session: AiChatSession): void {
    const sessions = loadAllSessionsFromStorage();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);
    const updatedSession: AiChatSession = {
      ...session,
      updatedAt: Date.now(),
      title: session.title || '命理研判',
    };

    if (existingIndex >= 0) {
      sessions[existingIndex] = updatedSession;
    } else {
      sessions.unshift(updatedSession);
    }

    saveAllSessionsToStorage(sessions);
  },

  /**
   * 更新单个会话的标题
   */
  updateSessionTitle(sessionId: string, newTitle: string): void {
    if (!sessionId || !newTitle || !newTitle.trim()) return;
    const sessions = loadAllSessionsFromStorage();
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      session.title = newTitle.trim();
      session.updatedAt = Date.now();
      saveAllSessionsToStorage(sessions);
    }
  },

  /**
   * 更新某个会话的消息列表
   */
  updateSessionMessages(
    sessionId: string,
    messages: ChatMessageItem[],
    extra?: Partial<Omit<AiChatSession, 'id' | 'messages'>>
  ): AiChatSession {
    const sessions = loadAllSessionsFromStorage();
    let session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      // 自动创建新会话，智能提炼标题，避免直接使用 caseName
      let autoTitle = extra?.title;
      if (!autoTitle || autoTitle === extra?.caseName) {
        const firstUser = messages.find((m) => m.role === 'user');
        if (firstUser) {
          autoTitle = extractSmartTitleFromQuestion(firstUser.content, extra?.divinationType);
        } else {
          autoTitle = '命理综合研判';
        }
      }

      session = {
        id: sessionId,
        divinationType: extra?.divinationType || 'bazi',
        divinationTypeName: extra?.divinationTypeName || '四柱八字',
        caseId: extra?.caseId,
        caseName: extra?.caseName || '未命名排盘',
        title: autoTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
        meta: extra?.meta,
        messages,
      };
      sessions.unshift(session);
    } else {
      session.messages = messages;
      session.updatedAt = Date.now();
      if (extra?.caseName) session.caseName = extra.caseName;
      if (extra?.title && extra.title !== extra?.caseName) {
        session.title = extra.title;
      } else if (!session.title || session.title === session.caseName) {
        const firstUser = messages.find((m) => m.role === 'user');
        if (firstUser) {
          session.title = extractSmartTitleFromQuestion(firstUser.content, session.divinationType);
        }
      }
      if (extra?.meta) session.meta = { ...session.meta, ...extra.meta };
      if (extra?.caseId) session.caseId = extra.caseId;
    }

    saveAllSessionsToStorage(sessions);
    return session;
  },

  /**
   * 切换会话收藏状态
   */
  toggleFavorite(sessionId: string): boolean {
    const sessions = loadAllSessionsFromStorage();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return false;

    session.isFavorite = !session.isFavorite;
    session.updatedAt = Date.now();
    saveAllSessionsToStorage(sessions);
    return session.isFavorite;
  },

  /**
   * 删除指定会话
   */
  deleteSession(sessionId: string): void {
    const sessions = loadAllSessionsFromStorage();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    saveAllSessionsToStorage(filtered);
  },

  /**
   * 清空指定术数分类或全局的所有会话
   */
  clearSessions(divinationType?: DivinationType): void {
    if (!divinationType || divinationType === 'all') {
      saveAllSessionsToStorage([]);
    } else {
      const sessions = loadAllSessionsFromStorage();
      const filtered = sessions.filter((s) => s.divinationType !== divinationType);
      saveAllSessionsToStorage(filtered);
    }
  },

  /**
   * 导出全部或按术数筛选的会话数据
   */
  exportSessions(divinationType?: DivinationType): AiChatSession[] {
    const sessions = loadAllSessionsFromStorage();
    if (!divinationType || divinationType === 'all') {
      return [...sessions];
    }
    return sessions.filter((s) => s.divinationType === divinationType);
  },

  /**
   * 批量导入会话数据（用于从备份恢复）
   * @param importedSessions 待导入的会话列表
   * @param mode 'merge'（增量合并，按最新更新时间优先）或 'replace'（完全覆盖）
   */
  importSessions(importedSessions: AiChatSession[], mode: 'merge' | 'replace' = 'merge'): void {
    if (!Array.isArray(importedSessions) || importedSessions.length === 0) return;
    const currentSessions = loadAllSessionsFromStorage();

    if (mode === 'replace') {
      // 提取导入会话包含的术数类型
      const importedTypes = new Set(importedSessions.map((s) => s.divinationType));
      const remaining = currentSessions.filter((s) => !importedTypes.has(s.divinationType));
      const merged = [...importedSessions, ...remaining].sort((a, b) => b.updatedAt - a.updatedAt);
      saveAllSessionsToStorage(merged);
      return;
    }

    // merge 模式：按 id 幂等合并
    const sessionMap = new Map<string, AiChatSession>();
    for (const session of currentSessions) {
      sessionMap.set(session.id, session);
    }
    for (const session of importedSessions) {
      const existing = sessionMap.get(session.id);
      if (!existing || (session.updatedAt && session.updatedAt >= (existing.updatedAt || 0))) {
        sessionMap.set(session.id, session);
      }
    }

    const merged = Array.from(sessionMap.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    saveAllSessionsToStorage(merged);
  },

  /**
   * 将会话格式化为 Markdown 字符串导出
   */
  exportSessionToMarkdown(session: AiChatSession): string {
    const lines: string[] = [];
    const dateStr = new Date(session.createdAt).toLocaleString();
    lines.push(`# ${session.caseName} · ${session.divinationTypeName} AI 研判记录`);
    lines.push(`\n- **术数分类**：${session.divinationTypeName}`);
    lines.push(`- **创建时间**：${dateStr}`);
    if (session.meta?.solarDate) {
      lines.push(`- **公历信息**：${session.meta.solarDate}`);
    }
    if (session.meta?.lunarDate) {
      lines.push(`- **农历信息**：${session.meta.lunarDate}`);
    }
    if (session.meta?.gender) {
      lines.push(`- **性别造化**：${session.meta.gender}`);
    }
    if (session.meta?.ganZhi) {
      lines.push(`- **排盘干支**：${session.meta.ganZhi}`);
    }
    lines.push(`\n---\n`);

    session.messages.forEach((msg, idx) => {
      const isUser = msg.role === 'user';
      const timeStr = new Date(msg.timestamp).toLocaleTimeString();
      lines.push(`### ${idx + 1}. ${isUser ? '👤 用户提问' : `🤖 ${session.divinationTypeName} AI 研判`} (${timeStr})\n`);

      if (msg.reasoning) {
        lines.push(`> **【思考推导过程】**\n> \n> ${msg.reasoning.split('\n').join('\n> ')}\n`);
      }

      lines.push(`${msg.content}\n`);
    });

    lines.push(`\n---\n*由 Orbis 玄枢研判系统导出*`);
    return lines.join('\n');
  },

  /**
   * 下载 Markdown 文件到本地（浏览器端 Blob 方案）
   */
  downloadMarkdown(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.md') ? filename : `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * 导出 Markdown 文件（跨端）
   * - 桌面端（Tauri/WKWebView 不支持 <a download>）：原生保存对话框 + 原生写盘
   * - 浏览器端：回退至 Blob 下载
   * @returns 'saved' 已保存到所选路径 | 'cancelled' 用户取消 | 'downloaded' 已触发浏览器下载
   */
  async exportMarkdownFile(filename: string, content: string): Promise<'saved' | 'cancelled' | 'downloaded'> {
    return exportTextFile({ filename, content, extension: 'md', typeLabel: 'Markdown' });
  },
};

// 云同步拉回对话历史后失效内存缓存（§4.3 第 11 条）。注册在模块级而非弹窗内：
// 未打开对话历史界面时后台缓存同样必须及时失效，否则新对话会把拉回内容覆盖掉。
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener(AI_CHAT_SESSIONS_CHANGED_EVENT, () => {
    void reloadFromStore();
  });
}
