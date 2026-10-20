
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { type QimenPalace } from '../QimenChart';
import {
    calculateQimen,
    calculateQimenNow,
    initCspWasm,
    type QimenHeader,
    type PaiPanMethod
} from '../../../../lib/csp-qimen/qimenService';
import { qimenCaseService, caseCustomJu, type QimenCase } from '../../../../services/qimenCaseService';
import { type GlobalPattern } from '../../../../lib/csp-qimen/patternDetector';
import { type PillarKey } from '../QimenJuInfo';
import { getXunKong, ZHI_PALACE_MAP, MA_XING_MAP } from '../utils/qimenInfoUtils';
import { useLayoutMode } from '../../../../hooks/useLayoutMode';
import { useToast } from '../../../../hooks/useToast';
import type { QimenLockedSnapshot } from '../../../../lib/lockedChartStorage';

// 默认空的宫位数据
const EMPTY_PALACES: QimenPalace[] = Array.from({ length: 9 }, (_, i) => ({
    position: i + 1,
    gongName: ['', '坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'][i + 1],
    tianPan: '',
    diPan: '',
    men: '',
    xing: '',
    shen: '',
}));

// 默认信息栏数据
const DEFAULT_HEADER: QimenHeader = {
    solarDate: '',
    lunarDate: '',
    time: '',
    ju: '',
    jieQi: '',
    xunShou: '',
    zhiFu: '',
    zhiShi: '',
    maXing: '',
    kongWang: '',
    siZhu: { year: '', month: '', day: '', hour: '' },
};

interface UseQimenStateOptions {
    lockedSnapshot?: QimenLockedSnapshot;
}

