import { describe, expect, it } from 'vitest';
import { resolveAxis, resolveSwipeDirection } from './useMobileDrawerSwipe';

describe('移动端左右滑开抽屉的判定', () => {
    it('死区内不判方向，避免轻微抖动误判', () => {
        expect(resolveAxis(4, 6)).toBeNull();
        expect(resolveAxis(-9, 3)).toBeNull();
    });

    it('横向位移更大判为 x，纵向更大判为 y', () => {
        expect(resolveAxis(30, 12)).toBe('x');
        expect(resolveAxis(-30, 12)).toBe('x');
        expect(resolveAxis(12, 30)).toBe('y');
    });

    it('位移不足阈值不触发抽屉', () => {
        expect(resolveSwipeDirection('x', -55)).toBeNull();
        expect(resolveSwipeDirection('x', 20)).toBeNull();
    });

    // 方向语义：返回值是「抽屉在哪一侧」，不是「手指往哪边」。
    // 手指向右（dx > 0）把左抽屉拉出来，手指向左（dx < 0）把右抽屉拉出来。
    it('手指向右滑开左抽屉，向左滑开右抽屉', () => {
        expect(resolveSwipeDirection('x', 56)).toBe('left');
        expect(resolveSwipeDirection('x', -56)).toBe('right');
    });

    it('纵向手势即使横向位移够大也不开抽屉', () => {
        expect(resolveSwipeDirection('y', -200)).toBeNull();
        expect(resolveSwipeDirection(null, -200)).toBeNull();
    });
});
