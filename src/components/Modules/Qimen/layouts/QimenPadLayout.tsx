
import { useState } from 'react';
import QimenCaseList from '../QimenCaseList';
import QimenChart from '../QimenChart';
import QimenPalaceDetail from '../QimenPalaceDetail';
import QimenPadInfoPanel from '../components/QimenPadInfoPanel';
import QimenJuInfo from '../QimenJuInfo';
import QimenGuideModal from '../components/QimenGuideModal';
import CaseDialogModal from '../components/CaseDialogModal';
import type { CaseDialogKind } from '../../../Common/caseDialog';
import SideDrawer from '../../../UI/SideDrawer';
import BaseModal from '../../../UI/BaseModal';
import { type QimenLayoutProps } from './QimenLayoutProps';
import { useCasePrivacy } from '../../../../contexts/CasePrivacyContext';

export default function QimenPadLayout(props: QimenLayoutProps) {
    const {
        palaces, header, globalPatterns, isLoading, error, currentCase,
        paiPanMethod, setPaiPanMethod, calculateNow,
        handlePrevHour, handleNextHour, handleSelectCase, selectedDate,
        selectedCaseId, setCurrentCase,
        handleDeleteCase, handleEditCase, refreshTrigger, setRefreshTrigger, caseListToast,
        selectedPalace, setSelectedPalace,
        setIsDatePickerOpen, setIsNewCaseModalOpen, setEditingCase,
        setIsCustomJuModalOpen, setSelectedPattern, setIsAiModalOpen,
        selectedKongWangKey, setSelectedKongWangKey,
        selectedMaXingKey, setSelectedMaXingKey,
        dynamicMaKong,
        isCaseListOpen, setIsCaseListOpen,
        mobileShowChangSheng, mobileShowShiShen, mobileShowPalaceMeta,
        handleMobileToggleCS, handleMobileToggleSS, handleMobileTogglePM,
        onSaveLifePan
    } = props;

    // 案例正文弹窗（布局层持有）：摘要卡是入口，正文的记录与删除都在弹窗里
    const [isCaseDialogOpen, setIsCaseDialogOpen] = useState(false);
    /** 由摘要卡的铅笔进入时，弹窗打开后聚焦输入框 */
    const [isCaseDialogEditing, setIsCaseDialogEditing] = useState(false);
    const [caseDialogMode, setCaseDialogMode] = useState<CaseDialogKind>('q');
    // 隐私状态来自全局 context：与案例库头部的隐藏开关共用，不再各自维护
    const { isPrivacyMode: isCasePrivacyMode, togglePrivacy } = useCasePrivacy();

    // 获取选中的宫位数据
    const selectedPalaceData = selectedPalace
        ? palaces.find(p => p.position === selectedPalace) || null
        : null;

    // 盘面元素说明弹窗（布局层持有，携带选中宫位实时数据）
    const [guideOpen, setGuideOpen] = useState(false);
    const openGuide = () => setGuideOpen(true);

    // 双击打开的宫位详情：与单击选中（selectedPalace）分开，手势与桌面端一致——单击选中、双击弹详情
    const [detailPalacePos, setDetailPalacePos] = useState<number | null>(null);
    const detailPalaceData = detailPalacePos
        ? palaces.find(p => p.position === detailPalacePos) || null
        : null;

    return (
        <>
            {/* 左侧信息栏面板 - 竖向紧凑排版 */}
            <div className="w-56 flex-shrink-0 min-h-0 overflow-y-auto flex flex-col border-r border-border/50 bg-card/10 relative">
                {/* 贴边竖线触发按钮 */}
                <button
                    type="button"
                    onClick={() => setIsCaseListOpen(true)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-start group focus:outline-none"
                    aria-label="打开案例列表"
                >
                    <span className="w-[3px] h-20 rounded-r bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">
                            案例
                        </span>
                    </span>
                </button>

                {/* Pad 专用竖向信息栏 */}
                <QimenPadInfoPanel
                    header={header}
                    method={paiPanMethod}
                    onMethodChange={setPaiPanMethod}
                    onResetToNow={calculateNow}
                    onOpenDatePicker={() => setIsDatePickerOpen(true)}
                    onPrevHour={handlePrevHour}
                    onNextHour={handleNextHour}
                    onJuClick={() => setIsCustomJuModalOpen(true)}
                    globalPatterns={globalPatterns}
                    onPatternClick={setSelectedPattern}
                    onOpenAiModal={() => setIsAiModalOpen(true)}
                    showChangSheng={mobileShowChangSheng}
                    showShiShen={mobileShowShiShen}
                    showPalaceMeta={mobileShowPalaceMeta}
                    onToggleChangSheng={handleMobileToggleCS}
                    onToggleShiShen={handleMobileToggleSS}
                    onTogglePalaceMeta={handleMobileTogglePM}
                    onOpenGuide={openGuide}
                    onSaveLifePan={onSaveLifePan}
                />
            </div>

            {/* 盘面主体区域 */}
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col p-1 relative">
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

                {/* 案例标题 - 有案例时显示在盘式上方 */}
                {currentCase?.title && (
                    <div className="shrink-0 flex items-center justify-center gap-2 h-10 px-3 -mx-1 -mt-1 mb-1 bg-card/60 border-b border-border/60">
                        <span className={`text-base font-serif text-foreground font-medium leading-none line-clamp-1 ${isCasePrivacyMode ? 'select-none blur-[6px]' : ''}`}>
                            【求测】：{currentCase.title}
                        </span>
                    </div>
                )}

                <QimenChart
                    palaces={palaces}
                    header={header}
                    selectedPalace={selectedPalace}
                    onSelectPalace={(position) => setSelectedPalace(position === selectedPalace ? null : position)}
                    onLongPressPalace={(position) => {
                        // 双击：选中并打开宫位详情弹窗（与桌面端一致）
                        setSelectedPalace(position);
                        setDetailPalacePos(position);
                    }}
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
                    fullWidth
                    hideHeader
                    controlledShowChangSheng={mobileShowChangSheng}
                    controlledShowShiShen={mobileShowShiShen}
                    controlledShowPalaceMeta={mobileShowPalaceMeta}
                />
            </main>

            {/* 右侧详情面板 - Pad 横屏下固定显示局信息 */}
            <div className="w-72 flex-shrink-0 min-h-0 overflow-y-auto border-l border-border/50 bg-card/10">
                <QimenJuInfo
                    date={selectedDate}
                    header={header}
                    caseData={currentCase}
                    isCasePrivacyMode={isCasePrivacyMode}
                    onToggleCasePrivacy={togglePrivacy}
                    onOpenCaseDialog={(intent) => { setIsCaseDialogEditing(intent === 'edit'); setIsCaseDialogOpen(true); }}
                    selectedKongWangKey={selectedKongWangKey}
                    selectedMaXingKey={selectedMaXingKey}
                    onKongWangKeyChange={setSelectedKongWangKey}
                    onMaXingKeyChange={setSelectedMaXingKey}
                    compact
                    onSaveLifePan={onSaveLifePan}
                />
            </div>

            {/* 左侧案例抽屉 */}
            <SideDrawer
                open={isCaseListOpen}
                title="案例"
                side="left"
                size="xs"
                onClose={() => setIsCaseListOpen(false)}
            >
                <QimenCaseList
                    selectedCaseId={selectedCaseId}
                    paiPanMethod={paiPanMethod}
                    onSelectCase={(id, caseItem) => {
                        setIsCaseListOpen(false);
                        void handleSelectCase(id, caseItem);
                    }}
                    onOpenDatePicker={() => {
                        setEditingCase(null);
                        setIsNewCaseModalOpen(true);
                        setIsCaseListOpen(false);
                    }}
                    onDeleteCase={handleDeleteCase}
                    feedback={caseListToast}
                    onEditCase={handleEditCase}
                    refreshTrigger={refreshTrigger}
                    variant="drawer"
                />
            </SideDrawer>

            {/* Pad 横屏专用宫位详情弹窗：双击触发，关闭只收起详情不影响盘面选中 */}
            <BaseModal
                isOpen={detailPalacePos !== null}
                onClose={() => setDetailPalacePos(null)}
                title="宫位详情"
                maxWidth="max-w-2xl"
                bodyClassName="p-0 flex flex-col overflow-hidden"
            >
                {detailPalaceData && (
                    <div className="bg-card flex flex-col h-[75vh]">
                        <QimenPalaceDetail
                            palace={detailPalaceData}
                            timeZhi={header?.siZhu?.hour?.slice(1, 2)}
                            zhiShiMen={header?.zhiShi ? header.zhiShi + '门' : ''}
                            zhiFuXing={header?.zhiFu}
                            siZhu={header?.siZhu}
                            xunShou={header?.xunShou}
                            onOpenGuide={openGuide}
                        />
                    </div>
                )}
            </BaseModal>

            {/* 盘面元素说明弹窗：渲染当前选中宫位实时数据 */}
            <QimenGuideModal
                open={guideOpen}
                onClose={() => setGuideOpen(false)}
                palace={selectedPalaceData}
                zhiFu={header?.zhiFu}
                zhiShi={header?.zhiShi}
                siZhu={header?.siZhu}
                dynamicMaKong={dynamicMaKong}
                showChangSheng={mobileShowChangSheng}
                showShiShen={mobileShowShiShen}
                showPalaceMeta={mobileShowPalaceMeta}
            />

            <CaseDialogModal
                isOpen={isCaseDialogOpen}
                autoFocusComposer={isCaseDialogEditing}
                caseData={currentCase}
                mode={caseDialogMode}
                onModeChange={setCaseDialogMode}
                onClose={() => setIsCaseDialogOpen(false)}
                onCaseUpdated={(updatedCase) => {
                    setCurrentCase(updatedCase);
                    setRefreshTrigger(prev => prev + 1);
                }}
            />
        </>
    );
}
