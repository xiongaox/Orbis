/**
 * useLayoutMode - 应用源码层
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
 * - `LayoutMode`, `useLayoutMode`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `useMediaQuery`、内部模块 `useIsPadLandscape`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useMediaQuery } from './useMediaQuery';
import { useIsPadLandscape } from './useIsPadLandscape';

export interface LayoutMode {
    isDesktop: boolean;
    isPadLandscape: boolean;
    isMobile: boolean;
    useDesktopLayout: boolean;
}

/**
 * 集中管理应用的三端响应式布局状态
 * @returns 包含各端判断标识的对象
 */
export function useLayoutMode(): LayoutMode {
    // 基础断点
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Pad 横屏
    const isPadLandscape = useIsPadLandscape();

    // 派生状态：是否使用纯桌面端布局（非 Pad 横屏的 1024px 以上）
    const useDesktopLayout = isDesktop && !isPadLandscape;

    return {
        isDesktop,
        isPadLandscape,
        isMobile,
        useDesktopLayout,
    };
}
