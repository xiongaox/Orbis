import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  const mql = typeof window === 'undefined' ? null : window.matchMedia(query);

  const subscribe = (onStoreChange: () => void) => {
    if (!mql) return () => { };

    const onChange = () => onStoreChange();

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    // Safari 14: addListener/removeListener
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  };

  const getSnapshot = () => mql?.matches ?? false;
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

