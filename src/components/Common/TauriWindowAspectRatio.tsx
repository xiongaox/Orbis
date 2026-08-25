import { useEffect, type ReactNode } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

const WINDOW_ASPECT_RATIO = 16 / 9;
const DEFAULT_WINDOW_WIDTH = 1800;
const DEFAULT_WINDOW_HEIGHT = Math.round(DEFAULT_WINDOW_WIDTH / WINDOW_ASPECT_RATIO);

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
}

export default function TauriWindowAspectRatio({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isTauriRuntime()) return;

    let disposed = false;
    let syncing = false;
    let previous = { width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT };
    let unlisten: (() => void) | undefined;
    const appWindow = getCurrentWindow();

    const syncHeight = async (width: number) => {
      if (disposed || syncing || width <= 0) return;
      const height = Math.round(width / WINDOW_ASPECT_RATIO);
      if (Math.abs(height - previous.height) < 2) return;
      syncing = true;
      try {
        await appWindow.setSize(new LogicalSize(width, height));
        previous = { width, height };
      } finally {
        syncing = false;
      }
    };

    void appWindow.innerSize().then((size) => {
      previous = { width: size.width, height: size.height };
      return syncHeight(size.width);
    });

    void appWindow.onResized(({ payload }) => {
      const widthChanged = Math.abs(payload.width - previous.width);
      const heightChanged = Math.abs(payload.height - previous.height);
      if (widthChanged >= heightChanged) {
        void syncHeight(payload.width);
      } else {
        void syncHeight(Math.round(payload.height * WINDOW_ASPECT_RATIO));
      }
      previous = { width: payload.width, height: payload.height };
    }).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return children;
}
