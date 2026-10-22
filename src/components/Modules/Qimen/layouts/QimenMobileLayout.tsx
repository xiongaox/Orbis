
import { useState } from 'react';
import QimenCaseList from '../QimenCaseList';
import QimenChart from '../QimenChart';
import QimenPalaceDetail from '../QimenPalaceDetail';
import QimenJuInfo from '../QimenJuInfo';
import QimenGuideModal from '../components/QimenGuideModal';
import CaseDialogModal from '../components/CaseDialogModal';
import type { CaseDialogKind } from '../../../Common/caseDialog';
import SideDrawer from '../../../UI/SideDrawer';
import { INLINE_DRAWER_WIDTH, inlineDrawerOffset } from '../../../UI/inlineDrawerLayout';
import { useRegisterMobileDrawers } from '../../../../contexts/MobileNavContext';
import { type QimenLayoutProps } from './QimenLayoutProps';
import { useCasePrivacy } from '../../../../contexts/CasePrivacyContext';

// 移动端底栏已接管「案例 / 局信息」入口，边缘竖线把手默认隐藏；需要恢复入口时置 true
const SHOW_EDGE_HANDLES = false;

export default function QimenMobileLayout(props: QimenLayoutProps) {
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
        isInfoOpen, setIsInfoOpen,
        mobileShowChangSheng, mobileShowShiShen, mobileShowPalaceMeta,
        handleMobileToggleCS, handleMobileToggleSS, handleMobileTogglePM
    } = props;

    // 案例正文弹窗（布局层持有）：摘要卡是入口，正文的记录与删除都在弹窗里
    const [isCaseDialogOpen, setIsCaseDialogOpen] = useState(false);
    /** 由摘要卡的铅笔进入时，弹窗打开后聚焦输入框 */
    const [isCaseDialogEditing, setIsCaseDialogEditing] = useState(false);
    const [caseDialogMode, setCaseDialogMode] = useState<CaseDialogKind>('q');
    // 隐私状态来自全局 context：与案例库头部的隐藏开关共用，不再各自维护
    const { isPrivacyMode: isCasePrivacyMode, togglePrivacy } = useCasePrivacy();

    // 盘面元素说明弹窗
    const [guideOpen, setGuideOpen] = useState(false);

    // 移动端底栏注册：案例（左抽屉）与 局信息/宫位详情（右抽屉）由底部导航槽位打开
    useRegisterMobileDrawers('qimen', {
        // 底栏槽位点击：左右抽屉互斥——打开一侧时先关掉另一侧，
        // 否则两个抽屉同时打开，后渲染的那个会叠在上层盖住前一个。
        // 这里的 setter 来自 props 且声明为 (v: boolean) => void，不能传函数式更新
        openCase: () => {
            const next = !isCaseListOpen;
            setIsInfoOpen(false);
            setIsCaseListOpen(next);
        },
        openPanel: () => {
            const next = !isInfoOpen;
            setIsCaseListOpen(false);
            setIsInfoOpen(next);
        },
        // 排盘类模块：左抽屉是案例列表，右抽屉是排盘信息
        caseLabel: '案例',
        panelLabel: '排盘信息',
        // 并排式抽屉状态：打开时滑动改为「关闭」，而不是再开一层
        inlineOpen: isCaseListOpen || isInfoOpen,
        inlineSide: isCaseListOpen ? 'left' : isInfoOpen ? 'right' : undefined,
        closeInline: () => {
            setIsCaseListOpen(false);
            setIsInfoOpen(false);
        },
    });

    // 并排式抽屉：主内容平移量与侧栏宽度共用 INLINE_DRAWER_WIDTH。
    // 盘面区已与顶栏按钮行同样左右内缩 px-2，视觉留白由它承担，不再额外补 extraGap。
    const inlineOffset = isCaseListOpen
        ? inlineDrawerOffset(INLINE_DRAWER_WIDTH.xxs, 'left')
        : isInfoOpen
            ? inlineDrawerOffset(INLINE_DRAWER_WIDTH.sm, 'right')
            : undefined;

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
            isCasePrivacyMode={isCasePrivacyMode}
            onToggleCasePrivacy={togglePrivacy}
            onOpenCaseDialog={(intent) => { setIsCaseDialogEditing(intent === 'edit'); setIsCaseDialogOpen(true); }}
            selectedKongWangKey={selectedKongWangKey}
            selectedMaXingKey={selectedMaXingKey}
            onKongWangKeyChange={setSelectedKongWangKey}
            onMaXingKeyChange={setSelectedMaXingKey}
        />
    );


    return (
        <>
            {/* 并排式抽屉：主内容整体平移让位（宽度不变、不重排），侧栏从侧边推出。
                只移动不缩放，盘面可读性不受影响；关闭后 transform 归零。
                主内容不再包内缩圆角外框（那圈 m-2 + 边框白占 16px 间距），
                侧栏仍是浮起圆角卡片；内缩露出的就是根节点的应用底色。 */}
            <main
                className="relative flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col transition-transform duration-300 ease-out bg-background"
                style={inlineOffset ? { transform: inlineOffset } : undefined}
            >
                {/* 并排式抽屉打开时，主内容上的透明点击区负责关闭（无遮罩，不影响观感） */}
                {(isCaseListOpen || isInfoOpen) && (
                    <button
                        type="button"
                        aria-label="关闭侧栏"
                        onClick={() => {
                            setIsCaseListOpen(false);
                            setIsInfoOpen(false);
                        }}
                        className="absolute inset-0 z-40"
                    />
                )}
                <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col relative">
                    {/* 左侧竖线触发按钮 - 案例（已由底栏接管，默认隐藏） */}
                    {SHOW_EDGE_HANDLES && (
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
                    )}

                    {/* 右侧竖线触发按钮 - 局信息（已由底栏接管，默认隐藏） */}
                    {SHOW_EDGE_HANDLES && (
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
                    )}
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
                        roundedMobile
                        // 移动端案例标题：放到信息卡顶部通栏（横线分隔），选中案例时才有
                        headerTopSlot={currentCase?.title ? (
                            <button
                                type="button"
                                onClick={() => setIsCaseListOpen(true)}
                                className="w-full px-4 py-2 bg-primary/5 flex items-center gap-2 text-left"
                            >
                                <span className="w-0.5 h-3.5 rounded-full bg-primary/60 flex-shrink-0" />
                                <span className={`text-sm text-primary/90 font-serif truncate ${isCasePrivacyMode ? 'select-none blur-[6px]' : ''}`}>【求测】：{currentCase.title}</span>
                            </button>
                        ) : undefined}
                        // 移动端按钮行从页面顶栏移到信息卡下方（与信息卡、九宫盘同宽），
                        // 与卡片的间距由 QimenChart 的 mb-2 提供
                        headerBottomSlot={
                            <div className="grid grid-cols-5 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setIsAiModalOpen(true)}
                                    className="py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-500 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
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
                                <button
                                    type="button"
                                    onClick={() => setGuideOpen(true)}
                                    className="py-1.5 rounded-lg border border-border bg-card/60 text-xs text-muted-foreground transition-colors"
                                >
                                    说明
                                </button>
                            </div>
                        }
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
                inline
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

            <SideDrawer
                open={isInfoOpen}
                title={selectedPalaceData ? '宫位详情' : '局信息'}
                side="right"
                size="sm"
                inline
                onClose={() => setIsInfoOpen(false)}
            >
                <div className="h-full min-h-0 overflow-hidden flex flex-col">
                    {rightPanelContent}
                </div>
            </SideDrawer>

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
