/**
 * aiChatHistoryService - 应用服务层
 *
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
import { isTauri, invoke } from '@tauri-apps/api/core';

let cachedSessions: AiChatSession[] | null = null;

function loadAllSessionsFromStorage(): AiChatSession[] {
  if (cachedSessions) return cachedSessions;
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    cachedSessions = [];
    return cachedSessions;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedSessions = [];
      return cachedSessions;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedSessions = (parsed as AiChatSession[])
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
      return cachedSessions;
    }
    cachedSessions = [];
    return cachedSessions;
  } catch (err) {
    console.warn('Failed to load AI chat sessions from localStorage:', err);
    cachedSessions = [];
    return cachedSessions;
  }
}

function saveAllSessionsToStorage(sessions: AiChatSession[]): void {
  // 必须换新数组引用：订阅方（useSyncExternalStore）以 Object.is 比较快照，
  // 原引用入库会导致收藏等原地修改后界面不刷新。
  cachedSessions = [...sessions];
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    notifyListeners();
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    notifyListeners();
  } catch (err) {
    console.error('Failed to save AI chat sessions to localStorage:', err);
  }
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
    const safeName = filename.replace(/[\\/:*?"<>|]/g, '_');
    const finalName = safeName.endsWith('.md') ? safeName : `${safeName}.md`;

    if (typeof window !== 'undefined' && isTauri()) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const path = await save({
        defaultPath: finalName,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (!path) return 'cancelled';
      await invoke('write_text_file', { path, content });
      return 'saved';
    }

    this.downloadMarkdown(finalName, content);
    return 'downloaded';
  },
};
