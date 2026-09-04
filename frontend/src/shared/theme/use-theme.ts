'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { applyTheme, persistTheme } from '@shared/theme/apply-theme';
import { DEFAULT_THEME, isTheme, type Theme } from '@shared/theme/themes';

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
    applyTheme(next);
    persistTheme(next);
    listeners.forEach((listener) => listener());
  }, []);

  return [theme, setTheme];
}
