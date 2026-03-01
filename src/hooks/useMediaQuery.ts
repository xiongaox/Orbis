/**
 * useMediaQuery - 应用源码层
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
 * - `useMediaQuery`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  const mql = typeof window === 'undefined' ? null : window.matchMedia(query);

  const subscribe = (onStoreChange: () => void) => {
    if (!mql) return () => { };

    const onChange = () => onStoreChange();

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    // Safari 14: addListener/removeListener
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  };

  const getSnapshot = () => mql?.matches ?? false;
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

