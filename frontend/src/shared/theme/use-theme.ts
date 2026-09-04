'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isTheme,
  type Theme,
} from '@shared/theme/themes';

const listeners = new Set<() => void>();

function readTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const current = document.documentElement.getAttribute('data-theme');
  return isTheme(current) ? current : DEFAULT_THEME;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / storage disabled: the choice still applies for this page.
    }
    listeners.forEach((listener) => listener());
  }, []);

  return [theme, setTheme];
}
