/**
 * 并排式抽屉的宽度：与 SideDrawer 里的 panelSizeClass 字面量一一对应。
 * 改这里必须同步改 panelSizeClass（Tailwind 只认字面量，无法从常量拼出类名）。
 *
 * 注意：这是面板的**实际渲染宽度**。留白不要从宽度里扣，否则面板内部会变窄、
 * 挤坏原有的多列布局（奇门「空亡」六列就会换行）；留白由 inlineDrawerOffset 承担。
 */
export const INLINE_DRAWER_WIDTH = {
  xxs: 'min(62vw, 248px)',
  xs: 'min(70vw, 280px)',
  sm: 'min(78vw, 320px)',
  ms: 'min(85vw, 370px)',
  lg: 'min(92vw, 520px)',
  md: 'min(92vw, 420px)',
  full: '100%',
} as const;

/** 面板离屏幕边距的留白（px）。 */
export const INLINE_INSET_PX = 8;

/**
 * 主内容让位量 = 面板宽 + 内缩 + 与主内容之间的间距 = 面板宽 + 16px。
 * 面板本身不缩窄，所以面板内部布局（多列字段）保持原样。
 */
export const INLINE_DRAWER_GAP_PX = INLINE_INSET_PX * 2;

/**
 * 主内容让位用的 translateX 值。
 * 负号必须包进 calc：`translateX(-min(78vw,320px))` 是非法 CSS，浏览器会整条丢弃，
 * 右抽屉因此看起来像浮层盖在内容上（左抽屉无负号所以正常）。
 *
 * extraGapPx：主内容自身没有内边距时补的额外间距。八字内容区有 px-2（8px），
 * 视觉间距是「留白 + 8px」；奇门移动端盘面是 p-0，不补就会比八字少一半。
 * 补在让位量上而不是给盘面加 padding，盘面宽度因此不受影响。
 */
export function inlineDrawerOffset(
  width: string,
  direction: 'left' | 'right',
  extraGapPx = 0,
): string {
  const gap = INLINE_DRAWER_GAP_PX + extraGapPx;
  return direction === 'left'
    ? `translateX(calc(${width} + ${gap}px))`
    : `translateX(calc(-1 * ${width} - ${gap}px))`;
}
