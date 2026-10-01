/**
 * 关键职责：
 * - 为奇门案例卡片计算「盘状态」：把排盘结果的全局格局徽标（globalPatterns）
 *   原样下放到侧栏，与页头 QimenHeader 展示的是同一份数据、同一组文字
 *   （label），不筛选、不改写；常规局为空数组，卡片不渲染状态标签。
 * - 结果按「排盘方式 + 求测时间 + 局数」做模块级缓存，列表刷新只算缺失项。
 * - 案例自带 pai_pan_method（保存时固化）；旧数据缺失时用调用方传入的
 *   fallbackMethod（当前页面的排盘方法）兜底，保证侧栏状态与选中案例
 *   时盘面实际排盘一致。
 */

import { useEffect, useState } from 'react';
import { calculateQimen, type PaiPanMethod } from '../../../../lib/csp-qimen/qimenService';
import type { GlobalPattern } from '../../../../lib/csp-qimen/patternDetector';
import type { QimenCase } from '../../../../services/qimenCaseService';

/** key → 页头同款格局徽标列表；null 表示该盘不可用（时间无效 / 计算失败） */
const STATUS_CACHE = new Map<string, GlobalPattern[] | null>();

const methodOf = (caseItem: QimenCase, fallbackMethod: PaiPanMethod) => caseItem.pai_pan_method ?? fallbackMethod;

const cacheKey = (caseItem: QimenCase, fallbackMethod: PaiPanMethod) =>
  `${methodOf(caseItem, fallbackMethod)}|${caseItem.test_date}|${caseItem.qimen_data?.custom_ju ?? 0}`;

async function computePatterns(caseItem: QimenCase, method: PaiPanMethod): Promise<GlobalPattern[] | null> {
  const juRaw = caseItem.qimen_data?.custom_ju;
  const customJu = typeof juRaw === 'number' ? juRaw : 0;
  const date = new Date(caseItem.test_date);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const result = await calculateQimen(
      { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() },
      method,
      customJu,
    );
    if (!result) return null;
    return result.globalPatterns;
  } catch {
    return null;
  }
}

/**
 * @param cases 当前列表案例（任意顺序）
 * @param fallbackMethod 旧案例（无 pai_pan_method 字段）的兜底排盘方法
 * @returns caseId → 与页头一致的全局格局徽标列表（常规局为空数组）
 */
export function useQimenCasePanStatus(
  cases: QimenCase[],
  fallbackMethod: PaiPanMethod = 'zhirun',
): Record<string, GlobalPattern[]> {
  // 缓存命中变化时通过版本号触发重渲染，映射本身在渲染期同步构建
  const [, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    const missing = cases.filter((c) => !STATUS_CACHE.has(cacheKey(c, fallbackMethod)));
    if (missing.length === 0) return;

    (async () => {
      let computed = 0;
      for (const c of missing) {
        const patterns = await computePatterns(c, methodOf(c, fallbackMethod));
        STATUS_CACHE.set(cacheKey(c, fallbackMethod), patterns);
        computed += 1;
      }
      if (alive && computed > 0) setVersion((v) => v + 1);
    })();

    return () => { alive = false; };
  }, [cases, fallbackMethod]);

  const statusMap: Record<string, GlobalPattern[]> = {};
  for (const c of cases) {
    const cached = STATUS_CACHE.get(cacheKey(c, fallbackMethod));
    if (cached && cached.length > 0) statusMap[c.id] = cached;
  }
  return statusMap;
}
