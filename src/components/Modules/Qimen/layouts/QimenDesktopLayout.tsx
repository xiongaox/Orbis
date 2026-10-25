
import { useState } from 'react';
import QimenCaseList from '../QimenCaseList';
import QimenChart from '../QimenChart';
import QimenPalaceDetail from '../QimenPalaceDetail';
import QimenJuInfo from '../QimenJuInfo';
import QimenGuideModal from '../components/QimenGuideModal';
import CaseDialogModal from '../components/CaseDialogModal';
import type { CaseDialogKind } from '../../../Common/caseDialog';
import { type QimenLayoutProps } from './QimenLayoutProps';
import { useCasePrivacy } from '../../../../contexts/CasePrivacyContext';

export default function QimenDesktopLayout(props: QimenLayoutProps) {
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
        dynamicMaKong, onSaveLifePan
    } = props;

    // 案例正文弹窗（布局层持有）：摘要卡是入口，正文的记录与删除都在弹窗里
    const [isCaseDialogOpen, setIsCaseDialogOpen] = useState(false);
    /** 由摘要卡的铅笔进入时，弹窗打开后聚焦输入框 */
    const [isCaseDialogEditing, setIsCaseDialogEditing] = useState(false);
    const [caseDialogMode, setCaseDialogMode] = useState<CaseDialogKind>('q');
    // 隐私状态来自全局 context：与案例库头部的隐藏开关共用，不再各自维护
    const { isPrivacyMode: isCasePrivacyMode, togglePrivacy } = useCasePrivacy();
    // 与移动端 useQimenState 的默认一致：长生 + 宫位预选中，十神默认关闭
    const [showChangSheng, setShowChangSheng] = useState(true);
    const [showShiShen, setShowShiShen] = useState(false);
    const [showPalaceMeta, setShowPalaceMeta] = useState(true);

    const toggleChangSheng = () => setShowChangSheng((current) => {
        if (current) return false;
        setShowShiShen(false);
        return true;
    });
    const toggleShiShen = () => setShowShiShen((current) => {
        if (current) return false;
        setShowChangSheng(false);
        return true;
    });
    const togglePalaceMeta = () => setShowPalaceMeta((current) => !current);

    // 获取选中的宫位数据
    const selectedPalaceData = selectedPalace
        ? palaces.find(p => p.position === selectedPalace) || null
        : null;

    // 盘面元素说明弹窗（布局层持有）：单击选中宫位后点局信息「说明」→ 实时渲染并解释该宫
    const [guideOpen, setGuideOpen] = useState(false);
    const openGuide = () => setGuideOpen(true);

    // 右栏视图：默认局信息；双击宫位才切到宫位详情（单击只选中，不切走右栏）
    const [detailPalacePos, setDetailPalacePos] = useState<number | null>(null);
    const detailPalaceData = detailPalacePos
        ? palaces.find(p => p.position === detailPalacePos) || null
        : null;

    const rightPanelContent = detailPalaceData ? (
        <QimenPalaceDetail
            palace={detailPalaceData}
            timeZhi={header?.siZhu?.hour?.slice(1, 2)}
            zhiShiMen={header?.zhiShi ? header.zhiShi + '门' : ''}
            zhiFuXing={header?.zhiFu}
            siZhu={header?.siZhu}
            xunShou={header?.xunShou}
            onOpenGuide={openGuide}
        />
    ) : (
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
            showChangSheng={showChangSheng}
            showShiShen={showShiShen}
            showPalaceMeta={showPalaceMeta}
            onToggleChangSheng={toggleChangSheng}
            onToggleShiShen={toggleShiShen}
            onTogglePalaceMeta={togglePalaceMeta}
            onOpenGuide={openGuide}
            onSaveLifePan={onSaveLifePan}
        />
    );

    return (
        <>
            {/* 左侧案例列表 */}
            <div className="w-72 xl:w-80 2xl:w-96 h-full flex-shrink-0 overflow-hidden">
                <QimenCaseList
                    selectedCaseId={selectedCaseId}
                    paiPanMethod={paiPanMethod}
                    onSelectCase={handleSelectCase}
                    onOpenDatePicker={() => {
                        setEditingCase(null);
                        setIsNewCaseModalOpen(true);
                    }}
                    onDeleteCase={handleDeleteCase}
                    feedback={caseListToast}
                    onEditCase={handleEditCase}
                    refreshTrigger={refreshTrigger}
                />
            </div>

            {/* 中间九宫盘式 */}
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col p-2 relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-20">
                        <div className="text-muted-foreground">正在计算...</div>
                    </div>
                )}
                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-destructive/10 text-destructive px-4 py-2 rounded-lg z-20">
                        {error}
                    </div>
                )}

                <QimenChart
                    palaces={palaces}
                    header={header}
                    selectedPalace={selectedPalace}
                    onSelectPalace={(position) => {
                        // 单击仅切换选中（高亮+说明数据源），右栏收回局信息
                        setDetailPalacePos(null);
                        setSelectedPalace(position === selectedPalace ? null : position);
                    }}
                    onLongPressPalace={(position) => {
                        // 双击：选中并打开右栏宫位详情
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
                    controlledShowChangSheng={showChangSheng}
                    controlledShowShiShen={showShiShen}
                    controlledShowPalaceMeta={showPalaceMeta}
                />
            </main>

            {/* 右侧宫位详情 */}
            <div className="w-72 xl:w-80 2xl:w-96 flex-shrink-0 min-h-0 overflow-hidden flex flex-col border-l border-border/50 bg-card/10">
                {rightPanelContent}
            </div>

            {/* 盘面元素说明弹窗：渲染当前选中宫位实时数据 */}
            <QimenGuideModal
                open={guideOpen}
                onClose={() => setGuideOpen(false)}
                palace={selectedPalaceData}
                zhiFu={header?.zhiFu}
                zhiShi={header?.zhiShi}
                siZhu={header?.siZhu}
                dynamicMaKong={dynamicMaKong}
                showChangSheng={showChangSheng}
                showShiShen={showShiShen}
                showPalaceMeta={showPalaceMeta}
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
