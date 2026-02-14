import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface SideDrawerProps {
  open: boolean;
  title: string;
  side?: 'left' | 'right';
  onClose: () => void;
  children: ReactNode;
}

export default function SideDrawer({
  open,
  title,
  side = 'left',
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
        className={`absolute top-0 ${panelPosClass} ${panelBorderClass} border-border h-full w-[92vw] max-w-[420px] bg-card shadow-2xl flex flex-col`}
      >
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

        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
