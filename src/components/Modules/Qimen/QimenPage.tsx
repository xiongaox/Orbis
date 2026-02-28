/**
 * 奇门遁甲模块 - 主页面容器
 * 分流到桌面端、Pad 端和移动端不同布局
 */
import AdvancedDatePicker from '../../Common/AdvancedDatePicker';
import QimenNewCaseModal from './QimenNewCaseModal';
import { type PaiPanMethod } from '../../../lib/csp-qimen/qimenService';
import { QimenDataService } from '../../../lib/csp-qimen/qimenDataService';
import CustomJuModal from './components/CustomJuModal';
import QimenAiPromptModal from './QimenAiPromptModal';
import { useQimenState } from './hooks/useQimenState';

import QimenDesktopLayout from './layouts/QimenDesktopLayout';
import QimenPadLayout from './layouts/QimenPadLayout';
import QimenMobileLayout from './layouts/QimenMobileLayout';

const METHOD_LABELS: Record<PaiPanMethod, string> = {
    'zhirun': '时家转盘置润法',
    'yinpan': '时家转盘阴盘法',
    'chaibu': '时家转盘拆补法',
    'maoshan': '时家茅山法',
};

export default function QimenPage() {
    const qimenState = useQimenState();

    // Destructure needed values for outer modals
    const {
        useDesktopLayout, isPadLandscape,
        selectedDate, isDatePickerOpen, setIsDatePickerOpen, calculateQimenByDate,
        isNewCaseModalOpen, editingCase, setIsNewCaseModalOpen, setEditingCase, setRefreshTrigger,
        selectedPattern, setSelectedPattern,
        isCustomJuModalOpen, setIsCustomJuModalOpen, header, setCustomJu,
        isAiModalOpen, setIsAiModalOpen, palaces, globalPatterns, selectedPalace, paiPanMethod
    } = qimenState;

    return (
        <div className="flex flex-1 h-full min-h-0 overflow-hidden relative">
            {useDesktopLayout ? (
                <QimenDesktopLayout {...qimenState} />
            ) : isPadLandscape ? (
                <QimenPadLayout {...qimenState} />
            ) : (
                <QimenMobileLayout {...qimenState} />
            )}

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
                    key={editingCase ? `edit-${editingCase.id}` : 'new'}
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
                        calculateQimenByDate(data.date);
                        setRefreshTrigger(prev => prev + 1);
                    }}
                />
            )}

            {/* 全局格局详情弹窗 */}
            {selectedPattern && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSelectedPattern(null)}
                    />
                    <div className="relative bg-card rounded-xl border border-border shadow-2xl w-[90vw] max-w-lg max-h-[80vh] overflow-hidden">
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
                        <div className="p-5 overflow-y-auto max-h-[60vh] text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-serif">
                            {(() => {
                                const data = QimenDataService.getJuPattern(selectedPattern.name);
                                if (!data) return '暂无详细数据。';

                                const coreFields = ['定义', '原文', '含义', '总论'];
                                const tailFields = ['应用', '详解', '注意', '特别注意', '参考'];
                                const allKeys = Object.keys(data).filter(k => k !== 'name' && typeof data[k] === 'string');
                                const otherKeys = allKeys.filter(k => !coreFields.includes(k) && !tailFields.includes(k));

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
