/**
 * 奇门遁甲模块 - 主页面容器
 * 三栏布局：左侧案例列表、中间九宫盘式、右侧宫位详情
 * 响应式设计：大屏全展开，中等屏幕变窄，小屏幕折叠侧边栏
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import QimenCaseList from './QimenCaseList';
import QimenChart, { type QimenPalace } from './QimenChart';
import QimenPalaceDetail from './QimenPalaceDetail';
import AdvancedDatePicker from '../../Common/AdvancedDatePicker';
import QimenNewCaseModal from './QimenNewCaseModal';
import QimenJuInfo, { type PillarKey } from './QimenJuInfo';
import {
    calculateQimen,
    calculateQimenNow,
    initCspWasm,
    type QimenHeader,
    type PaiPanMethod
} from '../../../lib/csp-qimen/qimenService';
import { qimenCaseService, type QimenCase } from '../../../services/qimenCaseService';
import { type GlobalPattern } from '../../../lib/csp-qimen/patternDetector';
import { QimenDataService } from '../../../lib/csp-qimen/qimenDataService';
import CustomJuModal from './components/CustomJuModal';
import QimenAiPromptModal from './QimenAiPromptModal';

// 方法标签映射
const METHOD_LABELS: Record<PaiPanMethod, string> = {
    'zhirun': '时家转盘置润法',
    'yinpan': '时家转盘阴盘法',
    'chaibu': '时家转盘拆补法',
    'maoshan': '时家茅山法',
};

// 地支到宫位映射
const ZHI_PALACE_MAP: Record<string, number> = {
    '子': 1, '丑': 8, '寅': 3, '卯': 3, '辰': 4, '巳': 4,
    '午': 9, '未': 2, '申': 6, '酉': 7, '戌': 6, '亥': 1,
};

// 驿马查找表
const MA_XING_MAP: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '寅': '申', '午': '申', '戌': '申',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳',
};

// 旬空计算
const getXunKong = (ganZhi: string) => {
    if (!ganZhi) return '';
    const gan = ganZhi.substring(0, 1);
    const zhi = ganZhi.substring(1, 2);
    const ganMap: Record<string, number> = { '甲': 1, '乙': 2, '丙': 3, '丁': 4, '戊': 5, '己': 6, '庚': 7, '辛': 8, '壬': 9, '癸': 10 };
    const zhiMap: Record<string, number> = { '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6, '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12 };
    const g = ganMap[gan] || 0;
    const z = zhiMap[zhi] || 0;
    const diff = (z - g + 12) % 12;
    const kongMap: Record<number, string> = {
        0: '戌亥', 2: '子丑', 4: '寅卯', 6: '辰巳', 8: '午未', 10: '申酉'
    };
    return kongMap[diff] || '';
};

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
        const maZhi = maGanZhi.slice(1);
        const maChar = MA_XING_MAP[maZhi] || '';
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
        console.log('handlePrevHour called, current:', selectedDate);
        const newDate = new Date(selectedDate);
        newDate.setHours(newDate.getHours() - 2);
        console.log('new date:', newDate);

        // 清除案例选择状态
        setSelectedCaseId(null);
        setCurrentCase(null);

        await calculateQimenByDate(newDate);
    }, [selectedDate, calculateQimenByDate]);

    // 下一时辰（加2小时）
    const handleNextHour = useCallback(async () => {
        console.log('handleNextHour called, current:', selectedDate);
        const newDate = new Date(selectedDate);
        newDate.setHours(newDate.getHours() + 2);
        console.log('new date:', newDate);

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
        <div className="flex flex-1 h-full min-h-0 overflow-hidden relative">
            {/* 左侧案例列表 */}
            <div className="w-72 xl:w-80 2xl:w-96 flex-shrink-0 overflow-hidden">
                <QimenCaseList
                    selectedCaseId={selectedCaseId}
                    onSelectCase={(id, caseItem) => {
                        setSelectedCaseId(id);
                        setCurrentCase(caseItem); // Save full case object for info panel
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
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col p-6 relative">
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
                    onSelectPalace={(position) => setSelectedPalace(position === selectedPalace ? null : position)}
                    onPrevHour={handlePrevHour}
                    onNextHour={handleNextHour}
                    method={paiPanMethod}
                    onMethodChange={setPaiPanMethod}
                    onResetToNow={calculateNow}
                    onOpenDatePicker={() => setIsDatePickerOpen(true)}
                    onJuClick={() => setIsCustomJuModalOpen(true)}
                    globalPatterns={globalPatterns}
                    onPatternClick={setSelectedPattern}
                    onOpenAiModal={() => setIsAiModalOpen(true)}
                    dynamicMaKong={dynamicMaKong}
                />
            </main>

            {/* 右侧宫位详情 */}
            <div className="w-72 xl:w-80 2xl:w-96 flex-shrink-0 min-h-0 overflow-hidden flex flex-col border-l border-border/50 bg-card/10">
                {selectedPalaceData ? (
                    <QimenPalaceDetail
                        palace={selectedPalaceData}
                        timeZhi={header?.siZhu?.hour?.slice(1, 2)}
                        zhiShiMen={header?.zhiShi ? header.zhiShi + '门' : ''}
                        zhiFuXing={header?.zhiFu}
                        siZhu={header?.siZhu}
                        xunShou={header?.xunShou}
                    />
                ) : (
                    <QimenJuInfo
                        date={selectedDate}
                        header={header}
                        caseData={currentCase}
                        onCaseUpdated={(updatedCase) => {
                            setCurrentCase(updatedCase);
                            setRefreshTrigger(prev => prev + 1);
                        }}
                        selectedKongWangKey={selectedKongWangKey}
                        selectedMaXingKey={selectedMaXingKey}
                        onKongWangKeyChange={setSelectedKongWangKey}
                        onMaXingKeyChange={setSelectedMaXingKey}
                    />
                )}
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

            {/* 全局格局详情弹窗 */}
            {selectedPattern && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* 背景遮罩 */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSelectedPattern(null)}
                    />
                    {/* 弹窗内容 */}
                    <div className="relative bg-card rounded-xl border border-border shadow-2xl w-[90vw] max-w-lg max-h-[80vh] overflow-hidden">
                        {/* 头部 */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-foreground">
                                    {selectedPattern.fullLabel}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedPattern(null)}
                                className="p-1 hover:bg-muted rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>
                        {/* 内容 */}
                        <div className="p-5 overflow-y-auto max-h-[60vh] text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-serif">
                            {(() => {
                                const data = QimenDataService.getJuPattern(selectedPattern.name);
                                if (!data) return '暂无详细数据。';

                                // 定义核心字段顺序
                                const coreFields = ['定义', '原文', '含义', '总论'];
                                // 定义尾部字段顺序
                                const tailFields = ['应用', '详解', '注意', '特别注意', '参考'];

                                // 获取所有数据字段，过滤掉 name
                                const allKeys = Object.keys(data).filter(k => k !== 'name' && typeof data[k] === 'string');

                                // 剩余字段（既不在核心也不在尾部）
                                const otherKeys = allKeys.filter(k => !coreFields.includes(k) && !tailFields.includes(k));

                                // 最终显示顺序：核心 -> 其他 -> 尾部
                                const displayKeys = [
                                    ...coreFields.filter(k => allKeys.includes(k)),
                                    ...otherKeys,
                                    ...tailFields.filter(k => allKeys.includes(k))
                                ];

                                const sections = displayKeys.map(key => {
                                    const value = data[key];
                                    if (!value) return null;
                                    return (
                                        <div key={key} className="mb-5 last:mb-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1 h-3.5 bg-primary/80 rounded-full" />
                                                <div className="text-base font-bold text-foreground font-serif">
                                                    {key}
                                                </div>
                                            </div>
                                            <div className="whitespace-pre-wrap leading-relaxed text-secondary-foreground/60 font-normal pl-3 text-base">
                                                {value}
                                            </div>
                                        </div>
                                    );
                                }).filter(Boolean);

                                return sections.length > 0 ? sections : '暂无详细数据。';
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* 自定义局数弹窗 */}
            <CustomJuModal
                isOpen={isCustomJuModalOpen}
                currentJu={header.ju}
                onClose={() => setIsCustomJuModalOpen(false)}
                onConfirm={(newCustomJu) => {
                    setCustomJu(newCustomJu);
                    setIsCustomJuModalOpen(false);
                    // 使用新的自定义局数重新排盘
                    calculateQimenByDate(selectedDate, newCustomJu);
                }}
            />

            {/* AI 提示词弹窗 */}
            <QimenAiPromptModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                header={header}
                palaces={palaces}
                globalPatterns={globalPatterns}
                selectedPalace={selectedPalace}
                methodLabel={METHOD_LABELS[paiPanMethod]}
            />
        </div>
    );
}
