/**
 * 关键职责：
 * - 左滑露出操作层的卡片在「展开态」下，点击卡片以外任意位置（列表空白、
 *   其他卡片、页面其他区域、上层弹层）自动收起，不再要求用户反向滑回复原
 * - 按下点落在其他卡片上同样算外部，天然保证同一列表至多一张卡片展开
*/

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * 左滑展开后的「点空白收起」监听。
 * @param rootRef 卡片根元素（编辑/删除操作层须在其内部，按在层上不算外部）
 * @param active 是否处于展开态；收起态不挂监听，零开销
 * @param onDismiss 收起回调（通常为 setSwipeX(0)）
 */
export function useSwipeDismiss(
    rootRef: RefObject<HTMLElement | null>,
    active: boolean,
    onDismiss: () => void,
) {
    // onDismiss 多为内联箭头函数：经 ref 中转，避免展开期间每次渲染都重挂全局监听
    const dismissRef = useRef(onDismiss);
    useLayoutEffect(() => {
        dismissRef.current = onDismiss;
    });

    useEffect(() => {
        if (!active) return;
        const handlePointerDown = (event: PointerEvent) => {
            const root = rootRef.current;
            if (!root) return;
            if (event.target instanceof Node && root.contains(event.target)) return;
            dismissRef.current();
        };
        // 捕获阶段抢先于目标卡片的点选手势执行，保证「收起上一张」先于「操作下一张」
        window.addEventListener('pointerdown', handlePointerDown, true);
        return () => window.removeEventListener('pointerdown', handlePointerDown, true);
    }, [active, rootRef]);
}
