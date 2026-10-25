export const BAZI_CASES_CHANGED_EVENT = 'bazi-cases-changed';
/** 云同步拉回 AI 对话历史后广播：驱动 aiChatHistoryService 失效缓存并刷新订阅方 */
export const AI_CHAT_SESSIONS_CHANGED_EVENT = 'ai-chat-sessions-changed';
export const SANYUAN_CASES_CHANGED_EVENT = 'sanyuan-cases-changed';
export const QIMEN_CASES_CHANGED_EVENT = 'qimen_cases_changed';

/** 八字 → 奇门「终身局」跨模块意图：以选中案例的出生时间起临时奇门局 */
export const QIMEN_LIFE_PAN_EVENT = 'qimen-life-pan-requested';

export interface QimenLifePanIntent {
    /** 案例出生时间（ISO 字符串），起局用 */
    birthDate: string;
    /** 案例名称，保存时预填「【终身局】XXX」 */
    caseName: string;
    /** 防重复触发的序号（同一案例连点两次也算新意图） */
    seq: number;
}
