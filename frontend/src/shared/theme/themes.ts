export const THEMES = ['lime', 'midnight', 'paper', 'glass', 'auto'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'lime';
export const THEME_STORAGE_KEY = 'fitness-theme';
// Same value mirrored into a cookie so manifest.ts (server) can pick the
// matching PWA colors; localStorage stays the source of truth on the client.
export const THEME_COOKIE = 'fitness-theme';

export function isTheme(value: unknown): value is Theme {
  return (
    typeof value === 'string' && (THEMES as readonly string[]).includes(value)
  );
}

// Page background per theme (globals.css --bg) - what browser chrome, the
// PWA splash and the installed-app title bar should match. 'auto' resolves
// at runtime (see resolveThemeColor); its static entry is the light default.
export const THEME_COLORS: Record<Theme, string> = {
  lime: '#f3f4f0',
  midnight: '#0b0c10',
  paper: '#f6f1e8',
  glass: '#eef0fb',
  auto: '#f3f4f0',
};

export function resolveThemeColor(theme: Theme, prefersDark: boolean): string {
  if (theme === 'auto')
    return prefersDark ? THEME_COLORS.midnight : THEME_COLORS.lime;
  return THEME_COLORS[theme];
}

// Runs before first paint (inlined in the root layout's <head>) so the
// stored theme applies without a flash of the default one. ThemeBoot
// repeats the same work after hydration.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(!t||${JSON.stringify(
  THEMES,
)}.indexOf(t)<0)t='${DEFAULT_THEME}';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;
