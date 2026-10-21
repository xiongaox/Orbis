import { describe, expect, it } from 'vitest';
import { isPushBackClose, resolveAxis, resolveSwipeDirection } from './useMobileDrawerSwipe';

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

    // 并排式抽屉的关闭方向：必须顺应手势，只有「把侧栏推回去」才关。
    // 曾经不看方向、左右滑都关，导致抽屉里左滑露出「编辑/删除」时侧栏被关掉。
    it('左抽屉只有向左推才关，右抽屉只有向右推才关', () => {
        expect(isPushBackClose('left', -80)).toBe(true);
        expect(isPushBackClose('left', 80)).toBe(false);
        expect(isPushBackClose('right', 80)).toBe(true);
        expect(isPushBackClose('right', -80)).toBe(false);
    });

    it('关闭方向也受触发阈值约束', () => {
        expect(isPushBackClose('left', -20)).toBe(false);
        expect(isPushBackClose('right', 20)).toBe(false);
    });
});
