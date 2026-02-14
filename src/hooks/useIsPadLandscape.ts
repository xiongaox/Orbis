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
