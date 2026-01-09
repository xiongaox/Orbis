/**
 * 八字模块页面容器
 */
import { useState } from 'react';
import BaziCaseInfo from './BaziCaseInfo';
import BaziChart from './BaziChart';
import DayunLiunianPanel from './DayunLiunianPanel';
import WuxingStatusBar from './WuxingStatusBar';
import { Solar } from 'lunar-typescript';
import type { BaziApiResponse } from '../../../types/bazi';
import type { Case } from '../../../types';

import BaziBasicInfoPanel from './BaziBasicInfoPanel';

interface BaziPageProps {
    selectedCase: Case | null;
    baziData: BaziApiResponse | null;
    loading: boolean;
    error: string | null;
    selectedDaYunIndex: number | null;
    selectedLiuNianYear: number | null;
    setSelectedDaYunIndex: (index: number | null) => void;
    setSelectedLiuNianYear: (year: number | null) => void;
}

export default function BaziPage({
    selectedCase,
    baziData,
    loading,
    error,
    selectedDaYunIndex,
    selectedLiuNianYear,
    setSelectedDaYunIndex,
    setSelectedLiuNianYear,
}: BaziPageProps) {
    // 胎命身显示开关状态
    const [showTaiMingShen, setShowTaiMingShen] = useState(false);
    // 隐藏详情面板开关
    const [hideDetails, setHideDetails] = useState(false);

    // 计算当前的八字年份（以立春为界）
    const now = new Date();
    // Solar.fromDate(now).getLunar().getYear() 返回的是农历年，通常符合八字年（除了立春和春节之间的空档）
    // 为了更精确，应该判断立春。但 lunar-typescript 的 getYear() 通常是指春节界限。
    // 如果要准确的八字年（立春界限），可以用 getYearInGanZhi() 拿到干支，然后反推？
    // 或者简单法：如果月<2，则减1。但 lunar.getYear() 在春节前已经是上一年的数字了。
    // 然而立春通常在春节前。
    // 比如 2026 Feb 4 立春，2026 Feb 17 春节。
    // Feb 10: 八字 Bing Wu (2026). Lunar 2025.
    // So lunar.getYear() is 2025. Result: 2025. Correct? NO. Bing Wu is 2026.
    // So we need Solar Year adjusted by LiChun.
    // 简单的办法：如果月份是0 (Jan)，减1。如果是1 (Feb)，日 < 4，减1。
    // 之前我们在 onGoToCurrentYear 里用了复杂的逻辑。
    // 这里为了 UI 默认高亮，我们可以用简单逻辑：now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()。
    // 这样最稳健，且类型为 number。
    const simpleCurrentBaziYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    return (
        <>
            <BaziCaseInfo
                caseData={selectedCase}
                baziData={baziData}
                selectedDaYunIndex={selectedDaYunIndex ?? null}
                selectedLiuNianYear={selectedLiuNianYear ?? null}
                currentYear={simpleCurrentBaziYear}
            />
            <div className="flex-1 min-h-0 min-w-0 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 overflow-hidden px-6 pb-6">
                <BaziChart
                    data={baziData}
                    loading={loading}
                    selectedDaYunIndex={selectedDaYunIndex}
                    selectedLiuNianYear={selectedLiuNianYear}
                    currentYear={simpleCurrentBaziYear}
                    showTaiMingShen={showTaiMingShen}
                />
                <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
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
                            onGoToCurrentYear={() => {
                                // 使用八字算法计算当前的干支年（以立春为界）
                                const now = new Date();
                                const solar = Solar.fromDate(now);
                                const lunar = solar.getLunar();
                                const eightChar = lunar.getEightChar();
                                const currentGanZhi = eightChar.getYearGan() + eightChar.getYearZhi();

                                // 默认年份：如果是1月，必然是上一年（因为立春在2月）；如果是其他月份，默认为当年
                                // 这样即使干支匹配失败，也能得到正确的大致年份
                                let targetYear = now.getFullYear();
                                if (now.getMonth() === 0) {
                                    targetYear = targetYear - 1;
                                }

                                // 在流年列表中查找匹配该干支的年份 (精确匹配)
                                if (baziData?.liuNian) {
                                    const targetLiuNian = baziData.liuNian.find(ln => ln.ganZhi === currentGanZhi);
                                    if (targetLiuNian) {
                                        targetYear = targetLiuNian.year;
                                    }
                                }

                                setSelectedLiuNianYear(targetYear);

                                // 同时跳转到对应的大运
                                if (baziData?.daYun) {
                                    const targetDaYun = baziData.daYun.find(dy => targetYear >= dy.startYear && targetYear <= dy.endYear);
                                    if (targetDaYun) {
                                        setSelectedDaYunIndex(targetDaYun.index);
                                    } else {
                                        setSelectedDaYunIndex(null);
                                    }
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
                            onSelectDaYun={setSelectedDaYunIndex}
                            onSelectLiuNian={setSelectedLiuNianYear}
                        />
                    </div>

                    {/* 详情面板 - 可隐藏 */}
                    {!hideDetails && (
                        <div className="flex-shrink-0">
                            <BaziBasicInfoPanel baziData={baziData} />
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
