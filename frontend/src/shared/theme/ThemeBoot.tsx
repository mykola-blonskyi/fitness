'use client';

import { useLayoutEffect } from 'react';
import {
  applyTheme,
  readStoredTheme,
  watchSystemTheme,
} from '@shared/theme/apply-theme';

// The inline THEME_INIT_SCRIPT sets data-theme before first paint, but React
// 19 strips attributes it doesn't own from <html> while hydrating - so the
// stored theme is re-applied here, synchronously, right after hydration.
export function ThemeBoot() {
  useLayoutEffect(() => {
    applyTheme(readStoredTheme());
    return watchSystemTheme(() => applyTheme(readStoredTheme()));
  }, []);
  return null;
}
