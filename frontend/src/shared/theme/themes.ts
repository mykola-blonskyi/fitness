export const THEMES = ['lime', 'midnight', 'paper', 'glass', 'auto'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'lime';
export const THEME_STORAGE_KEY = 'fitness-theme';

export function isTheme(value: unknown): value is Theme {
  return (
    typeof value === 'string' && (THEMES as readonly string[]).includes(value)
  );
}

// Runs before first paint (inlined in the root layout's <head>) so the
// stored theme applies without a flash of the default one.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(!t||${JSON.stringify(
  THEMES,
)}.indexOf(t)<0)t='${DEFAULT_THEME}';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;
