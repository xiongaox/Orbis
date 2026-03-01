/**
 * useReadingProgress - 应用源码层
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
 * - `useReadingProgress`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `useAuth`、内部模块 `learningPanelService`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../../../../contexts/useAuth';
import { learningPanelService } from '../../../../services/learningPanelService';

interface UseReadingProgressOptions {
    /** 文章 ID */
    articleId: string | null;
    /** 滚动容器的 ref */
    scrollContainerRef: React.RefObject<HTMLElement | null>;
    /** 是否启用（仅登录用户启用） */
    enabled?: boolean;
}

interface UseReadingProgressReturn {
    /** 恢复进度 */
    restoreProgress: () => Promise<void>;
    /** 已保存的进度百分比（0 表示无进度） */
    savedProgress: number;
    /** 当前实时进度百分比 */
    currentProgress: number;
}

// 节流时间（毫秒）
const THROTTLE_INTERVAL = 10000; // 10 秒
// 进度变化阈值（百分比）
const PROGRESS_THRESHOLD = 5;

/**
 * 计算滚动百分比
 */
function calculateScrollPercent(element: HTMLElement): number {
    const { scrollTop, scrollHeight, clientHeight } = element;
    const scrollRange = scrollHeight - clientHeight;

    if (scrollRange <= 0) return 100;

    const percent = (scrollTop / scrollRange) * 100;
    return Math.max(0, Math.min(100, Math.round(percent)));
}

