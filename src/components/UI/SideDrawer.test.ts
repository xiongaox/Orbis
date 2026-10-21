import { describe, expect, it } from 'vitest';
import {
  INLINE_DRAWER_GAP_PX,
  INLINE_DRAWER_WIDTH,
  inlineDrawerOffset,
} from './inlineDrawerLayout';

describe('并排式抽屉的让位量', () => {
  // 面板宽度必须保持原值，不从宽度里扣留白：一旦变窄，
  // 奇门「空亡」这类多列字段会换行。留白只加在让位量上。
  it('左抽屉让位 = 面板原宽 + 留白', () => {
    expect(inlineDrawerOffset(INLINE_DRAWER_WIDTH.xxs, 'left')).toBe(
      `translateX(calc(${INLINE_DRAWER_WIDTH.xxs} + ${INLINE_DRAWER_GAP_PX}px))`,
    );
  });

  // 回归点：`translateX(-min(78vw,320px))` 是非法 CSS，浏览器整条丢弃，
  // 主内容不平移，右抽屉看起来就像浮层盖在内容上。负号必须包进 calc。
  it('右抽屉让位 = 面板原宽 + 留白，且负号包进 calc', () => {
    const value = inlineDrawerOffset(INLINE_DRAWER_WIDTH.sm, 'right');

    expect(value).toBe(
      `translateX(calc(-1 * ${INLINE_DRAWER_WIDTH.sm} - ${INLINE_DRAWER_GAP_PX}px))`,
    );
    expect(value).not.toContain('translateX(-min');
  });

  // 奇门移动端盘面是 p-0，没有八字内容区的 px-2，让位量要多补 8px，
  // 否则奇门侧栏与盘面的间距只有八字的一半。
  it('extraGapPx 叠加在留白之上，奇门两侧一致', () => {
    const gap = INLINE_DRAWER_GAP_PX + 8;

    expect(inlineDrawerOffset(INLINE_DRAWER_WIDTH.xxs, 'left', 8)).toBe(
      `translateX(calc(${INLINE_DRAWER_WIDTH.xxs} + ${gap}px))`,
    );
    expect(inlineDrawerOffset(INLINE_DRAWER_WIDTH.sm, 'right', 8)).toBe(
      `translateX(calc(-1 * ${INLINE_DRAWER_WIDTH.sm} - ${gap}px))`,
    );
  });
});
