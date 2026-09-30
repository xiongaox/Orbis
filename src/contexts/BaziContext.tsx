/* eslint-disable react-refresh/only-export-components -- context 定义、Provider 与消费 hook 同文件是 React 惯例；拆回多文件仅为迁就 HMR 导出检查，属过度分层 */
import { createContext, useContext, type ReactNode } from 'react';
import type { BaziApiResponse } from '../types/bazi';
import type { Case } from '../types';
import type { BaziLockedSnapshot } from '../lib/lockedChartStorage';
import { useBazi } from '../hooks/useBazi';

export interface BaziContextValue {
    selectedCaseId: string | null;
    selectedCase: Case | null;
    baziData: BaziApiResponse | null;
    loading: boolean;
    error: string | null;
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    selectedLiuYueIndex: number | null;
    setSelectedDaYunIndex: (index: number | null) => void;
    setSelectedLiuNianYear: (year: number | null) => void;
    setSelectedLiuYueIndex: (index: number | null) => void;
    handleSelectCase: (caseId: string | null) => void;
    handleSetTransientCase: (caseData: Case) => void;
    handleShiftShiChen: (delta: 1 | -1) => void;
    getLockedSnapshot: () => BaziLockedSnapshot;
    restoreLockedSnapshot: (snapshot: BaziLockedSnapshot) => Promise<void>;
    initializeBazi: () => void;
}

const BaziContext = createContext<BaziContextValue | null>(null);

/** 八字状态提供者：包裹需要访问八字状态的组件树 */
export function BaziProvider({ children }: { children: ReactNode }) {
    const baziState = useBazi();

    return (
        <BaziContext.Provider value={baziState}>
            {children}
        </BaziContext.Provider>
    );
}

export function useBaziContext(): BaziContextValue {
    const context = useContext(BaziContext);
    if (!context) {
        throw new Error('useBaziContext must be used within a BaziProvider');
    }
    return context;
}
