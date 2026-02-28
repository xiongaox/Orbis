import QimenCaseList from '../QimenCaseList';
import QimenChart from '../QimenChart';
import QimenPalaceDetail from '../QimenPalaceDetail';
import QimenJuInfo from '../QimenJuInfo';
import SideDrawer from '../../../UI/SideDrawer';
import { type QimenLayoutProps } from './QimenLayoutProps';

export default function QimenMobileLayout(props: QimenLayoutProps) {
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
        isInfoOpen, setIsInfoOpen,
        mobileShowChangSheng, mobileShowShiShen, mobileShowPalaceMeta,
        handleMobileToggleCS, handleMobileToggleSS, handleMobileTogglePM
    } = props;

    // 获取选中的宫位数据
    const selectedPalaceData = selectedPalace
        ? palaces.find(p => p.position === selectedPalace) || null
        : null;

    const rightPanelContent = selectedPalaceData ? (
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
    );


    return (
        <>
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-border/40 bg-background/70 backdrop-blur-sm">
                    <div className="grid grid-cols-4 gap-1.5">
                        <button
                            type="button"
                            onClick={() => setIsAiModalOpen(true)}
                            className="py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-500 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                            AI
                        </button>
                        <button
                            type="button"
                            onClick={handleMobileToggleCS}
                            className={`py-1.5 rounded-lg border text-xs transition-colors ${mobileShowChangSheng ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card/60 text-muted-foreground'}`}
                        >
                            长生
                        </button>
                        <button
                            type="button"
                            onClick={handleMobileToggleSS}
                            className={`py-1.5 rounded-lg border text-xs transition-colors ${mobileShowShiShen ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card/60 text-muted-foreground'}`}
                        >
                            十神
                        </button>
                        <button
                            type="button"
                            onClick={handleMobileTogglePM}
                            className={`py-1.5 rounded-lg border text-xs transition-colors ${mobileShowPalaceMeta ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card/60 text-muted-foreground'}`}
                        >
                            宫位
                        </button>
                    </div>
                </div>

                {/* 移动端案例标题：选中案例时显示，无案例时隐藏 */}
                {currentCase?.title && (
                    <button
                        type="button"
                        onClick={() => setIsCaseListOpen(true)}
                        className="px-3 py-1.5 border-b border-border/40 bg-primary/5 flex items-center gap-2 text-left"
                    >
                        <span className="w-0.5 h-3.5 rounded-full bg-primary/60 flex-shrink-0" />
                        <span className="text-sm text-primary/90 font-serif truncate">【求测】：{currentCase.title}</span>
                    </button>
                )}

                <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col relative">
                    {/* 左侧竖线触发按钮 - 案例 */}
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

                    {/* 右侧竖线触发按钮 - 局信息 */}
                    <button
                        type="button"
                        onClick={() => setIsInfoOpen(true)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-end group focus:outline-none"
                        aria-label="打开局信息"
                    >
                        <span className="w-[3px] h-20 rounded-l bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">
                                局信息
                            </span>
                        </span>
                    </button>
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
                        isMobileLayout
                        controlledShowChangSheng={mobileShowChangSheng}
                        controlledShowShiShen={mobileShowShiShen}
                        controlledShowPalaceMeta={mobileShowPalaceMeta}
                        onToggleChangSheng={handleMobileToggleCS}
                        onToggleShiShen={handleMobileToggleSS}
                        onTogglePalaceMeta={handleMobileTogglePM}
                        onLongPressPalace={(position) => {
                            setSelectedPalace(position);
                            setIsInfoOpen(true);
                        }}
                    />
                </div>
            </main>

            <SideDrawer
                open={isCaseListOpen}
                title="案例"
                side="left"
                size="xxs"
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
                />
            </SideDrawer>

            <SideDrawer
                open={isInfoOpen}
                title={selectedPalaceData ? '宫位详情' : '局信息'}
                side="right"
                size="sm"
                onClose={() => setIsInfoOpen(false)}
            >
                <div className="h-full min-h-0 overflow-hidden flex flex-col">
                    {rightPanelContent}
                </div>
            </SideDrawer>
        </>
    );
}
