
import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { pushBackHandler, popBackHandler } from '../../utils/androidBackButton';

interface SideDrawerProps {
  open: boolean;
  title?: string;
  side?: 'left' | 'right';
  size?: 'xxs' | 'xs' | 'sm' | 'ms' | 'md' | 'lg' | 'full';
  hideHeader?: boolean;
  /**
   * 并排式（原生 app 手感）：侧栏从侧边推出，主内容同步平移让位，无半透明遮罩。
   * 缺省为浮层式（fixed 全屏 + 遮罩）。主内容的平移由调用方用
   * INLINE_DRAWER_WIDTH 做 transform 完成，两侧共用同一宽度来源。
   */
  inline?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * 并排式面板的尺寸与让位量统一放在 inlineDrawerLayout.ts（纯常量/纯函数，
 * 不放在本组件文件里，否则会破坏 Fast Refresh 的 only-export-components 规则）。
 */
import { INLINE_DRAWER_WIDTH } from './inlineDrawerLayout';

export default function SideDrawer({
  open,
  title,
  side = 'left',
  size = 'md',
  hideHeader = false,
  inline = false,
  onClose,
  children,
}: SideDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // 安卓返回手势/返回键：侧滑关闭抽屉（桌面端为 no-op）
  useEffect(() => {
    if (!open) return;
    const handler = () => onClose();
    pushBackHandler(handler);
    return () => popBackHandler(handler);
  }, [open, onClose]);

  // 浮层式没有出场动画，保持原来的「关闭即卸载」语义
  if (!open && !inline) return null;

  const panelPosClass = side === 'left' ? 'left-0' : 'right-0';
  const panelBorderClass = side === 'left' ? 'border-r' : 'border-l';
  const panelSizeClass =
    size === 'full'
      ? 'w-full'
      : size === 'xxs'
        ? 'w-[62vw] max-w-[248px]'
        : size === 'xs'
          ? 'w-[70vw] max-w-[280px]'
          : size === 'sm'
            ? 'w-[78vw] max-w-[320px]'
            : size === 'ms'
              ? 'w-[85vw] max-w-[370px]'
              : size === 'lg'
                ? 'w-[92vw] max-w-[520px]'
                : 'w-[92vw] max-w-[420px]';

  const panel = (
    <div
      role="dialog"
      // 并排式主内容仍可见，不构成模态，不加 aria-modal（滑动 hook 也据此区分开/关语义）
      aria-modal={inline ? undefined : 'true'}
      // 并排式面板始终挂载：关闭态要移出可访问性树，否则读屏/焦点仍能进入侧栏
      aria-hidden={inline && !open ? true : undefined}
      data-inline-drawer={inline ? 'true' : undefined}
      aria-label={title ?? '抽屉'}
      // 并排式是浮起的圆角卡片：四周留 8px（top/bottom/left 或 right 用内缩值，
      // 不能用 panelPosClass 的 left-0/right-0，否则两个定位类互相覆盖）。
      // 进出场用 translateX + opacity，与主内容让位动画同时长、同缓动。
      // 并排式不加投影：主界面是不带外框的满幅底色，侧栏一加 shadow-2xl，
      // 明亮模式下就会在浅色底上糊出一圈灰晕。
      className={`absolute ${inline ? `top-2 bottom-2 ${side === 'left' ? 'left-2' : 'right-2'} rounded-2xl border z-10 overflow-hidden transition-[transform,opacity] duration-300 ease-out ${open ? '' : 'pointer-events-none'}` : `${panelPosClass} top-0 h-full ${panelSizeClass} ${panelBorderClass} shadow-2xl`} border-border bg-card flex flex-col`}
      // 抽屉贴顶贴底，而浮层定位在视口上、拿不到根节点的安全区留白，
      // 头部会被安卓状态栏盖住（见 MainActivity.kt 的 --safe-area-inset-*）。
      // 面板自带 bg-card，背景仍铺满系统栏区域，只有内容被顶下来。
      style={{
        // 并排式直接用 INLINE_DRAWER_WIDTH 原宽，不从宽度里扣留白：
        // 面板一旦变窄，内部多列字段（如奇门「空亡」六列）就会换行。
        // 留白由调用方的 inlineDrawerOffset 加在主内容让位量里。
        width: inline ? INLINE_DRAWER_WIDTH[size] : undefined,
        paddingTop: inline ? 0 : 'var(--safe-area-inset-top, 0px)',
        paddingBottom: inline ? 0 : 'var(--safe-area-inset-bottom, 0px)',
        // 关闭态：沿自己的方向退出去并淡出（左栏往左、右栏往右），打开态归零。
        // 并排式面板始终挂载，open 直接驱动样式——与主内容让位同一帧起步，
        // 不会出现「主内容滑到位、侧栏才跟上」的延迟。
        // 关闭后已移出视口且 pointer-events 关闭，无需再切 visibility。
        ...(inline
          ? {
              transform: open
                ? 'translateX(0)'
                : `translateX(${side === 'left' ? '-100%' : '100%'})`,
              opacity: open ? 1 : 0,
            }
          : null),
      }}
    >
        {/* 并排式没有标题栏：侧栏是滑出来的，关闭靠「点主内容区 / 再点底栏槽位 / 滑动」，
            顶部再放一行标题 + ✕ 既多余又占掉内容高度。浮层式仍保留标题栏。 */}
        {!hideHeader && !inline && title && (
          <div className="h-12 px-4 border-b border-border flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted/40 transition-colors"
              aria-label="关闭抽屉"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 min-w-0 overflow-hidden w-full flex flex-col">
          {children}
        </div>
      </div>
  );

  // 并排式：侧栏与主内容同层并排，没有遮罩；关闭靠调用方在主内容上的点击区
  if (inline) return panel;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="关闭"
        onClick={onClose}
      />
      {panel}
    </div>
  );
}
