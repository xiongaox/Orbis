/**
 * CaseStudyLayoutProps - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `CaseStudyLayoutProps`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `bazi`、内部模块 `useCaseStudy` 等 5 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import type { RefObject, Dispatch, SetStateAction } from 'react';
import type { BaziApiResponse } from '../../../../types/bazi';
import type { CaseItem } from '../hooks/useCaseStudy';
import type { PaiPanMethod, QimenResult } from '../../../../lib/csp-qimen/qimenService';
import type { useDuanFa } from '../hooks/useDuanFa';

export interface CaseStudyLayoutProps {
    // 基础设备状态
    useDesktopLayout: boolean;
    isPadLandscape: boolean;
    isMobile: boolean;
    isAuthenticated: boolean;

    // 通用案例状态
    allCases: CaseItem[];
    displayCases: CaseItem[];
    filteredCases: CaseItem[];
    activeCase: CaseItem | null | undefined;
    authorIntroContent: string | null;

    // 列表分页与选中
    currentPage: number;
    totalPages: number;
    setCurrentPage: (p: number) => void;

    // 搜与过滤
    selectedCategory: string;
    setSelectedCategory: (c: string) => void;
    selectedDayMaster: string;
    handleSelectDayMaster: (dm: string) => void;
    searchTerm: string;
    setSearchTerm: (t: string) => void;

    // 案例选择与切换
    selectedCaseId: string | null;
    handleSelectCase: (id: string) => void;
    selectedAuthor: string | null;
    handleSelectAuthor: (a: string) => void;

    // 排盘图切换
    activeChartIndex: number;
    setActiveChartIndex: (i: number) => void;
    chartCount: number;

    // 八字状态
    baziData: BaziApiResponse | null;
    selectedDaYunIndex: number | null;
    setSelectedDaYunIndex: (i: number | null) => void;
    selectedLiuNianYear: number | null;
    setSelectedLiuNianYear: (y: number | null) => void;

    // 奇门状态
    qimenResult: QimenResult | null;
    qimenMethod: PaiPanMethod;
    setQimenMethod: Dispatch<SetStateAction<PaiPanMethod>>;

    // 断法系统状态
    duanFa: ReturnType<typeof useDuanFa>;

    // 抽屉弹窗统筹开关
    isLeftPanelOpen: boolean;
    setIsLeftPanelOpen: (v: boolean) => void;
    isChartPanelOpen: boolean;
    setIsChartPanelOpen: (v: boolean) => void;
    setIsJuDialogOpen: (v: boolean) => void;
    setIsLearningPanelOpen: (v: boolean) => void;

    // 滚动区域同步状态 (内容区与断法区)
    contentScrollRef: RefObject<HTMLDivElement | null>;
    duanFaContentRef: RefObject<HTMLDivElement | null>;

    // 同步阅读进度 (基础)
    savedProgress: number;
    currentProgress: number;
    restoreProgress: () => void;

    // 同步阅读进度 (断法)
    duanFaSavedProgress: number;
    duanFaCurrentProgress: number;
    duanFaRestoreProgress: () => void;
}
