/**
 * 奇门遁甲模块 - 主页面容器
 * 三栏布局：左侧案例列表、中间九宫盘式、右侧宫位详情
 * 响应式设计：大屏全展开，中等屏幕变窄，小屏幕折叠侧边栏
 */
import { useState, useEffect, useCallback } from 'react';
import QimenCaseList from './QimenCaseList';
import QimenChart, { type QimenPalace } from './QimenChart';
import QimenPalaceDetail from './QimenPalaceDetail';
import AdvancedDatePicker from '../../Common/AdvancedDatePicker';
import QimenNewCaseModal from './QimenNewCaseModal';
import {
    calculateQimen,
    calculateQimenNow,
    initCspWasm,
    type QimenHeader,
    type PaiPanMethod
} from '../../../lib/csp-qimen/qimenService';
import { qimenCaseService, type QimenCase } from '../../../services/qimenCaseService';

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
    xunShou: '',
    zhiFu: '',
    zhiShi: '',
    maXing: '',
    kongWang: '',
    siZhu: { year: '', month: '', day: '', hour: '' },
};

export default function QimenPage() {
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

    // 根据指定日期计算奇门盘
    const calculateQimenByDate = useCallback(async (date: Date) => {
        setIsLoading(true);
        setError(null);
        setSelectedDate(date);

        try {
            const result = await calculateQimen({
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
                hour: date.getHours(),
                minute: date.getMinutes(),
            }, paiPanMethod);

            if (result) {
                setPalaces(result.palaces);
                setHeader(result.header);
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

    // 计算当前时间的奇门盘
    const calculateNow = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSelectedDate(new Date());

        try {
            const result = await calculateQimenNow(paiPanMethod);
            if (result) {
                setPalaces(result.palaces);
                setHeader(result.header);
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
        console.log('handlePrevHour called, current:', selectedDate);
        const newDate = new Date(selectedDate);
        newDate.setHours(newDate.getHours() - 2);
        console.log('new date:', newDate);
        await calculateQimenByDate(newDate);
    }, [selectedDate, calculateQimenByDate]);

    // 下一时辰（加2小时）
    const handleNextHour = useCallback(async () => {
        console.log('handleNextHour called, current:', selectedDate);
        const newDate = new Date(selectedDate);
        newDate.setHours(newDate.getHours() + 2);
        console.log('new date:', newDate);
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
                // Optionally clear chart or reset to now
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

    // 获取选中的宫位数据
    const selectedPalaceData = selectedPalace
        ? palaces.find(p => p.position === selectedPalace) || null
        : null;

    return (
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
            {/* 左侧案例列表 */}
            <div className="w-72 xl:w-80 2xl:w-96 flex-shrink-0 overflow-hidden hidden lg:block">
                <QimenCaseList
                    selectedCaseId={selectedCaseId}
                    onSelectCase={(id, caseItem) => {
                        setSelectedCaseId(id);
                        if (caseItem.test_date) {
                            calculateQimenByDate(new Date(caseItem.test_date));
                        }
                    }}
                    onOpenDatePicker={() => {
                        setEditingCase(null);
                        setIsNewCaseModalOpen(true);
                    }}
                    onDeleteCase={handleDeleteCase}
                    onEditCase={handleEditCase}
                    refreshTrigger={refreshTrigger}
                />
            </div>

            {/* 中间九宫盘式 */}
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col p-4 lg:p-6 relative">
                {/* 加载状态 */}
                {isLoading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-20">
                        <div className="text-muted-foreground">正在计算...</div>
                    </div>
                )}

                {/* 错误状态 */}
                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-destructive/10 text-destructive px-4 py-2 rounded-lg z-20">
                        {error}
                    </div>
                )}

                <QimenChart
                    palaces={palaces}
                    header={header}
                    selectedPalace={selectedPalace}
                    onSelectPalace={setSelectedPalace}
                    onPrevHour={handlePrevHour}
                    onNextHour={handleNextHour}
                    method={paiPanMethod}
                    onMethodChange={setPaiPanMethod}
                    onResetToNow={calculateNow}
                    onOpenDatePicker={() => setIsDatePickerOpen(true)}
                />
            </main>

            {/* 右侧宫位详情 */}
            <div className="w-72 xl:w-80 2xl:w-96 flex-shrink-0 overflow-hidden hidden xl:block">
                <QimenPalaceDetail palace={selectedPalaceData} />
            </div>

            {/* 时间选择器弹窗 */}
            <AdvancedDatePicker
                value={selectedDate}
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                onConfirm={(date) => {
                    setIsDatePickerOpen(false);
                    calculateQimenByDate(date);
                }}
            />

            {/* 新建/编辑案例弹窗 */}
            {isNewCaseModalOpen && (
                <QimenNewCaseModal
                    key={editingCase ? `edit-${editingCase.id}` : 'new'} // Force remount on mode change
                    isOpen={isNewCaseModalOpen}
                    initialData={editingCase}
                    onClose={() => {
                        setIsNewCaseModalOpen(false);
                        setEditingCase(null);
                    }}
                    onConfirm={(data) => {
                        console.log('案例保存成功:', data);
                        setIsNewCaseModalOpen(false);
                        setEditingCase(null);
                        // 创建后直接跳转到该时间起盘
                        calculateQimenByDate(data.date);
                        // 刷新列表
                        setRefreshTrigger(prev => prev + 1);
                    }}
                />
            )}
        </div>
    );
}
