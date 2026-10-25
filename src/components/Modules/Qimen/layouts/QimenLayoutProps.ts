
import { type QimenPalace } from '../QimenChart';
import { type QimenHeader, type PaiPanMethod } from '../../../../lib/csp-qimen/qimenService';
import { type GlobalPattern } from '../../../../lib/csp-qimen/patternDetector';
import { type QimenCase } from '../../../../services/qimenCaseService';
import { type PillarKey } from '../QimenJuInfo';
import { type ToastState } from '../../../../hooks/useToast';

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
    calculateQimenByDate: (d: Date, juOverride?: number, methodOverride?: PaiPanMethod) => void;
    handlePrevHour: () => void;
    handleNextHour: () => void;
    /** 选中案例：按案例自身固化的盘式与局数排盘 */
    handleSelectCase: (id: string, caseItem: QimenCase) => Promise<void>;
    /** 自定义局数：有选中案例时写回该案例，否则只改当前盘 */
    handleApplyCustomJu: (ju: number) => Promise<void>;

    // 案例状态
    selectedCaseId: string | null;
    setSelectedCaseId: (id: string | null) => void;
    setCurrentCase: (c: QimenCase | null) => void;
    handleDeleteCase: (id: string) => Promise<void>;
    handleEditCase: (c: QimenCase) => void;
    refreshTrigger: number;
    setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
    /** 删除失败反馈：经侧栏列表壳的 feedback 展示 */
    caseListToast: ToastState | null;

    // UI 选中与弹窗开关
    selectedPalace: number | null;
    setSelectedPalace: (p: number | null) => void;
    setIsDatePickerOpen: (v: boolean) => void;
    setIsNewCaseModalOpen: (v: boolean) => void;
    setEditingCase: (c: QimenCase | null) => void;
    setIsCustomJuModalOpen: (v: boolean) => void;
    setSelectedPattern: (p: GlobalPattern | null) => void;
    setIsAiModalOpen: (v: boolean) => void;

    /** 终身局「保存」：非空时局信息区「说明」旁显示保存按钮（仅八字跳入的临时局存在） */
    onSaveLifePan?: () => void;

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
