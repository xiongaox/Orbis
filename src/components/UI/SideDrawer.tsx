import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface SideDrawerProps {
  open: boolean;
  title?: string;
  side?: 'left' | 'right';
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg';
  hideHeader?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function SideDrawer({
  open,
  title,
  side = 'left',
  size = 'md',
  hideHeader = false,
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

  if (!open) return null;

  const panelPosClass = side === 'left' ? 'left-0' : 'right-0';
  const panelBorderClass = side === 'left' ? 'border-r' : 'border-l';
  const panelSizeClass =
    size === 'xxs'
      ? 'w-[62vw] max-w-[248px]'
      : size === 'xs'
      ? 'w-[70vw] max-w-[280px]'
      : size === 'sm'
      ? 'w-[78vw] max-w-[320px]'
      : size === 'lg'
        ? 'w-[92vw] max-w-[520px]'
        : 'w-[92vw] max-w-[420px]';

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="关闭"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? '抽屉'}
        className={`absolute top-0 ${panelPosClass} ${panelBorderClass} ${panelSizeClass} border-border h-full bg-card shadow-2xl flex flex-col`}
      >
        {!hideHeader && title && (
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

        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
