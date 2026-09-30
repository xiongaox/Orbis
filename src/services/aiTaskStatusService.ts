/**
 * aiTaskStatusService - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：本地业务服务与跨组件状态登记
 *
 * 关键职责：
 * - 登记每个案例的 AI 研判任务状态：研判中（running）/ 未读研判（unread）
 * - 关闭研判抽屉不会中止生成；结果落盘后用户不在该会话则标记未读，
 *   供首页案例列表在姓名后展示状态按钮并一键跳转研判抽屉
 * - 状态以案例 ID 为键写入 localStorage 跨启动保留；启动时清理残留的 running
 *   （生成不随进程存活，上一进程留下的 running 即脏数据）
 *
 * 主要导出：
 * - `AiResearchStatus`, `OPEN_AI_CHAT_EVENT`, `setAiResearchRunning`, `setAiResearchUnread`,
 *   `clearAiResearchStatus`, `getAiResearchStatuses`, `subscribeAiResearchStatus`
 *
 * 依赖关系：
 * - 上游依赖：无
 * - 下游影响：由 `AiChatDrawer`（写状态）与 `BaziCaseList`/案例卡片（读状态）消费
 */

export type AiResearchStatus = 'running' | 'unread';

const STORAGE_KEY = 'orbis_ai_research_status_v1';
const CHANGE_EVENT = 'orbis:ai-research-status-changed';

/** 案例列表状态按钮 → 直接打开对应模块研判抽屉的跨组件事件（由 BaseAiPromptModal 监听） */
export const OPEN_AI_CHAT_EVENT = 'orbis:open-ai-chat';

interface StatusEntry {
    status: AiResearchStatus;
    updatedAt: number;
}

type StatusMap = Record<string, StatusEntry>;

function readFromStorage(): StatusMap {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as StatusMap;
        // running 不随进程存活：启动时只保留未读标记
        const cleaned: StatusMap = {};
        for (const [key, entry] of Object.entries(parsed)) {
            if (entry?.status === 'unread') cleaned[key] = entry;
        }
        return cleaned;
    } catch {
        return {};
    }
}

let cache: StatusMap = readFromStorage();

function persist(next: StatusMap) {
    cache = next;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // 隐私模式/配额不足时仅保留内存态
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function setStatus(caseId: string, status: AiResearchStatus | null) {
    if (!caseId) return;
    const next = { ...cache };
    if (status === null) {
        delete next[caseId];
    } else {
        next[caseId] = { status, updatedAt: Date.now() };
    }
    persist(next);
}

/** 登记研判中（发送时调用，仅案例会话） */
export function setAiResearchRunning(caseId: string) {
    setStatus(caseId, 'running');
}

/** 登记未读研判（后台生成完成且用户不在该会话时调用） */
export function setAiResearchUnread(caseId: string) {
    setStatus(caseId, 'unread');
}

/** 清除案例的研判状态（用户打开抽屉阅读 / 停止 / 出错时调用） */
export function clearAiResearchStatus(caseId: string) {
    setStatus(caseId, null);
}

/** 供 useSyncExternalStore 使用的快照（引用稳定，仅在 persist 时更换） */
export function getAiResearchStatuses(): StatusMap {
    return cache;
}

/** 订阅状态变更 */
export function subscribeAiResearchStatus(onChange: () => void): () => void {
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
}
