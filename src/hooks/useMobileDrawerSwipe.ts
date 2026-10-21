/**
 * 模块定位：
 * - 所在层级：业务 hooks 层
 * - 主要目标：移动端内容区左右滑开抽屉，替代「每次点底栏按钮」
 *
 * 为什么从内容区起滑而不是屏幕边缘：安卓全面屏的边缘侧滑被系统返回手势占用，
 * WebView 拿不到那几像素。系统边缘滑已由 utils/androidBackButton 桥接为「关闭最上层浮层」，
 * 所以抽屉打开后仍可用系统手势关闭，本 hook 只负责「关闭态下滑开」。
 *
 * 让位规则（避免与既有手势抢）：
 * - 已有浮层（抽屉/弹窗，role=dialog）打开时完全不介入，横向手势归浮层内部
 * - 起点在底栏槽位上不介入（槽位自身是点击目标）
 * - 起点在可横向滚动的容器内不介入（表格矩阵的横滑属于容器滚动）
 * - 纵向意图交还页面滚动（轴锁，先动 10px 定方向）
 */
import { useEffect } from 'react';

/** 轴锁死区：手指移动超过该距离才判定水平/垂直意图 */
export const AXIS_LOCK_PX = 10;
/** 触发抽屉的最小水平位移，低于此值视为误触 */
export const TRIGGER_DISTANCE_PX = 56;

export type SwipeAxis = 'x' | 'y' | null;

/** 轴锁判定：死区内返回 null（继续观望），否则定方向 */
export function resolveAxis(dx: number, dy: number): SwipeAxis {
    if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return null;
    return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
}

/**
 * 抬手判定：返回要打开的**抽屉侧**，null 表示不触发。
 *
 * 注意方向是「抽屉在哪一侧」，不是「手指往哪边」：
 * - 手指向右（dx > 0）把左侧抽屉拉出来 → 'left'
 * - 手指向左（dx < 0）把右侧抽屉拉出来 → 'right'
 * 这两者相反，早期版本在这里把手指方向当成抽屉侧，导致手势全反。
 */
export function resolveSwipeDirection(axis: SwipeAxis, dx: number): 'left' | 'right' | null {
    if (axis !== 'x') return null;
    if (Math.abs(dx) < TRIGGER_DISTANCE_PX) return null;
    return dx < 0 ? 'right' : 'left';
}

/**
 * 并排式抽屉的关闭方向：顺着手势把侧栏「推回去」才算关。
 * 左栏是从左边拉出来的，向左推才关（dx < 0）；右栏反之。
 * 早期版本不看方向、左右滑都关，与卡片左滑露出「编辑/删除」互相打架。
 */
export function isPushBackClose(side: 'left' | 'right', dx: number): boolean {
    if (Math.abs(dx) < TRIGGER_DISTANCE_PX) return false;
    return side === 'left' ? dx < 0 : dx > 0;
}

interface MobileDrawerSwipeOptions {
    enabled: boolean;
    /**
     * 打开左侧抽屉：手指向右滑（把左侧抽屉拉出来）。
     * 回调名按「开哪一侧」命名，与 resolveSwipeDirection 的返回值语义一致，
     * 避免「手指方向」和「抽屉侧」两种语义混用导致手势反向。
     */
    onOpenLeft?: () => void;
    /** 打开右侧抽屉：手指向左滑（把右侧抽屉拉出来） */
    onOpenRight?: () => void;
    /**
     * 已有并排式抽屉打开时，顺着「推回去」的方向滑动关闭它（原生 app 手感）。
     * 与「浮层打开就不介入」互补：浮层有遮罩且自身能点关，并排式无遮罩需靠手势关。
     * side 是当前打开的那一侧：左栏向右拉出，所以向左推回才关；右栏反之。
     * 必须成对给出，避免「只知道要关、不知道往哪边算关」的错配。
     */
    swipeClose?: { side: 'left' | 'right'; onClose: () => void };
}

/**
 * 起点落在「自己消费横向手势」的元素里时不抢：
 * - 可横向滚动的容器（表格矩阵的横滑属于容器滚动）
 * - touch-action 只留纵向的元素：左滑露出「编辑/删除」的案例卡片属于这一类，
 *   它的横滑由自身 pointer 事件处理。不排除的话，抽屉里左滑露出操作会被
 *   全局手势当成「滑动关闭抽屉」，点编辑时抽屉已经被关掉了。
 */
function claimsHorizontalGesture(target: EventTarget | null): boolean {
    let node = target instanceof HTMLElement ? target : null;
    while (node && node !== document.body) {
        const { overflowX, touchAction } = getComputedStyle(node);
        if ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 2) {
            return true;
        }
        if (touchAction.includes('pan-y') && !touchAction.includes('pan-x')) return true;
        node = node.parentElement;
    }
    return false;
}

export function useMobileDrawerSwipe({
    enabled,
    onOpenLeft,
    onOpenRight,
    swipeClose,
}: MobileDrawerSwipeOptions): void {
    useEffect(() => {
        if (!enabled) return;

        let tracking = false;
        let axis: SwipeAxis = null;
        let startX = 0;
        let startY = 0;

        const handleStart = (event: TouchEvent) => {
            if (event.touches.length !== 1) return;
            // 浮层式抽屉/弹窗有遮罩且能点关，横向手势归它内部，不介入。
            // 并排式（inline）不渲染遮罩，靠本 hook 的 swipeClose 关闭，故放行。
            if (swipeClose === undefined
                && document.querySelector('[role="dialog"][aria-modal="true"]')) return;
            const target = event.target;
            if (target instanceof Element && target.closest('[aria-label="主导航"]')) return;
            if (claimsHorizontalGesture(target)) return;
            tracking = true;
            axis = null;
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
        };

        const handleMove = (event: TouchEvent) => {
            if (!tracking) return;
            const next = resolveAxis(
                event.touches[0].clientX - startX,
                event.touches[0].clientY - startY,
            );
            // 死区内继续观望；已定方向后保持（不因手指回摆改判）
            if (next === null || axis !== null) return;
            axis = next;
            // 纵向意图交还页面滚动，本次手势不再参与
            if (axis === 'y') tracking = false;
        };

        const handleEnd = (event: TouchEvent) => {
            if (!tracking) return;
            tracking = false;
            const dx = (event.changedTouches[0]?.clientX ?? startX) - startX;
            // 并排式抽屉已打开：只认「顺着手势把侧栏推回去」的方向
            if (swipeClose) {
                if (axis === 'x' && isPushBackClose(swipeClose.side, dx)) swipeClose.onClose();
                return;
            }
            // resolveSwipeDirection 返回的就是「抽屉侧」，直接分派，无需再交叉映射
            const side = resolveSwipeDirection(axis, dx);
            if (side === 'left') onOpenLeft?.();
            else if (side === 'right') onOpenRight?.();
        };

        // passive: true —— 手势只做判定不改滚动，不阻断浏览器默认滚动
        window.addEventListener('touchstart', handleStart, { passive: true });
        window.addEventListener('touchmove', handleMove, { passive: true });
        window.addEventListener('touchend', handleEnd, { passive: true });
        window.addEventListener('touchcancel', handleEnd, { passive: true });
        return () => {
            window.removeEventListener('touchstart', handleStart);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
            window.removeEventListener('touchcancel', handleEnd);
        };
    }, [enabled, onOpenLeft, onOpenRight, swipeClose]);
}
