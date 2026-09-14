export interface PublicCaseEntry {
    id: string;
    title: string;
    domain: 'bazi' | 'qimen';
    author_key: string;
    author_name: string;
    category: string;
    summary: string;
}

export interface CasesStatus {
    is_activated: boolean;
    total: number;
    version?: string;
}

export interface CasePackProgress {
    phase: 'verifying' | 'decrypting' | 'importing' | 'done';
    percent: number | null;
    message: string;
}

async function invokeDesktop<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke, isTauri } = await import('@tauri-apps/api/core');
    if (!isTauri()) {
        throw new Error('离线加密案例库仅支持 Orbis 桌面端，请在桌面应用中打开');
    }
    return invoke<T>(command, args);
}

export const publicCaseLibraryService = {
    async getStatus(): Promise<CasesStatus> {
        return invokeDesktop<CasesStatus>('get_cases_status');
    },
    async getMachineId(): Promise<string> {
        return invokeDesktop<string>('get_machine_id');
    },
    async activate(licenseCode: string): Promise<number> {
        return invokeDesktop<number>('activate_cases', { licenseCode: licenseCode.trim() });
    },
    /** 作者管理密码激活（面对面场景）。 */
    async activateWithMasterPassword(password: string): Promise<number> {
        return invokeDesktop<number>('activate_with_master_password', { password: password.trim() });
    },
    /** 管理员版才可用：应用内为机器码签发激活码。 */
    async isSigningAvailable(): Promise<boolean> {
        return invokeDesktop<boolean>('is_signing_available');
    },
    async signActivationCode(machineId: string, unlockPassword: string): Promise<string> {
        return invokeDesktop<string>('sign_activation_code', { machineId: machineId.trim().toUpperCase(), unlockPassword });
    },
    async getEntries(): Promise<PublicCaseEntry[]> {
        return invokeDesktop<PublicCaseEntry[]>('get_case_list');
    },
    async getContent(id: string): Promise<string> {
        return invokeDesktop<string>('get_case_content', { id });
    },
    async getAuthorProfile(authorKey: string): Promise<string> {
        return invokeDesktop<string>('get_author_profile', { authorKey });
    },
    /** 订阅激活下载进度事件；返回取消订阅函数。 */
    async onProgress(handler: (progress: CasePackProgress) => void): Promise<() => void> {
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen<CasePackProgress>('case-pack-progress', (event) => handler(event.payload));
        return unlisten;
    },
};
