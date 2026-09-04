'use client';

import { useLayoutEffect } from 'react';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isTheme,
} from '@shared/theme/themes';

// The inline THEME_INIT_SCRIPT sets data-theme before first paint, but React
// 19 strips attributes it doesn't own from <html> while hydrating - so the
// stored theme is re-applied here, synchronously, right after hydration.
export function ThemeBoot() {
  useLayoutEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // storage unavailable - fall through to the default
    }
    document.documentElement.setAttribute(
      'data-theme',
      isTheme(stored) ? stored : DEFAULT_THEME,
    );
  }, []);
  return null;
}
