import { useCallback, useEffect, useState } from 'react';

const KEY = 'gcd.currentUser';
const EVT = 'gcd:current-user-change';

/**
 * The "current user" is the display name stored in localStorage. The user
 * picks themselves once from the team picker in the Topbar; downstream
 * pages (e.g. /my) filter work items by `assignedTo === currentUser`.
 */
export function getCurrentUser(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(KEY);
}

export function setCurrentUser(name: string | null) {
  if (typeof window === 'undefined') return;
  if (name) window.localStorage.setItem(KEY, name);
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useCurrentUser(): [string | null, (n: string | null) => void] {
  const [me, setMe] = useState<string | null>(() => getCurrentUser());
  useEffect(() => {
    const handler = () => setMe(getCurrentUser());
    window.addEventListener(EVT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  const set = useCallback((n: string | null) => setCurrentUser(n), []);
  return [me, set];
}
