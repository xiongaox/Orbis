import { useState, useMemo } from 'react';
import { getElementColor, getShiShenAbbr } from '../../../utils/metaphysics';
import type { BaziApiResponse } from '../../../types/bazi';

interface DayunLiunianPanelProps {
  data: BaziApiResponse | null;
  loading?: boolean;
  currentYear?: number;
  selectedDaYunIndex?: number | null;
  selectedLiuNianYear?: number | null;
  selectedLiuYueIndex?: number | null;
  onSelectDaYun?: (index: number | null) => void;
  onSelectLiuNian?: (year: number | null) => void;
  onSelectLiuYue?: (index: number | null) => void;
}

export default function DayunLiunianPanel({
  data,
  loading = false,
  currentYear = new Date().getFullYear(),
  selectedDaYunIndex: propDaYunIndex,
  selectedLiuNianYear: propLiuNianYear,
  selectedLiuYueIndex: propLiuYueIndex,
  onSelectDaYun,
  onSelectLiuNian,
  onSelectLiuYue,
}: DayunLiunianPanelProps) {
  // 内部状态（当外部不控制时使用）
  const [internalDaYunIndex, setInternalDaYunIndex] = useState<number | null>(null);
  const [internalLiuNianYear, setInternalLiuNianYear] = useState<number | null>(null);

  // 大运分页状态（每页显示10个大运）
  const [daYunPage, setDaYunPage] = useState(0);

  // 使用外部状态或内部状态
  const selectedDaYunIndex = propDaYunIndex !== undefined ? propDaYunIndex : internalDaYunIndex;
  const selectedLiuNianYear = propLiuNianYear !== undefined ? propLiuNianYear : internalLiuNianYear;

  // 所有 useMemo hooks 必须在条件返回之前定义
  const daYun = data?.daYun ?? [];
  const liuNian = data?.liuNian ?? [];
  const currentXiaoYun = data?.currentXiaoYun ?? [];
  const pillars = data?.pillars ?? [];

  // 获取日主（日柱天干）
  const dayMaster = pillars[2]?.tiangan || '丙';

  // 过滤大运：现在我们利用 index=0（或我们手动插入的 index=-1）作为小运/起运前
  // 每页显示10个大运，支持分页
  const displayDaYun = useMemo(() => {
    const startIdx = daYunPage * 10;
    return daYun.slice(startIdx, startIdx + 10);
  }, [daYun, daYunPage]);

  // 计算总页数
  const totalDaYunPages = useMemo(() => {
    return Math.ceil(daYun.length / 10);
  }, [daYun]);

  // 根据当前时间自动确定当前大运
  const autoDaYunIndex = useMemo(() => {
    const found = daYun.find(dy => currentYear >= dy.startYear && currentYear <= dy.endYear);
    return found?.index ?? 1;
  }, [daYun, currentYear]);

  // 当前激活的大运索引
  const activeDaYunIndex = selectedDaYunIndex ?? autoDaYunIndex;

  // 获取激活大运对应的流年（如果为空则默认第一个大运）
  const displayLiuNian = useMemo(() => {
    let result = liuNian.filter(ln => ln.dayunIndex === activeDaYunIndex);
    // 如果当前大运没有流年数据，默认显示第一个大运的流年
    if (result.length === 0) {
      result = liuNian.filter(ln => ln.dayunIndex === 1);
    }
    return result.slice(0, 10);
  }, [liuNian, activeDaYunIndex]);

  // 获取激活大运对应的小运
  const displayXiaoYun = useMemo(() => {
    // 小运数据现在包含 dayunIndex 字段
    const result = currentXiaoYun.filter(xy => xy.dayunIndex === activeDaYunIndex);
    // 如果当前大运没有小运，尝试显示第一个大运的
    if (result.length === 0) {
      return currentXiaoYun.filter(xy => xy.dayunIndex === 1).slice(0, 10);
    }
    return result.slice(0, 10);
  }, [currentXiaoYun, activeDaYunIndex]);

  // 流月数据 - 从选中的流年中获取（必须在条件返回之前）
  const displayLiuYue = useMemo(() => {
    // 如果选中了流年，尝试获取对应的流月
    if (selectedLiuNianYear) {
      const selectedYear = displayLiuNian.find(ln => ln.year === selectedLiuNianYear);
      if (selectedYear?.liuYue && selectedYear.liuYue.length > 0) {
        return selectedYear.liuYue.slice(0, 12);
      }
    }
    // 否则尝试显示当前年份的流月数据
    const currentYearData = displayLiuNian.find(ln => ln.year === currentYear);
    if (currentYearData?.liuYue && currentYearData.liuYue.length > 0) {
      return currentYearData.liuYue.slice(0, 12);
    }
    // 最后回退到第一个流年的流月数据
    if (displayLiuNian.length > 0 && displayLiuNian[0].liuYue) {
      return displayLiuNian[0].liuYue.slice(0, 12);
    }
    return [];
  }, [displayLiuNian, selectedLiuNianYear, currentYear]);

  // 节气月份映射（用于显示）
  const jieqiLabels = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];

  // Loading 状态
  if (loading) {
    return (
      <div className="min-h-0 min-w-0 overflow-hidden flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // 无数据状态
  if (!data) {
    return (
      <div className="min-h-0 min-w-0 overflow-hidden flex items-center justify-center">
        <div className="text-muted-foreground">请选择案例</div>
      </div>
    );
  }

  // 处理大运点击
  const handleDaYunClick = (index: number) => {
    const newIndex = index === selectedDaYunIndex ? null : index;
    if (onSelectDaYun) {
      onSelectDaYun(newIndex);
    } else {
      setInternalDaYunIndex(newIndex);
    }

    // 切换大运时，清空流年选择（不自动选择第一年）
    // 用户需要手动点击流年才会选中
    if (onSelectLiuNian) {
      onSelectLiuNian(null);
    } else {
      setInternalLiuNianYear(null);
    }
  };

  // 处理流年点击
  const handleLiuNianClick = (year: number) => {
    const newYear = year === selectedLiuNianYear ? null : year;
    if (onSelectLiuNian) {
      onSelectLiuNian(newYear);
    } else {
      setInternalLiuNianYear(newYear);
    }
  };

  return (
    <div className="min-h-0 min-w-0 overflow-hidden">
      <div className="bg-card rounded-xl border border-border overflow-hidden h-fit flex flex-col">
        {/* 大运行 */}
        <div className="border-b border-border">
          <div className="flex items-stretch">
            <div className="w-10 bg-secondary/30 border-r border-border flex flex-col items-center justify-center gap-0.5">
              {/* 上一页按钮 */}
              {totalDaYunPages > 1 && (
                <button
                  onClick={() => setDaYunPage(p => Math.max(0, p - 1))}
                  disabled={daYunPage === 0}
                  className={`w-5 h-4 flex items-center justify-center rounded text-[10px] transition-colors
                    ${daYunPage === 0
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : 'text-muted-foreground hover:bg-primary/20 hover:text-primary cursor-pointer'}`}
                  title={daYunPage > 0 ? `上一页 (${daYunPage}/${totalDaYunPages})` : '已是第一页'}
                >
                  ▲
                </button>
              )}

              {/* 大运标题 */}
              <div className="text-base text-foreground/70 font-medium leading-none flex flex-col items-center gap-0.5">
                <span>大</span>
                <span>运</span>
              </div>

              {/* 页码提示 */}
              {totalDaYunPages > 1 && (
                <div className="text-[9px] text-muted-foreground/60 leading-none">
                  {daYunPage + 1}/{totalDaYunPages}
                </div>
              )}

              {/* 下一页按钮 */}
              {totalDaYunPages > 1 && (
                <button
                  onClick={() => setDaYunPage(p => Math.min(totalDaYunPages - 1, p + 1))}
                  disabled={daYunPage >= totalDaYunPages - 1}
                  className={`w-5 h-4 flex items-center justify-center rounded text-[10px] transition-colors
                    ${daYunPage >= totalDaYunPages - 1
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : 'text-muted-foreground hover:bg-primary/20 hover:text-primary cursor-pointer'}`}
                  title={daYunPage < totalDaYunPages - 1 ? `下一页 (${daYunPage + 2}/${totalDaYunPages})` : '已是最后一页'}
                >
                  ▼
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0 overflow-x-auto flex flex-col">
              <div className="grid grid-cols-10 min-w-0 w-full flex-1">
                {displayDaYun.map((item) => {
                  const isActive = item.index === activeDaYunIndex;
                  return (
                    <div
                      key={`dayun-${item.index}`}
                      className={`min-w-0 p-3 border-r border-border last:border-r-0 cursor-pointer transition-colors hover:bg-primary/10 h-full flex flex-col justify-center ${isActive ? 'bg-primary/5' : ''
                        }`}
                      onClick={() => handleDaYunClick(item.index)}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="flex flex-col items-center gap-1">
                          {/* 优化3：只显示起始岁数 */}
                          <div className="text-sm text-muted-foreground leading-snug">
                            {item.startAge}岁
                          </div>
                          <div className="text-sm text-muted-foreground leading-snug">
                            {item.startYear}
                          </div>
                        </div>
                        <div className="mt-3 space-y-1">
                          <div className="flex items-baseline justify-center gap-x-1">
                            <span
                              className="font-display text-lg text-foreground leading-none"
                              style={{ color: getElementColor(item.tiangan) }}
                            >
                              {item.tiangan}
                            </span>
                            <span className="text-base text-muted-foreground leading-none">
                              {getShiShenAbbr(dayMaster, item.tiangan)}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-center gap-x-1">
                            <span
                              className="font-display text-lg text-foreground leading-none"
                              style={{ color: getElementColor(item.dizhi) }}
                            >
                              {item.dizhi}
                            </span>
                            <span className="text-base text-muted-foreground leading-none">
                              {getShiShenAbbr(dayMaster, item.dizhi)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 流年行 */}
        <div className="border-b border-border">
          <div className="flex">
            <div className="w-10 bg-secondary/30 border-r border-border flex items-center justify-center">
              <div className="flex flex-col items-center justify-between h-full py-3">
                <div className="text-base text-foreground/70 font-medium leading-none flex flex-col items-center gap-1">
                  <span>流</span>
                  <span>年</span>
                </div>
                <div className="text-base text-foreground/70 font-medium leading-none flex flex-col items-center gap-1">
                  <span>小</span>
                  <span>运</span>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="grid grid-cols-10 min-w-0 w-full">
                {displayLiuNian.map((item, idx) => {
                  const xiaoyun = displayXiaoYun[idx];
                  const isCurrentYear = item.year === currentYear;
                  const isSelected = item.year === selectedLiuNianYear;
                  // 只有当是第10个格子时才移除右边框
                  const isLastColumn = idx === 9;
                  return (
                    <div
                      key={item.year}
                      className={`min-w-0 p-3 border-r border-border cursor-pointer transition-colors hover:bg-primary/10 ${isLastColumn ? '!border-r-0' : ''} ${isSelected ? 'bg-primary/10' : isCurrentYear ? 'bg-primary/5' : ''
                        }`}
                      onClick={() => handleLiuNianClick(item.year)}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="text-sm text-foreground leading-snug">{item.year}</div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-baseline justify-center gap-x-1">
                            <span
                              className="font-display text-lg text-foreground leading-none"
                              style={{ color: getElementColor(item.tiangan) }}
                            >
                              {item.tiangan}
                            </span>
                            <span className="text-base text-muted-foreground leading-none">
                              {getShiShenAbbr(dayMaster, item.tiangan)}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-center gap-x-1">
                            <span
                              className="font-display text-lg text-foreground leading-none"
                              style={{ color: getElementColor(item.dizhi) }}
                            >
                              {item.dizhi}
                            </span>
                            <span className="text-base text-muted-foreground leading-none">
                              {getShiShenAbbr(dayMaster, item.dizhi)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground leading-none">
                          {xiaoyun?.ganZhi || '-'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 流月行 */}
        <div className="overflow-hidden">
          <div className="flex">
            <div className="w-10 bg-secondary/30 border-r border-border flex items-center justify-center">
              <div className="text-base text-muted-foreground font-medium leading-none flex flex-col items-center gap-1">
                <span>流</span>
                <span>月</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="grid grid-cols-12 min-w-0 w-full">
                {displayLiuYue.length > 0 ? (
                  displayLiuYue.map((item, idx) => {
                    const isSelected = propLiuYueIndex === item.index;
                    return (
                      <div
                        key={`liuyue-${idx}`}
                        className={`min-w-0 p-3 border-r border-border last:border-r-0 cursor-pointer transition-colors hover:bg-primary/10 ${isSelected ? 'bg-primary/10' : ''}`}
                        onClick={() => {
                          const newIndex = item.index === propLiuYueIndex ? null : item.index;
                          if (onSelectLiuYue) {
                            onSelectLiuYue(newIndex);
                          }
                        }}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-xs text-muted-foreground leading-snug">
                              {jieqiLabels[item.index] || item.month}月
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-baseline justify-center gap-x-1">
                              <span
                                className="font-display text-lg text-foreground leading-none"
                                style={{ color: item.tiangan ? getElementColor(item.tiangan) : 'inherit' }}
                              >
                                {item.tiangan || '-'}
                              </span>
                              <span className="text-base text-muted-foreground leading-none">
                                {item.tiangan ? getShiShenAbbr(dayMaster, item.tiangan) : ''}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-center gap-x-1">
                              <span
                                className="font-display text-lg text-foreground leading-none"
                                style={{ color: item.dizhi ? getElementColor(item.dizhi) : 'inherit' }}
                              >
                                {item.dizhi || '-'}
                              </span>
                              <span className="text-base text-muted-foreground leading-none">
                                {item.dizhi ? getShiShenAbbr(dayMaster, item.dizhi) : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // 空状态占位
                  Array.from({ length: 12 }).map((_, idx) => (
                    <div
                      key={`placeholder-${idx}`}
                      className="min-w-0 p-3 border-r border-border last:border-r-0"
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="text-xs text-muted-foreground leading-snug">-</div>
                        <div className="mt-2 space-y-1">
                          <div className="font-display text-lg text-foreground leading-none">-</div>
                          <div className="font-display text-lg text-foreground leading-none">-</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
