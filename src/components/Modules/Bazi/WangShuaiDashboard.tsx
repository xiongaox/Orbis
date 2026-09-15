/**
 * WangShuaiDashboard - 旺衰研判与格局看板组件
 *
 * 模块定位：
 * - 所在层级：业务组件层
 * - 主要目标：呈现确定性的子平四要素矩阵、能量天平与格局裁决看板
 * - 核心价值：零延迟秒开，逻辑严密自洽，杜绝指标打勾与身弱结论割裂的矛盾
 */

import { useState } from 'react';
import {
  Scale,
  Calendar,
  Mountain,
  Users,
  Flame,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileCode2,
  Compass,
  Zap,
  Target,
  Lightbulb,
} from 'lucide-react';
import type { WangShuaiDashboardData } from '../../../lib/xuan-bazi/skills/yueyuanWangShuaiSkill';

interface WangShuaiDashboardProps {
  data: WangShuaiDashboardData;
  rawLogs?: string[];
}

export default function WangShuaiDashboard({ data, rawLogs = [] }: WangShuaiDashboardProps) {
  const [showRawLogs, setShowRawLogs] = useState(false);
  const [showEnergyDetails, setShowEnergyDetails] = useState(false);

  const {
    dayMaster,
    yueZhi,
    pattern,
    finalVerdict,
    verdictDetail,
    verdictLevel,
    energyBalance,
    fourPillars,
    refereeSummary,
    godsGuide,
  } = data;

  // 判定结论徽章样式
  const getVerdictBadgeStyle = (level: string) => {
    if (level.includes('强') || level === '专旺') {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }
    if (level.includes('弱') || level === '从格') {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
  };

  return (
    <div className="space-y-3.5 text-xs sm:text-sm">
      {/* 1. 核心定调卡片 */}
      <div className="p-3.5 rounded-xl border border-border/80 bg-card/70 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-primary" />
              日主【{dayMaster}】· 生于【{yueZhi}月】
            </span>
            {pattern && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                {pattern}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">格局定调：</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getVerdictBadgeStyle(verdictLevel)}`}>
              {finalVerdict}
            </span>
          </div>
        </div>

        {verdictDetail && (
          <div className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-2 rounded-lg border border-border/40 flex items-start gap-1.5">
            <Scale className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground mr-1">核心倾向：</span>
              <span>{verdictDetail}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. 能量天平 (生扶党 vs 克泄耗党) */}
      <div className="p-3.5 rounded-xl border border-border/80 bg-card/70 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Scale className="w-4 h-4 text-indigo-500" />
            <span>气势天平 (生扶 vs 克泄耗)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowEnergyDetails((v) => !v)}
            className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            {showEnergyDetails ? '收起归属' : '明细比重'}
            {showEnergyDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* 比例进度条 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono font-medium">
            <span className="text-emerald-600 dark:text-emerald-400">
              生扶党羽 (印星·比劫) {energyBalance.shengPercent}%
            </span>
            <span className="text-orange-600 dark:text-orange-400">
              {energyBalance.kePercent}% 克泄耗党 (食伤·财星·官杀)
            </span>
          </div>

          <div className="h-2.5 w-full bg-muted/80 rounded-full overflow-hidden flex p-0.5 border border-border/50">
            <div
              className="h-full bg-linear-to-r from-teal-500 to-emerald-500 rounded-l-full transition-all duration-500"
              style={{ width: `${energyBalance.shengPercent}%` }}
            />
            <div
              className="h-full bg-linear-to-r from-amber-500 to-orange-500 rounded-r-full transition-all duration-500"
              style={{ width: `${energyBalance.kePercent}%` }}
            />
          </div>
        </div>

        {/* 展开的能量明细标签 */}
        {showEnergyDetails && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px]">
            <div className="space-y-1">
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">生扶阵营：</div>
              <div className="flex flex-wrap gap-1">
                {energyBalance.shengTags.map((tag, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-orange-600 dark:text-orange-400 font-semibold">克泄耗阵营：</div>
              <div className="flex flex-wrap gap-1">
                {energyBalance.keTags.map((tag, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. 子平四要素 2x2 矩阵网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* 要素 1：得令 */}
        <div className="p-3 rounded-xl border border-border/70 bg-card/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>得令 (月令天时)</span>
            </div>
            <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              fourPillars.deLing.passed
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              {fourPillars.deLing.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {fourPillars.deLing.tag}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {fourPillars.deLing.desc}
          </p>
        </div>

        {/* 要素 2：得地 */}
        <div className="p-3 rounded-xl border border-border/70 bg-card/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
              <Mountain className="w-3.5 h-3.5 text-stone-500" />
              <span>得地 (通根稳固)</span>
            </div>
            <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              fourPillars.deDi.passed
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              {fourPillars.deDi.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {fourPillars.deDi.tag}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {fourPillars.deDi.desc}
          </p>
        </div>

        {/* 要素 3：得生得助 */}
        <div className="p-3 rounded-xl border border-border/70 bg-card/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <span>得生得助 (干支党羽)</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                fourPillars.deSheng.passed
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                {fourPillars.deSheng.tag}
              </span>
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                fourPillars.deZhu.passed
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                {fourPillars.deZhu.tag}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {fourPillars.deSheng.desc} {fourPillars.deZhu.desc}
          </p>
        </div>

        {/* 要素 4：克泄耗势 */}
        <div className="p-3 rounded-xl border border-border/70 bg-card/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <span>全局克泄阻力 (局势战克)</span>
            </div>
            {data.heavyPatterns.length > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
                {data.heavyPatterns[0]}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {data.heavyPatterns.length > 0
              ? `${data.heavyPatterns.join('、')}成势，极大增强了财官食伤力量。`
              : '全局无明显大会合局，以常态干支生克流转为主。'}
            {data.clashCombinations.length > 0 && ` 同时见 ${data.clashCombinations.join('、')}。`}
          </p>
        </div>
      </div>

      {/* 4. 子平裁决词综述 */}
      <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Zap className="w-3.5 h-3.5" />
          <span>子平裁决综述</span>
        </div>
        <p className="text-xs leading-relaxed text-foreground/90 font-mono">
          {refereeSummary}
        </p>
      </div>

      {/* 5. 喜用神指引 */}
      <div className="p-3.5 rounded-xl border border-border/80 bg-card/70 shadow-xs space-y-2">
        <div className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>取用与喜忌指引</span>
          </span>
          <span className="text-[11px] font-normal text-muted-foreground">根据旺衰与原局病药权衡</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">喜用:</span>
            {godsGuide.fuyongXi.map((xi, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                {xi}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
            <span className="font-semibold text-red-600 dark:text-red-400 shrink-0">忌神:</span>
            {godsGuide.fuyongJi.map((ji, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                {ji}
              </span>
            ))}
          </div>
        </div>

        {godsGuide.tiaohouAdvice && (
          <div className="text-[11px] text-muted-foreground leading-relaxed pt-1 flex items-start gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-foreground">调候与调摄建议：</span>
              <span>{godsGuide.tiaohouAdvice}</span>
            </div>
          </div>
        )}
      </div>

      {/* 6. 可选：底层推演步骤日志折叠块 */}
      {((rawLogs && rawLogs.length > 0) || (data.physicsLog && data.physicsLog.length > 0)) && (() => {
        const logsToShow = rawLogs && rawLogs.length > 0 ? rawLogs : (data.physicsLog || []);
        return (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowRawLogs((v) => !v)}
              className="w-full flex items-center justify-between p-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5" />
                <span>跃渊子平底层推演日志 (离散规则引擎 · {logsToShow.length}步)</span>
              </span>
              {showRawLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showRawLogs && (
              <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border space-y-1.5 max-h-48 overflow-y-auto text-xs font-mono">
                {logsToShow.map((log, idx) => (
                  <div key={idx} className="leading-relaxed text-muted-foreground flex items-start gap-1.5">
                    <span className="select-none text-primary/60 font-semibold">{idx + 1}.</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
