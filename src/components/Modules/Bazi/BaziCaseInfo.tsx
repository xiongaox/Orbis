/**
 * BaziCaseInfo - 应用源码层
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
 * - `default BaziCaseInfo`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `lucide-react`、外部依赖 `react`、外部依赖 `classnames` 等 13 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { GitBranch, ArrowRightLeft, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import classNames from 'classnames';
import { useAuth } from '../../../contexts/useAuth';
import { baziCaseService } from '../../../services/baziCaseService';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import type { Case } from '../../../types';
import type { BaziApiResponse } from '../../../types/bazi';
import GanZhiDiagramModal from './GanZhiDiagramModal';
import GanZhiLiuTongModal from './GanZhiLiuTongModal';
import AiPromptModal from './AiPromptModal';
import { useIsPadLandscape } from '../../../hooks/useIsPadLandscape';
import { calcJiaoYunInfo } from '../../../utils/yunInfoUtils';

interface BaziCaseInfoProps {
  caseData: Case | null;
  baziData: BaziApiResponse | null;
  selectedDaYunIndex?: number | null;
  selectedLiuNianYear?: number | null;
  currentYear?: number;
  isMobileLayout?: boolean;
}

export default function BaziCaseInfo({
  caseData,
  baziData,
  selectedDaYunIndex,
  selectedLiuNianYear,
  currentYear,
  isMobileLayout = false,
}: BaziCaseInfoProps) {
  const { isAuthenticated } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [showLiuTong, setShowLiuTong] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(true);
  const isPadLandscape = useIsPadLandscape();

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
      <div className={classNames(
        'bg-card rounded-xl border border-[hsl(var(--border-light))] dark:border-border flex-shrink-0',
        isMobileLayout ? 'p-2 mx-2 mt-2 mb-2' : 'p-4 mx-6 mt-6 mb-4'
      )}>
        {isMobileLayout ? (
          /* === 移动端布局 === */
          <div className="space-y-2">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setMobileCollapsed(!mobileCollapsed)}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {baziData?.zodiac ? (
                  <img
                    src={`/zodiac/${baziData.zodiac}.svg`}
                    alt={baziData.zodiac}
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <span className="font-display text-sm text-primary">案</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <h2 className="font-display text-base font-medium text-[hsl(var(--card-title))] dark:text-foreground truncate">{displayName}</h2>
                  <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--muted-hover))] border border-[hsl(var(--border-light))] dark:bg-secondary dark:border-border rounded text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground shrink-0">
                    {displayGender}
                  </span>
                  {baziData?.zodiac && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--muted-hover))] border border-[hsl(var(--border-light))] dark:bg-secondary dark:border-border rounded text-[hsl(var(--text-secondary-light))] dark:text-muted-foreground shrink-0">
                      {baziData.zodiac}
                    </span>
                  )}
                  {/* 折叠指示图标 */}
                  <span className="ml-auto p-0.5 text-muted-foreground shrink-0">
                    {mobileCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-[hsl(var(--card-time))] dark:text-muted-foreground">
                  <div className="truncate">阴：{displayLunar}</div>
                  <div className="truncate">阳：{displaySolar}</div>
                  {!mobileCollapsed && baziData?.yunInfo && (
                    <>
                      <div className="truncate text-[hsl(var(--text-tertiary-light))] dark:text-muted-foreground">
                        起运：出生后{baziData.yunInfo.startYear}年{baziData.yunInfo.startMonth}月{baziData.yunInfo.startDay}天后
                      </div>
                      <div className="truncate text-[hsl(var(--text-tertiary-light))] dark:text-muted-foreground">
                        起运日期：{baziData.yunInfo.startSolarDate}
                      </div>
                      <div className="col-span-2 truncate text-[hsl(var(--text-tertiary-light))] dark:text-muted-foreground">
                        {calcJiaoYunInfo(baziData.yunInfo.startSolarDate)}
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* 可折叠内容：操作按钮 */}
            {!mobileCollapsed && (
              <div className="flex items-center gap-2 pt-1">
                {!caseData && (
                  <button
                    type="button"
                    onClick={handleSaveCurrent}
                    disabled={!baziData || saving}
                    className="flex-1 h-8 text-xs rounded-lg border border-[hsl(var(--accent-primary)/0.4)] text-[hsl(var(--accent-primary))] hover:bg-[hsl(var(--accent-primary)/0.1)] dark:border-primary/40 dark:text-primary dark:hover:bg-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? '保存中...' : '保存排盘'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDiagram(true)}
                  disabled={!baziData}
                  className="flex-1 h-8 text-xs rounded-lg border border-border hover:bg-muted flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  图解
                </button>
                <button
                  type="button"
                  onClick={() => setShowLiuTong(true)}
                  disabled={!baziData}
                  className="flex-1 h-8 text-xs rounded-lg border border-border hover:bg-muted flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  流通
                </button>
                <button
                  type="button"
                  onClick={() => setShowAiPrompt(true)}
                  disabled={!baziData}
                  className="flex-1 h-8 text-xs rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 flex items-center justify-center gap-1 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI
                </button>
              </div>
            )}
          </div>
        ) : (
          /* === 桌面端/Pad端原有布局（不修改） === */
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
                  <>
                    <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-tertiary-light))] dark:text-muted-foreground mt-1">
                      <span>
                        起运：出生后{baziData.yunInfo.startYear}年{baziData.yunInfo.startMonth}月{baziData.yunInfo.startDay}天后
                      </span>
                      <span>起运日期：{baziData.yunInfo.startSolarDate}</span>
                      {/* 桌面端：交运与起运同行 */}
                      {!isPadLandscape && (
                        <span>{calcJiaoYunInfo(baziData.yunInfo.startSolarDate)}</span>
                      )}
                    </div>
                    {/* Pad 端：交运独立一行 */}
                    {isPadLandscape && (
                      <div className="text-xs text-[hsl(var(--text-tertiary-light))] dark:text-muted-foreground mt-1">
                        {calcJiaoYunInfo(baziData.yunInfo.startSolarDate)}
                      </div>
                    )}
                  </>
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
              <button
                type="button"
                onClick={() => setShowAiPrompt(true)}
                disabled={!baziData}
                className="px-3 py-2 text-sm rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 flex items-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                AI提示词
              </button>
            </div>
          </div>
        )
        }
      </div >

      {/* 干支图解弹窗 */}
      < GanZhiDiagramModal
        isOpen={showDiagram}
        onClose={() => setShowDiagram(false)}
        baziData={baziData}
        selectedDaYunIndex={selectedDaYunIndex ?? null}
        selectedLiuNianYear={selectedLiuNianYear ?? null}
        currentYear={currentYear}
      />

      {/* 干支流通弹窗 */}
      < GanZhiLiuTongModal
        isOpen={showLiuTong}
        onClose={() => setShowLiuTong(false)}
        baziData={baziData}
        selectedDaYunIndex={selectedDaYunIndex ?? null}
        selectedLiuNianYear={selectedLiuNianYear ?? null}
        currentYear={currentYear}
      />

      {/* AI 提示词弹窗 */}
      < AiPromptModal
        isOpen={showAiPrompt}
        onClose={() => setShowAiPrompt(false)}
        data={baziData}
        selectedLiuNianYear={selectedLiuNianYear ?? null}
        selectedDaYunIndex={selectedDaYunIndex ?? null}
      />
    </>
  );
}
