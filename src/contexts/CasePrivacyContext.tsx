/**
 * 案例隐私开关：跨模块共享一个「隐藏」状态。
 *
 * 为什么放 context 而不是各页面自己 useState：
 * 需求是「列表里点了隐藏，点开这条案例后命主名字也要打码」——
 * 列表壳（BaseCaseList）和详情（各模块的盘面/详情区）是两棵不同的子树，
 * 状态放在任何一侧都传不到另一侧；放顶层则八字/奇门/三元自动一致。
 *
 * 这里不抛「必须在 Provider 内使用」：默认返回关闭态即可，
 * 单独渲染某个卡片的测试/预览不必为它包一层 Provider。
 */
/* eslint-disable react-refresh/only-export-components -- context 定义、Provider 与读取 hook 同文件是 React 惯例；拆回多文件仅为迁就 HMR 导出检查，属过度分层（同 BaziContext / MobileNavContext） */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface CasePrivacyContextValue {
    /** 是否处于隐藏（打码）状态 */
    isPrivacyMode: boolean;
    togglePrivacy: () => void;
}

const STORAGE_KEY = 'orbis_case_privacy';

/** 读取持久化的隐藏开关；存储不可用时按「不隐藏」处理 */
function readStoredPrivacy(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

const CasePrivacyContext = createContext<CasePrivacyContextValue>({
    isPrivacyMode: false,
    togglePrivacy: () => {},
});

export function CasePrivacyProvider({ children }: { children: ReactNode }) {
    // 初值直接读存储：隐藏状态跨刷新/重启保持，必须手动关闭才恢复明文
    const [isPrivacyMode, setIsPrivacyMode] = useState(readStoredPrivacy);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, isPrivacyMode ? '1' : '0');
        } catch {
            // 存储不可用时静默降级：本次会话内状态仍在
        }
    }, [isPrivacyMode]);

    const togglePrivacy = useCallback(() => setIsPrivacyMode((current) => !current), []);
    const value = useMemo<CasePrivacyContextValue>(
        () => ({ isPrivacyMode, togglePrivacy }),
        [isPrivacyMode, togglePrivacy],
    );
    return <CasePrivacyContext.Provider value={value}>{children}</CasePrivacyContext.Provider>;
}

export function useCasePrivacy(): CasePrivacyContextValue {
    return useContext(CasePrivacyContext);
}
