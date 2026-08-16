/**
 * QimenDesktopLayout - 应用源码层
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
 * - `default QimenDesktopLayout`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `QimenCaseList`、内部模块 `QimenChart`、内部模块 `QimenPalaceDetail` 等 5 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useState } from 'react';
import QimenCaseList from '../QimenCaseList';
import QimenChart from '../QimenChart';
import QimenPalaceDetail from '../QimenPalaceDetail';
import QimenJuInfo from '../QimenJuInfo';
import { type QimenLayoutProps } from './QimenLayoutProps';

export default function QimenDesktopLayout(props: QimenLayoutProps) {
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
        dynamicMaKong
    } = props;
    const [showChangSheng, setShowChangSheng] = useState(false);
    const [showShiShen, setShowShiShen] = useState(false);
    const [showPalaceMeta, setShowPalaceMeta] = useState(false);

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
            showChangSheng={showChangSheng}
            showShiShen={showShiShen}
            showPalaceMeta={showPalaceMeta}
            onToggleChangSheng={toggleChangSheng}
            onToggleShiShen={toggleShiShen}
            onTogglePalaceMeta={togglePalaceMeta}
        />
    );

    return (
        <>
            {/* 左侧案例列表 */}
            <div className="w-72 xl:w-80 2xl:w-96 h-full flex-shrink-0 overflow-hidden">
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
                    controlledShowChangSheng={showChangSheng}
                    controlledShowShiShen={showShiShen}
                    controlledShowPalaceMeta={showPalaceMeta}
                />
            </main>

            {/* 右侧宫位详情 */}
            <div className="w-72 xl:w-80 2xl:w-96 flex-shrink-0 min-h-0 overflow-hidden flex flex-col border-l border-border/50 bg-card/10">
                {rightPanelContent}
            </div>
        </>
    );
}
