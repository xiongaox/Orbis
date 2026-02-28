import { type QimenPalace } from '../QimenChart';
import { type QimenHeader, type PaiPanMethod } from '../../../../lib/csp-qimen/qimenService';
import { type GlobalPattern } from '../../../../lib/csp-qimen/patternDetector';
import { type QimenCase } from '../../../../services/qimenCaseService';
import { type PillarKey } from '../QimenJuInfo';

export interface QimenLayoutProps {
    // 基础数据
    palaces: QimenPalace[];
    header: QimenHeader;
    globalPatterns: GlobalPattern[];
    isLoading: boolean;
    error: string | null;
    currentCase: QimenCase | null;

    // 排盘参数与时间
    paiPanMethod: PaiPanMethod;
    setPaiPanMethod: (m: PaiPanMethod) => void;
    selectedDate: Date;
    calculateNow: () => void;
    calculateQimenByDate: (d: Date) => void;
    handlePrevHour: () => void;
    handleNextHour: () => void;

    // 案例状态
    selectedCaseId: string | null;
    setSelectedCaseId: (id: string | null) => void;
    setCurrentCase: (c: QimenCase | null) => void;
    handleDeleteCase: (id: string) => Promise<void>;
    handleEditCase: (c: QimenCase) => void;
    refreshTrigger: number;
    setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;

    // UI 选中与弹窗开关
    selectedPalace: number | null;
    setSelectedPalace: (p: number | null) => void;
    setIsDatePickerOpen: (v: boolean) => void;
    setIsNewCaseModalOpen: (v: boolean) => void;
    setEditingCase: (c: QimenCase | null) => void;
    setIsCustomJuModalOpen: (v: boolean) => void;
    setSelectedPattern: (p: GlobalPattern | null) => void;
    setIsAiModalOpen: (v: boolean) => void;

    // 宫位动态马空
    selectedKongWangKey: PillarKey;
    setSelectedKongWangKey: (k: PillarKey) => void;
    selectedMaXingKey: PillarKey;
    setSelectedMaXingKey: (k: PillarKey) => void;
    dynamicMaKong: { kongPositions: number[]; maPosition: number; };

    // 移动/Pad 端侧边栏与显示参数
    isCaseListOpen: boolean;
    setIsCaseListOpen: (v: boolean) => void;
    isInfoOpen: boolean;
    setIsInfoOpen: (v: boolean) => void;
    mobileShowChangSheng: boolean;
    mobileShowShiShen: boolean;
    mobileShowPalaceMeta: boolean;
    handleMobileToggleCS: () => void;
    handleMobileToggleSS: () => void;
    handleMobileTogglePM: () => void;
}
