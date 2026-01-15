/**
 * BaziContext - 八字模块状态上下文
 * 解决 Prop Drilling 问题，让子组件直接访问八字状态
 */
import { createContext, useContext, type ReactNode } from 'react';
import { useBazi } from '../hooks/useBazi';
import type { BaziApiResponse } from '../types/bazi';
import type { Case } from '../types';

// Context 值类型
interface BaziContextValue {
    // 状态
    selectedCaseId: string | null;
    selectedCase: Case | null;
    baziData: BaziApiResponse | null;
    loading: boolean;
    error: string | null;
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    selectedLiuYueIndex: number | null;
    // 操作
    setSelectedDaYunIndex: (index: number | null) => void;
    setSelectedLiuNianYear: (year: number | null) => void;
    setSelectedLiuYueIndex: (index: number | null) => void;
    handleSelectCase: (caseId: string | null) => void;
    initializeBazi: () => void;
}

// 创建上下文
const BaziContext = createContext<BaziContextValue | null>(null);

// Provider Props
interface BaziProviderProps {
    children: ReactNode;
}

/**
 * BaziProvider - 八字状态提供者
 * 包裹需要访问八字状态的组件树
 */
export function BaziProvider({ children }: BaziProviderProps) {
    const baziState = useBazi();

    return (
        <BaziContext.Provider value={baziState}>
            {children}
        </BaziContext.Provider>
    );
}

/**
 * useBaziContext - 获取八字状态的 Hook
 * 必须在 BaziProvider 内部使用
 */
export function useBaziContext(): BaziContextValue {
    const context = useContext(BaziContext);
    if (!context) {
        throw new Error('useBaziContext must be used within a BaziProvider');
    }
    return context;
}

// 导出上下文（用于测试或特殊场景）
export { BaziContext };