export function useReadingProgress({
    articleId,
    scrollContainerRef,
    enabled = true,
}: UseReadingProgressOptions): UseReadingProgressReturn {
    const { user } = useAuth();

    // 已保存的进度（用于跳转）
    const [savedProgress, setSavedProgress] = useState<number>(0);
    // 当前实时进度（用于 UI 显示）
    const [currentProgress, setCurrentProgress] = useState<number>(0);

    // 上次保存的进度
    const lastSavedProgressRef = useRef<number>(0);
    // 上次保存的时间
    const lastSaveTimeRef = useRef<number>(0);
    // 当前文章 ID（用于检测切换）
    const currentArticleIdRef = useRef<string | null>(null);
    // 是否正在保存
    const isSavingRef = useRef<boolean>(false);
    // 是否已初始化（从数据库加载基准进度）
    const isInitializedRef = useRef<boolean>(false);

    // 实时滚动百分比 Ref（避免闭包问题和 DOM 更新后的计算错误）
    const currentScrollPercentRef = useRef<number>(0);

    /**
     * 保存进度到服务器
     * 注意：只保存比之前更高的进度，避免覆盖
     */
    const saveProgress = useCallback(async (percent: number, force: boolean = false) => {
        if (!user || !articleId || isSavingRef.current) return;

        // 如果还没初始化，不保存（避免覆盖数据库中的进度）
        // 除非是 force 保存（比如页面卸载时）
        if (!isInitializedRef.current && !force) return;

        // 只保存比之前更高的进度（避免回退）
        if (percent < lastSavedProgressRef.current && !force) return;

        const now = Date.now();
        const timeSinceLastSave = now - lastSaveTimeRef.current;
        const progressChange = Math.abs(percent - lastSavedProgressRef.current);

        // 检查是否需要保存
        const shouldSave = force ||
            (timeSinceLastSave >= THROTTLE_INTERVAL) ||
            (progressChange >= PROGRESS_THRESHOLD);

        if (!shouldSave) return;

        isSavingRef.current = true;

        try {
            const success = await learningPanelService.upsertProgress(user.id, articleId, percent);
            if (success) {
                lastSavedProgressRef.current = percent;
                lastSaveTimeRef.current = now;
            }
        } catch (error) {
            console.error('保存进度失败:', error);
        } finally {
            isSavingRef.current = false;
        }
    }, [user, articleId]);

    /**
     * 恢复进度
     */
    const restoreProgress = useCallback(async () => {
        if (!user || !articleId || !scrollContainerRef.current) return;

        try {
            const progress = await learningPanelService.getProgress(user.id, articleId);

            if (progress && progress.progress_percent > 0) {
                const container = scrollContainerRef.current;
                const { scrollHeight, clientHeight } = container;
                const scrollRange = scrollHeight - clientHeight;

                if (scrollRange > 0) {
                    const targetScroll = (progress.progress_percent / 100) * scrollRange;
                    container.scrollTo({ top: targetScroll, behavior: 'smooth' });
                    lastSavedProgressRef.current = progress.progress_percent;
                    currentScrollPercentRef.current = progress.progress_percent; // 恢复时也更新 ref
                }
            }
        } catch (error) {
            console.error('恢复进度失败:', error);
        }
    }, [user, articleId, scrollContainerRef]);

    // 滚动事件处理
    useEffect(() => {
        if (!enabled || !user || !articleId || !scrollContainerRef.current) return;

        const container = scrollContainerRef.current;

        // 节流处理（保存节流，但 UI 更新不节流）
        let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
        const throttledScroll = () => {
            const percent = calculateScrollPercent(container);
            currentScrollPercentRef.current = percent; // 记录实时值
            setCurrentProgress(percent); // UI 实时更新

            if (scrollTimeout) return;
            scrollTimeout = setTimeout(() => {
                saveProgress(percent);
                scrollTimeout = null;
            }, 500);
        };

        container.addEventListener('scroll', throttledScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', throttledScroll);
            if (scrollTimeout) clearTimeout(scrollTimeout);
        };
    }, [enabled, user, articleId, scrollContainerRef, saveProgress]);

    // 文章切换时初始化状态
    useEffect(() => {
        if (currentArticleIdRef.current !== articleId) {
            // 如果之前有文章，保存最终进度
            // 使用 currentScrollPercentRef.current 而不是重新计算 DOM
            // 因为此时 DOM 可能已经更新为新文章（或为空），计算结果不准确
            if (currentArticleIdRef.current && user && isInitializedRef.current) {
                const percent = currentScrollPercentRef.current;

                // 只保存更高的进度
                if (percent > lastSavedProgressRef.current) {
                    const previousArticleId = currentArticleIdRef.current;
                    learningPanelService.upsertProgress(user.id, previousArticleId, percent);
                }
            }

            // 更新当前文章 ID
            currentArticleIdRef.current = articleId;
            // 重置初始化状态
            isInitializedRef.current = false;
            lastSavedProgressRef.current = 0;
            lastSaveTimeRef.current = 0;
            currentScrollPercentRef.current = 0; // 重置当前滚动的 ref

            // 从数据库加载基准进度
            if (user && articleId) {
                setSavedProgress(0); // 先重置
                learningPanelService.getProgress(user.id, articleId).then(progress => {
                    if (progress) {
                        lastSavedProgressRef.current = progress.progress_percent;
                        setSavedProgress(progress.progress_percent);
                    }
                    isInitializedRef.current = true;
                }).catch(() => {
                    isInitializedRef.current = true;
                });
            } else {
                setSavedProgress(0);
            }
        }
    }, [articleId, scrollContainerRef, user]);

    // 页面卸载/隐藏时保存进度
    useEffect(() => {
        if (!enabled || !user || !articleId) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && scrollContainerRef.current) {
                const percent = calculateScrollPercent(scrollContainerRef.current);
                saveProgress(percent, true);
            }
        };

        const handleBeforeUnload = () => {
            if (scrollContainerRef.current) {
                const percent = calculateScrollPercent(scrollContainerRef.current);
                // 使用同步方式保存（navigator.sendBeacon）
                // 由于 Supabase 不直接支持 sendBeacon，这里使用普通请求
                // 在实际场景中，请求可能会被取消，但这是最佳努力
                saveProgress(percent, true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [enabled, user, articleId, scrollContainerRef, saveProgress]);

    return { restoreProgress, savedProgress, currentProgress };
}