export function useQimenState({ lockedSnapshot }: UseQimenStateOptions = {}) {
    const { isPadLandscape, useDesktopLayout } = useLayoutMode();
    // 删除失败反馈：随返回值下发到侧栏列表（列表壳持有展示位置）
    const { toast, showToast } = useToast();
    const initialLockedSnapshotRef = useRef(lockedSnapshot);
    const initialLockedSnapshot = initialLockedSnapshotRef.current;
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialLockedSnapshot?.selectedCaseId ?? null);
    const [selectedPalace, setSelectedPalace] = useState<number | null>(null);

    // 时间选择器状态
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(() => (
        initialLockedSnapshot ? new Date(initialLockedSnapshot.selectedDate) : new Date()
    ));

    // 新建案例弹窗状态
    const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

    // 真实数据状态
    const [palaces, setPalaces] = useState<QimenPalace[]>(EMPTY_PALACES);
    const [header, setHeader] = useState<QimenHeader>(DEFAULT_HEADER);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paiPanMethod, setPaiPanMethod] = useState<PaiPanMethod>(initialLockedSnapshot?.paiPanMethod ?? 'zhirun');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editingCase, setEditingCase] = useState<QimenCase | null>(null);
    const [currentCase, setCurrentCase] = useState<QimenCase | null>(initialLockedSnapshot?.currentCase ?? null);
    // 全局格局状态
    const [globalPatterns, setGlobalPatterns] = useState<GlobalPattern[]>([]);

    // 全局格局弹窗状态
    const [selectedPattern, setSelectedPattern] = useState<GlobalPattern | null>(null);

    // 自定义局数状态：恢复锁定快照时以案例自身局数为准（局数属于案例，不是页面设置）
    const [customJu, setCustomJu] = useState<number>(() => (
        initialLockedSnapshot?.currentCase
            ? caseCustomJu(initialLockedSnapshot.currentCase)
            : initialLockedSnapshot?.customJu ?? 0
    ));  // 0=自动计算
    const [isCustomJuModalOpen, setIsCustomJuModalOpen] = useState(false);

    // AI 提示词弹窗状态
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    // 移动端宫位显示设置状态（默认显示长生诀与宫位信息，十神默认关闭）
    const [mobileShowChangSheng, setMobileShowChangSheng] = useState(true);
    const [mobileShowShiShen, setMobileShowShiShen] = useState(false);
    const [mobileShowPalaceMeta, setMobileShowPalaceMeta] = useState(true);
    const handleMobileToggleCS = () => {
        if (!mobileShowChangSheng) { setMobileShowChangSheng(true); setMobileShowShiShen(false); }
        else { setMobileShowChangSheng(false); }
    };
    const handleMobileToggleSS = () => {
        if (!mobileShowShiShen) { setMobileShowShiShen(true); setMobileShowChangSheng(false); }
        else { setMobileShowShiShen(false); }
    };
    const handleMobileTogglePM = () => setMobileShowPalaceMeta(!mobileShowPalaceMeta);

    // Pad/移动端抽屉状态
    const [isCaseListOpen, setIsCaseListOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    // 空亡驿马选择状态（默认时柱）
    const [selectedKongWangKey, setSelectedKongWangKey] = useState<PillarKey>('hour');
    const [selectedMaXingKey, setSelectedMaXingKey] = useState<PillarKey>('hour');

    // 动态计算当前选中柱对应的马/空宫位
    const dynamicMaKong = useMemo(() => {
        const siZhu = header.siZhu;
        const pillarMap: Record<PillarKey, string> = {
            year: siZhu.year,
            month: siZhu.month,
            day: siZhu.day,
            hour: siZhu.hour,
        };

        // 计算选中柱的空亡
        const kongGanZhi = pillarMap[selectedKongWangKey];
        const kongStr = getXunKong(kongGanZhi);
        const kongPositions = kongStr.split('').map(z => ZHI_PALACE_MAP[z] || 0).filter(p => p > 0);

        // 计算选中柱的驿马
        const maGanZhi = pillarMap[selectedMaXingKey];
        const maZhi = maGanZhi?.slice(1);
        const maChar = maZhi ? MA_XING_MAP[maZhi] || '' : '';
        const maPosition = maChar ? ZHI_PALACE_MAP[maChar] || 0 : 0;

        return { kongPositions, maPosition };
    }, [header.siZhu, selectedKongWangKey, selectedMaXingKey]);

    // 根据指定日期计算奇门盘
    const calculateQimenByDate = useCallback(async (
        date: Date,
        juOverride?: number,
        methodOverride?: PaiPanMethod,
    ) => {
        setIsLoading(true);
        setError(null);
        setSelectedDate(date);

        // 使用传入的 juOverride 或当前 customJu 状态
        const effectiveJu = juOverride !== undefined ? juOverride : customJu;

        try {
            const result = await calculateQimen({
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
                hour: date.getHours(),
                minute: date.getMinutes(),
            }, methodOverride ?? paiPanMethod, effectiveJu);

            if (result) {
                setPalaces(result.palaces);
                setHeader(result.header);
                setGlobalPatterns(result.globalPatterns);
            } else {
                setError('计算失败');
            }
        } catch (e) {
            console.error('计算奇门盘失败:', e);
            setError('计算失败');
        } finally {
            setIsLoading(false);
        }
    }, [paiPanMethod, customJu]);

    // 计算当前时间的奇门盘
    const calculateNow = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSelectedDate(new Date());
        // 重置自定义局数为自动计算
        setCustomJu(0);

        try {
            const result = await calculateQimenNow(paiPanMethod);
            if (result) {
                setPalaces(result.palaces);
                setHeader(result.header);
                setGlobalPatterns(result.globalPatterns);
            } else {
                setError('计算失败');
            }
        } catch (e) {
            console.error('计算奇门盘失败:', e);
            setError('计算失败');
        } finally {
            setIsLoading(false);
        }
    }, [paiPanMethod]);

    // 上一时辰（减2小时）
    const handlePrevHour = useCallback(async () => {
        const newDate = new Date(selectedDate);
        newDate.setHours(newDate.getHours() - 2);

        // 清除案例选择状态：局数属于案例，离开案例即回到自动局
        setSelectedCaseId(null);
        setCurrentCase(null);
        setCustomJu(0);

        await calculateQimenByDate(newDate, 0);
    }, [selectedDate, calculateQimenByDate]);

    // 下一时辰（加2小时）
    const handleNextHour = useCallback(async () => {
        const newDate = new Date(selectedDate);
        newDate.setHours(newDate.getHours() + 2);

        // 清除案例选择状态：局数属于案例，离开案例即回到自动局
        setSelectedCaseId(null);
        setCurrentCase(null);
        setCustomJu(0);

        await calculateQimenByDate(newDate, 0);
    }, [selectedDate, calculateQimenByDate]);

    /** 选中案例：按案例自身固化的盘式与局数排盘（页面级临时自定义局数不参与） */
    const handleSelectCase = useCallback(async (id: string, caseItem: QimenCase) => {
        setSelectedCaseId(id);
        setCurrentCase(caseItem);
        if (caseItem.pai_pan_method) setPaiPanMethod(caseItem.pai_pan_method);
        const ju = caseCustomJu(caseItem);
        setCustomJu(ju);
        if (caseItem.test_date) {
            await calculateQimenByDate(new Date(caseItem.test_date), ju, caseItem.pai_pan_method);
        }
    }, [calculateQimenByDate]);

    /**
     * 自定义局数只作用于当前案例：有选中案例时写回该案例的 qimen_data.custom_ju，
     * 没选中案例（临时盘）只改本次盘面。
     */
    const handleApplyCustomJu = useCallback(async (ju: number) => {
        setCustomJu(ju);
        if (currentCase) {
            try {
                const updated = await qimenCaseService.updateCase(currentCase.id, {
                    qimen_data: { ...(currentCase.qimen_data ?? {}), custom_ju: ju },
                });
                setCurrentCase(updated);
            } catch (e) {
                console.error(e);
                showToast('局数保存失败', 'error');
            }
        }
        await calculateQimenByDate(selectedDate, ju);
    }, [currentCase, selectedDate, calculateQimenByDate, showToast]);

    // 初始化 WASM 并恢复锁定快照或计算当前时间的盘。
    // 只执行一次：依赖里的 calculateQimenByDate / calculateNow 会随盘式与局数变化重建引用，
    // 若不加守卫，选中案例切换盘式时会重跑初始化，用「当前时间」覆盖掉刚要展示的案例时间。
    // initialLockedSnapshot 本身来自 ref（进程内恒定），不存在需要重新初始化的输入。
    const didInitRef = useRef(false);
    useEffect(() => {
        if (didInitRef.current) return;
        didInitRef.current = true;
        const init = async () => {
            await initCspWasm();
            if (initialLockedSnapshot) {
                await calculateQimenByDate(
                    new Date(initialLockedSnapshot.selectedDate),
                    initialLockedSnapshot.customJu,
                    initialLockedSnapshot.paiPanMethod,
                );
                return;
            }
            await calculateNow();
        };
        init();
    }, [calculateNow, calculateQimenByDate, initialLockedSnapshot]);

    const lockSnapshot = useMemo((): QimenLockedSnapshot => ({
        version: 1,
        capturedAt: new Date().toISOString(),
        selectedCaseId,
        currentCase,
        selectedDate: selectedDate.toISOString(),
        paiPanMethod,
        customJu,
    }), [
        selectedCaseId,
        currentCase,
        selectedDate,
        paiPanMethod,
        customJu,
    ]);

    // 删除案例：左滑即删，无二次确认（与八字/三元侧栏一致，可批量连删）
    const handleDeleteCase = async (id: string) => {
        try {
            await qimenCaseService.deleteCase(id);
            setRefreshTrigger(prev => prev + 1);
            if (selectedCaseId === id) {
                setSelectedCaseId(null);
            }
        } catch (e) {
            console.error(e);
            showToast('删除失败，请重试', 'error');
        }
    };

    // 编辑案例
    const handleEditCase = (caseItem: QimenCase) => {
        setEditingCase(caseItem);
        setIsNewCaseModalOpen(true);
    };

    return {
        // App settings
        isPadLandscape,
        useDesktopLayout,

        // Basic states
        palaces,
        header,
        globalPatterns,
        isLoading,
        error,

        // App Methods
        calculateNow,
        calculateQimenByDate,
        handlePrevHour,
        handleNextHour,
        handleSelectCase,
        handleApplyCustomJu,
        handleDeleteCase,
        handleEditCase,
        /** 删除等操作失败的反馈状态（各端列表壳经 feedback 消费） */
        caseListToast: toast,

        // Form & Params
        paiPanMethod, setPaiPanMethod,
        selectedDate, setSelectedDate,
        customJu, setCustomJu,

        // Case state
        selectedCaseId, setSelectedCaseId,
        currentCase, setCurrentCase,
        editingCase, setEditingCase,
        refreshTrigger, setRefreshTrigger,

        // Info Modals
        selectedPalace, setSelectedPalace,
        selectedPattern, setSelectedPattern,

        // Modal toggles
        isDatePickerOpen, setIsDatePickerOpen,
        isNewCaseModalOpen, setIsNewCaseModalOpen,
        isCustomJuModalOpen, setIsCustomJuModalOpen,
        isAiModalOpen, setIsAiModalOpen,

        // Misc mobile / pad
        mobileShowChangSheng, setMobileShowChangSheng,
        mobileShowShiShen, setMobileShowShiShen,
        mobileShowPalaceMeta, setMobileShowPalaceMeta,
        handleMobileToggleCS, handleMobileToggleSS, handleMobileTogglePM,
        isCaseListOpen, setIsCaseListOpen,
        isInfoOpen, setIsInfoOpen,

        selectedKongWangKey, setSelectedKongWangKey,
        selectedMaXingKey, setSelectedMaXingKey,
        dynamicMaKong,
        lockSnapshot,
    };
}
