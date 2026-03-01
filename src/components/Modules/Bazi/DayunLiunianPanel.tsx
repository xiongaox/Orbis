/**
 * DayunLiunianPanel - 应用源码层
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
 * - `default DayunLiunianPanel`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `bazi`、内部模块 `dayunLiunianUtils` 等 6 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState, useMemo, useEffect } from 'react';
import type { BaziApiResponse } from '../../../types/bazi';
import { checkLiunianStatus } from './utils/dayunLiunianUtils';

// 子组件导入
import DaYunRow from './components/DaYunRow';
import LiuNianRow from './components/LiuNianRow';
import LiuYueRow from './components/LiuYueRow';

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
  isMobileLayout?: boolean;
}

const EMPTY_DAYUN: BaziApiResponse['daYun'] = [];
const EMPTY_LIUNIAN: BaziApiResponse['liuNian'] = [];
const EMPTY_XIAOYUN: BaziApiResponse['currentXiaoYun'] = [];
const EMPTY_PILLARS: BaziApiResponse['pillars'] = [];

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
  isMobileLayout = false,
}: DayunLiunianPanelProps) {
  // 内部状态
  const [internalDaYunIndex, setInternalDaYunIndex] = useState<number | null>(null);
  const [internalLiuNianYear, setInternalLiuNianYear] = useState<number | null>(null);
  const [activeHint, setActiveHint] = useState<{ year: number; message: string; type: 'danger' | 'warning' | 'success' } | null>(null);
  const [daYunPage, setDaYunPage] = useState(0);

  // 使用外部状态或内部状态
  const selectedDaYunIndex = propDaYunIndex !== undefined ? propDaYunIndex : internalDaYunIndex;
  const selectedLiuNianYear = propLiuNianYear !== undefined ? propLiuNianYear : internalLiuNianYear;

  // 数据提取
  const daYun = data?.daYun ?? EMPTY_DAYUN;
  const liuNian = data?.liuNian ?? EMPTY_LIUNIAN;
  const currentXiaoYun = data?.currentXiaoYun ?? EMPTY_XIAOYUN;
  const pillars = data?.pillars ?? EMPTY_PILLARS;
  const dayMaster = pillars[2]?.tiangan || '丙';

  // 大运分页显示
  const displayDaYun = useMemo(() => {
    const startIdx = daYunPage * 10;
    return daYun.slice(startIdx, startIdx + 10);
  }, [daYun, daYunPage]);

  const totalDaYunPages = useMemo(() => Math.ceil(daYun.length / 10), [daYun]);

  // 自动确定当前大运
  const autoDaYunIndex = useMemo(() => {
    const found = daYun.find(dy => currentYear >= dy.startYear && currentYear <= dy.endYear);
    return found?.index ?? 1;
  }, [daYun, currentYear]);

  const activeDaYunIndex = selectedDaYunIndex ?? autoDaYunIndex;

  // 获取激活大运对应的流年
  const displayLiuNian = useMemo(() => {
    let result = liuNian.filter(ln => ln.dayunIndex === activeDaYunIndex);
    if (result.length === 0) {
      result = liuNian.filter(ln => ln.dayunIndex === 1);
    }
    return result.slice(0, 10);
  }, [liuNian, activeDaYunIndex]);

  // 获取当前激活大运对象
  const activeDaYunObject = useMemo(() => {
    return daYun.find(d => d.index === activeDaYunIndex);
  }, [daYun, activeDaYunIndex]);

  // 获取激活大运对应的小运
  const displayXiaoYun = useMemo(() => {
    const result = currentXiaoYun.filter(xy => xy.dayunIndex === activeDaYunIndex);
    if (result.length === 0) {
      return currentXiaoYun.filter(xy => xy.dayunIndex === 1).slice(0, 10);
    }
    return result.slice(0, 10);
  }, [currentXiaoYun, activeDaYunIndex]);

  // 流月数据
  const displayLiuYue = useMemo(() => {
    if (selectedLiuNianYear) {
      const selectedYear = displayLiuNian.find(ln => ln.year === selectedLiuNianYear);
      if (selectedYear?.liuYue && selectedYear.liuYue.length > 0) {
        return selectedYear.liuYue.slice(0, 12);
      }
    }
    const currentYearData = displayLiuNian.find(ln => ln.year === currentYear);
    if (currentYearData?.liuYue && currentYearData.liuYue.length > 0) {
      return currentYearData.liuYue.slice(0, 12);
    }
    if (displayLiuNian.length > 0 && displayLiuNian[0].liuYue) {
      return displayLiuNian[0].liuYue.slice(0, 12);
    }
    return [];
  }, [displayLiuNian, selectedLiuNianYear, currentYear]);

  // 流年选中变化时更新提示
  useEffect(() => {
    if (selectedLiuNianYear) {
      const selectedItem = displayLiuNian.find(ln => ln.year === selectedLiuNianYear);
      if (selectedItem) {
        const status = checkLiunianStatus(selectedItem, activeDaYunObject, pillars);
        if (status) {
          setActiveHint({ year: selectedLiuNianYear, message: status.message, type: status.type });
        } else {
          setActiveHint(null);
        }
      }
    } else {
      setActiveHint(null);
    }
  }, [selectedLiuNianYear, displayLiuNian, activeDaYunObject, pillars]);

  // 数据切换时重置提示
  useEffect(() => {
    setActiveHint(null);
  }, [data]);

  // 大运切换时重置提示
  useEffect(() => {
    setActiveHint(null);
  }, [activeDaYunIndex]);

  // 处理大运点击
  const handleDaYunClick = (index: number) => {
    const newIndex = index === selectedDaYunIndex ? null : index;
    if (onSelectDaYun) {
      onSelectDaYun(newIndex);
    } else {
      setInternalDaYunIndex(newIndex);
    }
    // 切换大运时清空流年选择
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

  return (
    <div className="min-h-0 min-w-0 overflow-hidden">
      <div className="bg-card rounded-xl border border-border overflow-hidden h-fit flex flex-col">
        {/* 大运行 */}
        <DaYunRow
          displayDaYun={displayDaYun}
          activeDaYunIndex={activeDaYunIndex}
          dayMaster={dayMaster}
          daYunPage={daYunPage}
          totalDaYunPages={totalDaYunPages}
          onDaYunClick={handleDaYunClick}
          onPageChange={setDaYunPage}
          isMobileLayout={isMobileLayout}
        />

        {/* 流年行 */}
        <LiuNianRow
          displayLiuNian={displayLiuNian}
          displayXiaoYun={displayXiaoYun}
          selectedLiuNianYear={selectedLiuNianYear}
          currentYear={currentYear}
          dayMaster={dayMaster}
          activeDaYunObject={activeDaYunObject}
          pillars={pillars}
          activeHint={activeHint}
          onLiuNianClick={handleLiuNianClick}
          onHintClick={setActiveHint}
          isMobileLayout={isMobileLayout}
        />

        {/* 流月行 */}
        <LiuYueRow
          displayLiuYue={displayLiuYue}
          selectedLiuYueIndex={propLiuYueIndex}
          dayMaster={dayMaster}
          onSelectLiuYue={onSelectLiuYue}
          isMobileLayout={isMobileLayout}
        />
      </div>
    </div>
  );
}
