/**
 * 八字模块页面容器
 */
import { useState } from 'react';
import BaziCaseInfo from './BaziCaseInfo';
import BaziChart from './BaziChart';
import DayunLiunianPanel from './DayunLiunianPanel';
import WuxingStatusBar from './WuxingStatusBar';
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

    return (
        <>
            <BaziCaseInfo
                caseData={selectedCase}
                baziData={baziData}
                selectedDaYunIndex={selectedDaYunIndex}
                selectedLiuNianYear={selectedLiuNianYear}
            />
            <div className="flex-1 min-h-0 min-w-0 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 overflow-hidden px-6 pb-6">
                <BaziChart
                    data={baziData}
                    loading={loading}
                    selectedDaYunIndex={selectedDaYunIndex}
                    selectedLiuNianYear={selectedLiuNianYear}
                    showTaiMingShen={showTaiMingShen}
                />
                <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
                    {/* 五行旺衰信息条 */}
                    <div className="flex-shrink-0">
                        <WuxingStatusBar
                            baziData={baziData}
                            selectedLiuNianYear={selectedLiuNianYear}
                            showTaiMingShen={showTaiMingShen}
                            onToggleTaiMingShen={() => setShowTaiMingShen(!showTaiMingShen)}
                            hideDetails={hideDetails}
                            onToggleHideDetails={() => setHideDetails(!hideDetails)}
                            onGoToCurrentYear={() => {
                                const nowYear = new Date().getFullYear();
                                setSelectedLiuNianYear(nowYear);
                                // 同时跳转到对应的大运
                                if (baziData?.daYun) {
                                    const targetDaYun = baziData.daYun.find(dy => nowYear >= dy.startYear && nowYear <= dy.endYear);
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
