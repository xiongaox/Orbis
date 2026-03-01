/**
 * useDragSort - 应用源码层
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
 * - `useDragSort`, `useCaseDragSort`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `@dnd-kit/sortable`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState, useCallback } from 'react';
import {
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface UseDragSortOptions<T> {
    /** 获取项目 ID 的函数 */
    getId: (item: T) => string;
    /** 排序持久化回调 */
    onSortPersist?: (newItems: T[]) => Promise<void>;
    /** 排序成功后的回调 */
    onSortSuccess?: () => void;
}

interface UseDragSortReturn<T> {
    /** dnd-kit sensors */
    sensors: ReturnType<typeof useSensors>;
    /** 处理拖拽结束 */
    handleDragEnd: (event: DragEndEvent, items: T[], setItems: (items: T[]) => void) => Promise<void>;
    /** 是否正在拖拽 */
    isDragging: boolean;
}

/**
 * 拖拽排序 Hook
 */
export function useDragSort<T>(options: UseDragSortOptions<T>): UseDragSortReturn<T> {
    const { getId, onSortPersist, onSortSuccess } = options;
    const [isDragging, setIsDragging] = useState(false);

    // 拖拽 sensors 配置
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 最小拖拽距离
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // 处理拖拽结束
    const handleDragEnd = useCallback(async (
        event: DragEndEvent,
        items: T[],
        setItems: (items: T[]) => void
    ) => {
        const { active, over } = event;
        setIsDragging(false);

        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex(item => getId(item) === active.id);
        const newIndex = items.findIndex(item => getId(item) === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newItems = arrayMove(items, oldIndex, newIndex);
            setItems(newItems);

            // 持久化排序
            if (onSortPersist) {
                try {
                    await onSortPersist(newItems);
                    onSortSuccess?.();
                } catch (error) {
                    console.error('保存排序失败:', error);
                    // 回滚排序
                    setItems(items);
                }
            }
        }
    }, [getId, onSortPersist, onSortSuccess]);

    return {
        sensors,
        handleDragEnd,
        isDragging,
    };
}

/**
 * 创建简化版的拖拽排序 Hook（用于案例库）
 */
export function useCaseDragSort(
    onPersist: (ids: string[]) => Promise<void>,
    onSuccess?: () => void
) {
    return useDragSort<{ id: string }>({
        getId: (item) => item.id,
        onSortPersist: async (items) => {
            await onPersist(items.map(item => item.id));
        },
        onSortSuccess: onSuccess,
    });
}
