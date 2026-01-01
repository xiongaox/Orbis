import { Copy, Edit2, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { baziCaseService } from '../../../services/baziCaseService';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import type { Case } from '../../../types';
import type { BaziApiResponse } from '../../../types/bazi';

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
  const { isAuthenticated } = useAuth();
  const [saving, setSaving] = useState(false);

  // 使用 API 返回的数据，如果没有则使用 case 数据
  const displayName = caseData?.name || '当前时间';
  const displayGender = baziData?.gender || (caseData?.gender === 'male' ? '乾造' : '坤造');
  const displayLunar = baziData?.lunarDate || caseData?.lunar_date || '-';
  const displaySolar = baziData?.solarDate || caseData?.solar_date || '-';

  // 预留：选中的大运/流年可在未来用于显示更多详情
  void selectedDaYunIndex;
  void selectedLiuNianYear;

  const parseSolarDate = (value?: string) => {
    if (!value) return null;
    const match = value.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{1,2})/);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0
    );
  };

  const handleSaveCurrent = async () => {
    if (!baziData || caseData) return;

    if (!isAuthenticated) {
      alert('请先登录');
      return;
    }

    const parsedDate = parseSolarDate(baziData.solarDate);
    const fallbackDate = new Date();
    const birthDate = parsedDate ?? fallbackDate;
    const gender = baziData.gender === '坤造' ? 'female' : 'male';
    const nameTime = `${birthDate.getHours().toString().padStart(2, '0')}${birthDate
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    setSaving(true);
    try {
      await baziCaseService.createCase({
        name: `时间${nameTime}`,
        gender,
        birth_date: birthDate.toISOString(),
        tags: [],
        notes: '',
      });
      window.dispatchEvent(new CustomEvent(BAZI_CASES_CHANGED_EVENT));
      alert('已保存');
    } catch (error) {
      console.error('保存当前排盘失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

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
          {!caseData && (
            <button
              type="button"
              onClick={handleSaveCurrent}
              disabled={!baziData || saving}
              className="px-3 py-2 text-sm rounded-lg border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存当前排盘'}
            </button>
          )}
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
