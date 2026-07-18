// Viewport hook — the missing dimension of the (viewport x role) layout matrix.
// Desktop is >= 1024px (the `lg` breakpoint); anything narrower is mobile/PWA.

import { useEffect, useState } from 'react';

const DESKTOP_QUERY = '(min-width: 1024px)';

export interface DeviceSize {
  isDesktop: boolean;
  isMobile: boolean;
}

function matchesDesktop(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DESKTOP_QUERY).matches
  );
}

export function useDeviceSize(): DeviceSize {
  const [isDesktop, setIsDesktop] = useState<boolean>(matchesDesktop);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);

    setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return { isDesktop, isMobile: !isDesktop };
}
