import { GitBranch, ArrowRightLeft } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { baziCaseService } from '../../../services/baziCaseService';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import type { Case } from '../../../types';
import type { BaziApiResponse } from '../../../types/bazi';
import GanZhiDiagramModal from './GanZhiDiagramModal';
import GanZhiLiuTongModal from './GanZhiLiuTongModal';

interface BaziCaseInfoProps {
  caseData: Case | null;
  baziData: BaziApiResponse | null;
  selectedDaYunIndex?: number | null;
  selectedLiuNianYear?: number | null;
  currentYear?: number;
}

export default function BaziCaseInfo({
  caseData,
  baziData,
  selectedDaYunIndex,
  selectedLiuNianYear,
  currentYear,
}: BaziCaseInfoProps) {
  const { isAuthenticated } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [showLiuTong, setShowLiuTong] = useState(false);

  // 使用 API 返回的数据，如果没有则使用 case 数据
  const displayName = caseData?.name || '当前时间';
  const displayGender = baziData?.gender || (caseData?.gender === 'male' ? '乾造' : '坤造');
  const displayLunar = baziData?.lunarDate || caseData?.lunar_date || '-';
  const displaySolar = baziData?.solarDate || caseData?.solar_date || '-';

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
    <>
      <div className="bg-card rounded-xl border border-[hsl(var(--border-light))] dark:border-border p-4 mx-6 mt-6 mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {baziData?.zodiac ? (
                <img
                  src={`/zodiac/${baziData.zodiac}.svg`}
                  alt={baziData.zodiac}
                  className="w-14 h-14 object-contain"
                />
              ) : (
                <span className="font-display text-xl text-primary">案</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display text-lg font-medium text-[hsl(var(--card-title))] dark:text-foreground">{displayName}</h2>
                <span className="text-xs px-2 py-0.5 bg-[hsl(var(--muted-hover))] border border-[hsl(var(--border-light))] dark:bg-secondary dark:border-border rounded text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground">
                  {displayGender}
                </span>
                {baziData?.zodiac && (
                  <span className="text-xs px-2 py-0.5 bg-[hsl(var(--muted-hover))] border border-[hsl(var(--border-light))] dark:bg-secondary dark:border-border rounded text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground">
                    {baziData.zodiac}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-[hsl(var(--card-time))] dark:text-muted-foreground">
                <span>阴历：{displayLunar}</span>
                <span>阳历：{displaySolar}</span>
              </div>
              {baziData?.yunInfo && (
                <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-tertiary-light))] dark:text-muted-foreground mt-1">
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
                className="px-3 py-2 text-sm rounded-lg border border-[hsl(var(--accent-primary)/0.4)] text-[hsl(var(--accent-primary))] hover:bg-[hsl(var(--accent-primary)/0.1)] dark:border-primary/40 dark:text-primary dark:hover:bg-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '保存当前排盘'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDiagram(true)}
              disabled={!baziData}
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <GitBranch className="w-4 h-4" />
              干支图解
            </button>
            <button
              type="button"
              onClick={() => setShowLiuTong(true)}
              disabled={!baziData}
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ArrowRightLeft className="w-4 h-4" />
              干支流通
            </button>
          </div>
        </div>
      </div>

      {/* 干支图解弹窗 */}
      <GanZhiDiagramModal
        isOpen={showDiagram}
        onClose={() => setShowDiagram(false)}
        baziData={baziData}
        selectedDaYunIndex={selectedDaYunIndex ?? null}
        selectedLiuNianYear={selectedLiuNianYear ?? null}
        currentYear={currentYear}
      />

      {/* 干支流通弹窗 */}
      <GanZhiLiuTongModal
        isOpen={showLiuTong}
        onClose={() => setShowLiuTong(false)}
        baziData={baziData}
        selectedDaYunIndex={selectedDaYunIndex ?? null}
        selectedLiuNianYear={selectedLiuNianYear ?? null}
        currentYear={currentYear}
      />
    </>
  );
}
