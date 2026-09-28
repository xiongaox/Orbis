/**
 * BaziPage - 应用源码层
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
 * - `default BaziPage`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `classnames`、内部模块 `BaziCaseInfo` 等 10 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState } from 'react';
import classNames from 'classnames';
import BaziCaseInfo from './BaziCaseInfo';
import BaziChart from './BaziChart';
import DayunLiunianPanel from './DayunLiunianPanel';
import WuxingStatusBar from './WuxingStatusBar';
import BaziBasicInfoPanel from './BaziBasicInfoPanel';
import { getRealtimeClockData, getCurrentBaziYear } from '../../../utils/lunarUtil';
import { useBaziContext } from '../../../contexts/useBaziContext';
import { useLayoutMode } from '../../../hooks/useLayoutMode';

export default function BaziPage() {
    // 使用 Context 获取八字状态，避免 Prop Drilling
    const {
        selectedCase,
        baziData,
        loading,
        error,
        selectedDaYunIndex,
        selectedLiuNianYear,
        selectedLiuYueIndex,
        setSelectedDaYunIndex,
        setSelectedLiuNianYear,
        setSelectedLiuYueIndex,
    } = useBaziContext();

    // 布局检测：仅用于移动端条件分支
    const { isPadLandscape, isDesktop, isMobile } = useLayoutMode();
    const isMobileLayout = isMobile || (!isDesktop && !isPadLandscape);

    // 胎命身显示开关状态
    const [showTaiMingShen, setShowTaiMingShen] = useState(false);
    // 隐藏详情面板开关
    const [hideDetails, setHideDetails] = useState(isMobileLayout);

    // 当前八字年（以立春为界）：用于列表高亮与"当前流年"跳转，
    // 统一走 lunarUtil 的 getCurrentBaziYear，避免自行用月份猜测导致立春前后错位。
    const simpleCurrentBaziYear = getCurrentBaziYear().solarYear;

    return (
        <>
            <BaziCaseInfo
                caseData={selectedCase}
                baziData={baziData}
                selectedDaYunIndex={selectedDaYunIndex ?? null}
                selectedLiuNianYear={selectedLiuNianYear ?? null}
                currentYear={simpleCurrentBaziYear}
                isMobileLayout={isMobileLayout}
            />
            <div className={classNames(
                // 列宽以神煞四字（48px）+ 内边距（8px，px-1 py-1）为准，56px 即可不换行。
                // 按 7 列（胎命身+四柱）上限取 5fr:7fr：排盘表约 467px（7 列 58px、6 列 67px），
                // 右侧保留约 653px，与原始 2fr:3fr 的右栏宽度一致，信息不被截断。
                'flex-1 min-h-0 min-w-0 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] overflow-y-auto lg:overflow-hidden',
                // 内容区内边距对齐奇门遁甲的紧凑规格（8px），把宽度让给排盘内容
                'gap-2 px-2 pb-2'
            )}>
                <BaziChart
                    data={baziData}
                    loading={loading}
                    selectedDaYunIndex={selectedDaYunIndex}
                    selectedLiuNianYear={selectedLiuNianYear}
                    currentYear={simpleCurrentBaziYear}
                    showTaiMingShen={showTaiMingShen}
                    isMobileLayout={isMobileLayout}
                    hideDetails={hideDetails}
                />
                <div className={classNames('flex flex-col min-h-0 lg:overflow-y-auto', 'gap-2')}>
                    {/* 五行旺衰信息条 */}
                    <div className="flex-shrink-0">
                        <WuxingStatusBar
                            baziData={baziData}
                            selectedLiuNianYear={selectedLiuNianYear}
                            currentYear={simpleCurrentBaziYear}
                            showTaiMingShen={showTaiMingShen}
                            onToggleTaiMingShen={() => setShowTaiMingShen(!showTaiMingShen)}
                            hideDetails={hideDetails}
                            onToggleHideDetails={() => setHideDetails(!hideDetails)}
                            isMobileLayout={isMobileLayout}
                            isPadLandscape={isPadLandscape}
                            onGoToCurrentYear={() => {
                                // 当前八字年（以立春为界）：年份取当前公历年折算后的年号，
                                // 干支取实时年柱。注意干支只能定位六十甲子中的一位，
                                // 丙午对应 1906/1966/2026 三个年份，绝不能按干支反查流年表，
                                // 否则长寿命例会跳到几十年前的同一个干支年。
                                const now = new Date();
                                const clockData = getRealtimeClockData(now);
                                const { solarYear: baziYear, ganZhi: currentGanZhi } = getCurrentBaziYear(now);
                                let targetYear = baziYear;

                                // 仅当该年号存在且干支自洽时直接使用；否则按干支就近匹配兜底
                                if (baziData?.liuNian) {
                                    const exactMatch = baziData.liuNian.find(ln => ln.year === baziYear);
                                    if (exactMatch) {
                                        targetYear = exactMatch.year;
                                    } else {
                                        // 兜底：命例流年表未覆盖当前年（如起运前的年份），
                                        // 取干支相同且与当前年号最接近的一项
                                        const sameGanZhi = baziData.liuNian.filter(ln => ln.ganZhi === currentGanZhi);
                                        if (sameGanZhi.length > 0) {
                                            targetYear = sameGanZhi.reduce((closest, item) =>
                                                Math.abs(item.year - baziYear) < Math.abs(closest.year - baziYear) ? item : closest
                                            ).year;
                                        }
                                    }
                                }

                                setSelectedLiuNianYear(targetYear);

                                // 同步跳转到目标年份所属的大运分页，避免当前流年落在未展示的大运页里
                                if (baziData?.daYun) {
                                    const targetDaYunIndex = baziData.daYun.findIndex(dy => targetYear >= dy.startYear && targetYear <= dy.endYear);
                                    if (targetDaYunIndex >= 0) {
                                        const targetDaYun = baziData.daYun[targetDaYunIndex];
                                        setSelectedDaYunIndex(targetDaYun.index);
                                    } else {
                                        setSelectedDaYunIndex(null);
                                    }
                                }

                                // 计算当前农历月份（流月索引，0-11，对应正月到腊月）
                                // 流月以节气为准，用八字的月柱来确定
                                const currentMonthZhi = clockData.eightChar.monthZhi;
                                // 地支到流月索引的映射（寅月=正月=0, 卯月=二月=1, ...)
                                const zhiToLiuYueIndex: Record<string, number> = {
                                    '寅': 0, '卯': 1, '辰': 2, '巳': 3, '午': 4, '未': 5,
                                    '申': 6, '酉': 7, '戌': 8, '亥': 9, '子': 10, '丑': 11,
                                };
                                const currentLiuYueIndex = zhiToLiuYueIndex[currentMonthZhi];
                                if (currentLiuYueIndex !== undefined) {
                                    setSelectedLiuYueIndex(currentLiuYueIndex);
                                }
                            }}
                        />
                    </div>

                    <div className="flex-shrink-0">
                        <DayunLiunianPanel
                            data={baziData}
                            loading={loading}
                            selectedDaYunIndex={selectedDaYunIndex}
                            selectedLiuNianYear={selectedLiuNianYear}
                            selectedLiuYueIndex={selectedLiuYueIndex}
                            onSelectDaYun={setSelectedDaYunIndex}
                            onSelectLiuNian={setSelectedLiuNianYear}
                            onSelectLiuYue={setSelectedLiuYueIndex}
                            isMobileLayout={isMobileLayout}
                        />
                    </div>

                    {/* 详情面板 - 移动端始终显示，桌面端受隐藏详情控制 */}
                    {(isMobileLayout || !hideDetails) && (
                        <div className="flex-shrink-0">
                            <BaziBasicInfoPanel baziData={baziData} isMobileLayout={isMobileLayout} />
                        </div>
                    )}
                </div>
            </div>
            {error && (
                <div className="px-6 pb-4">
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                        {error}
                    </div>
                </div>
            )}
        </>
    );
}
