/**
 * useIsPadLandscape - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：提供复用状态和副作用逻辑的自定义 Hook
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `useIsPadLandscape`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `useMediaQuery`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useMemo } from 'react';

import { useMediaQuery } from './useMediaQuery';

export function useIsPadLandscape() {
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const isLandscapeFallback = useMediaQuery('(min-aspect-ratio: 1/1)');
  const isPadWidth = useMediaQuery('(min-width: 768px) and (max-width: 1366px)');

  const forced = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('layout') === 'pad') return true;
      return localStorage.getItem('orbis_layout') === 'pad';
    } catch {
      return false;
    }
  }, []);

  const isIPad = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    // iPadOS 13+ 可能伪装成 Mac，但 platform=MacIntel 且 maxTouchPoints>1 基本可判定为 iPad。
    return /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);

  // DevTools 也能触发：用“横屏 + 典型平板宽度区间”作为默认判定（不依赖 UA）。
  // 真机 iPad 仍可通过 isIPad 分支命中。
  return forced || ((isLandscape || isLandscapeFallback) && (isIPad || isPadWidth));
}
