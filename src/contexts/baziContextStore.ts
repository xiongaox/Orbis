import { createContext } from 'react';
import type { BaziApiResponse } from '../types/bazi';
import type { Case } from '../types';

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
    initializeBazi: () => void;
}

export const BaziContext = createContext<BaziContextValue | null>(null);
