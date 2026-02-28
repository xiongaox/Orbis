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
