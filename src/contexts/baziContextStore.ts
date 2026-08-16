/**
 * baziContextStore - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载前端具体功能
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `BaziContextValue`, `BaziContext`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `bazi`、内部模块 `types`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { createContext } from 'react';
import type { BaziApiResponse } from '../types/bazi';
import type { Case } from '../types';
import type { BaziLockedSnapshot } from '../lib/lockedChartStorage';

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
    getLockedSnapshot: () => BaziLockedSnapshot;
    restoreLockedSnapshot: (snapshot: BaziLockedSnapshot) => Promise<void>;
    initializeBazi: () => void;
}

export const BaziContext = createContext<BaziContextValue | null>(null);
