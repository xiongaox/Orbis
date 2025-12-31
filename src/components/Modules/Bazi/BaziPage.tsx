/**
 * 八字模块页面容器
 */
import BaziCaseInfo from './BaziCaseInfo';
import BaziChart from './BaziChart';
import DayunLiunianPanel from './DayunLiunianPanel';
import type { BaziApiResponse } from '../../../types/bazi';
import type { Case } from '../../../types';

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
                />
                <DayunLiunianPanel
                    data={baziData}
                    loading={loading}
                    selectedDaYunIndex={selectedDaYunIndex}
                    selectedLiuNianYear={selectedLiuNianYear}
                    onSelectDaYun={setSelectedDaYunIndex}
                    onSelectLiuNian={setSelectedLiuNianYear}
                />
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
