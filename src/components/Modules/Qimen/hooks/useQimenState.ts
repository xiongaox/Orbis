/**
 * useQimenState - 应用源码层
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
 * - `useQimenState`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `QimenChart`、内部模块 `qimenCaseService` 等 7 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { type QimenPalace } from '../QimenChart';
import {
    calculateQimen,
    calculateQimenNow,
    initCspWasm,
    type QimenHeader,
    type PaiPanMethod
} from '../../../../lib/csp-qimen/qimenService';
import { qimenCaseService, type QimenCase } from '../../../../services/qimenCaseService';
import { type GlobalPattern } from '../../../../lib/csp-qimen/patternDetector';
import { type PillarKey } from '../QimenJuInfo';
import { getXunKong, ZHI_PALACE_MAP, MA_XING_MAP } from '../utils/qimenInfoUtils';
import { useLayoutMode } from '../../../../hooks/useLayoutMode';

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

export function useQimenState() {
    const { isPadLandscape, useDesktopLayout } = useLayoutMode();
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [selectedPalace, setSelectedPalace] = useState<number | null>(null);

    // 时间选择器状态
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // 新建案例弹窗状态
    const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

    // 真实数据状态
    const [palaces, setPalaces] = useState<QimenPalace[]>(EMPTY_PALACES);
    const [header, setHeader] = useState<QimenHeader>(DEFAULT_HEADER);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paiPanMethod, setPaiPanMethod] = useState<PaiPanMethod>('zhirun');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editingCase, setEditingCase] = useState<QimenCase | null>(null);
    const [currentCase, setCurrentCase] = useState<QimenCase | null>(null);
    // 全局格局状态
    const [globalPatterns, setGlobalPatterns] = useState<GlobalPattern[]>([]);

    // 全局格局弹窗状态
    const [selectedPattern, setSelectedPattern] = useState<GlobalPattern | null>(null);

    // 自定义局数状态
    const [customJu, setCustomJu] = useState<number>(0);  // 0=自动计算
    const [isCustomJuModalOpen, setIsCustomJuModalOpen] = useState(false);

    // AI 提示词弹窗状态
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    // 移动端宫位显示设置状态
    const [mobileShowChangSheng, setMobileShowChangSheng] = useState(false);
    const [mobileShowShiShen, setMobileShowShiShen] = useState(false);
    const [mobileShowPalaceMeta, setMobileShowPalaceMeta] = useState(false);
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
    const calculateQimenByDate = useCallback(async (date: Date, juOverride?: number) => {
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
            }, paiPanMethod, effectiveJu);

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

        // 清除案例选择状态
        setSelectedCaseId(null);
        setCurrentCase(null);

        await calculateQimenByDate(newDate);
    }, [selectedDate, calculateQimenByDate]);

    // 下一时辰（加2小时）
    const handleNextHour = useCallback(async () => {
        const newDate = new Date(selectedDate);
        newDate.setHours(newDate.getHours() + 2);

        // 清除案例选择状态
        setSelectedCaseId(null);
        setCurrentCase(null);

        await calculateQimenByDate(newDate);
    }, [selectedDate, calculateQimenByDate]);

    // 初始化 WASM 并计算当前时间的盘
    useEffect(() => {
        const init = async () => {
            await initCspWasm();
            await calculateNow();
        };
        init();
    }, [calculateNow]);

    // 删除案例
    const handleDeleteCase = async (id: string) => {
        if (!window.confirm('确定要删除这个案例吗？')) return;
        try {
            await qimenCaseService.deleteCase(id);
            setRefreshTrigger(prev => prev + 1);
            if (selectedCaseId === id) {
                setSelectedCaseId(null);
            }
        } catch (e) {
            console.error(e);
            alert('删除失败');
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
        handleDeleteCase,
        handleEditCase,

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
    };
}
