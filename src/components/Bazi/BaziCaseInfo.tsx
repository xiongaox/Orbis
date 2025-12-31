import { Copy, Edit2, Share2 } from 'lucide-react';
import type { Case } from '../../types';
import type { BaziApiResponse } from '../../types/bazi';

interface BaziCaseInfoProps {
  caseData: Case | null;
  baziData: BaziApiResponse | null;
  selectedDaYunIndex?: number | null;
  selectedLiuNianYear?: number | null;
}

export default function BaziCaseInfo({
  caseData,
  baziData,
  selectedDaYunIndex,
  selectedLiuNianYear,
}: BaziCaseInfoProps) {
  // 使用 API 返回的数据，如果没有则使用 case 数据
  const displayName = caseData?.name || '当前时间';
  const displayGender = baziData?.gender || (caseData?.gender === 'male' ? '乾造' : '坤造');
  const displayLunar = baziData?.lunarDate || caseData?.lunar_date || '-';
  const displaySolar = baziData?.solarDate || caseData?.solar_date || '-';

  // 预留：选中的大运/流年可在未来用于显示更多详情
  void selectedDaYunIndex;
  void selectedLiuNianYear;

  return (
    <div className="bg-card rounded-xl border border-border p-4 mx-6 mt-6 mb-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="font-display text-xl text-primary">案</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display text-lg font-medium text-foreground">{displayName}</h2>
              <span className="text-xs px-2 py-0.5 bg-secondary rounded text-muted-foreground">
                {displayGender}
              </span>
              {baziData?.zodiac && (
                <span className="text-xs px-2 py-0.5 bg-secondary rounded text-muted-foreground">
                  {baziData.zodiac}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>阴历：{displayLunar}</span>
              <span>阳历：{displaySolar}</span>
            </div>
            {baziData?.yunInfo && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span>
                  起运：{baziData.yunInfo.startYear}年{baziData.yunInfo.startMonth}月{baziData.yunInfo.startDay}天后
                </span>
                <span>起运日期：{baziData.yunInfo.startSolarDate}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
