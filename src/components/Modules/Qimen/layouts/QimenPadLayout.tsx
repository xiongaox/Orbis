import QimenCaseList from '../QimenCaseList';
import QimenChart from '../QimenChart';
import QimenPalaceDetail from '../QimenPalaceDetail';
import QimenPadInfoPanel from '../components/QimenPadInfoPanel';
import QimenJuInfo from '../QimenJuInfo';
import SideDrawer from '../../../UI/SideDrawer';
import BaseModal from '../../../UI/BaseModal';
import { type QimenLayoutProps } from './QimenLayoutProps';

export default function QimenPadLayout(props: QimenLayoutProps) {
    const {
        palaces, header, globalPatterns, isLoading, error, currentCase,
        paiPanMethod, setPaiPanMethod, calculateNow, calculateQimenByDate,
        handlePrevHour, handleNextHour, selectedDate,
        selectedCaseId, setSelectedCaseId, setCurrentCase,
        handleDeleteCase, handleEditCase, refreshTrigger, setRefreshTrigger,
        selectedPalace, setSelectedPalace,
        setIsDatePickerOpen, setIsNewCaseModalOpen, setEditingCase,
        setIsCustomJuModalOpen, setSelectedPattern, setIsAiModalOpen,
        selectedKongWangKey, setSelectedKongWangKey,
        selectedMaXingKey, setSelectedMaXingKey,
        dynamicMaKong,
        isCaseListOpen, setIsCaseListOpen,
        mobileShowChangSheng, mobileShowShiShen, mobileShowPalaceMeta,
        handleMobileToggleCS, handleMobileToggleSS, handleMobileTogglePM
    } = props;

    // 获取选中的宫位数据
    const selectedPalaceData = selectedPalace
        ? palaces.find(p => p.position === selectedPalace) || null
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
                        <span className="text-base font-serif text-foreground font-medium leading-none line-clamp-1">
                            【求测】：{currentCase.title}
                        </span>
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
                    onCaseUpdated={(updatedCase) => {
                        setCurrentCase(updatedCase);
                        setRefreshTrigger(prev => prev + 1);
                    }}
                    selectedKongWangKey={selectedKongWangKey}
                    selectedMaXingKey={selectedMaXingKey}
                    onKongWangKeyChange={setSelectedKongWangKey}
                    onMaXingKeyChange={setSelectedMaXingKey}
                    compact
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
                    onSelectCase={(id, caseItem) => {
                        setSelectedCaseId(id);
                        setCurrentCase(caseItem);
                        setIsCaseListOpen(false);
                        if (caseItem.test_date) {
                            calculateQimenByDate(new Date(caseItem.test_date));
                        }
                    }}
                    onOpenDatePicker={() => {
                        setEditingCase(null);
                        setIsNewCaseModalOpen(true);
                        setIsCaseListOpen(false);
                    }}
                    onDeleteCase={handleDeleteCase}
                    onEditCase={handleEditCase}
                    refreshTrigger={refreshTrigger}
                    variant="drawer"
                />
            </SideDrawer>

            {/* Pad 横屏专用宫位详情弹窗 */}
            <BaseModal
                isOpen={selectedPalace !== null}
                onClose={() => setSelectedPalace(null)}
                title="宫位详情"
                maxWidth="max-w-2xl"
                bodyClassName="p-0 flex flex-col overflow-hidden"
            >
                {selectedPalaceData && (
                    <div className="bg-card flex flex-col h-[75vh]">
                        <QimenPalaceDetail
                            palace={selectedPalaceData}
                            timeZhi={header?.siZhu?.hour?.slice(1, 2)}
                            zhiShiMen={header?.zhiShi ? header.zhiShi + '门' : ''}
                            zhiFuXing={header?.zhiFu}
                            siZhu={header?.siZhu}
                            xunShou={header?.xunShou}
                        />
                    </div>
                )}
            </BaseModal>
        </>
    );
}
