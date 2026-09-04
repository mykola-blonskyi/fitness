import {
  DEFAULT_THEME,
  THEME_COOKIE,
  THEME_STORAGE_KEY,
  isTheme,
  resolveThemeColor,
  type Theme,
} from '@shared/theme/themes';

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // storage unavailable - fall through to the default
  }
  return DEFAULT_THEME;
}

function syncThemeColorMeta(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const color = resolveThemeColor(theme, prefersDark);
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}

// Sets data-theme and keeps <meta name="theme-color"> (browser chrome, PWA
// title bar) in step. Does not persist - see persistTheme.
export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  syncThemeColorMeta(theme);
}

export function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode / storage disabled: the choice still applies for this page.
  }
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

// 'auto' follows the OS: re-sync the meta color when that preference flips.
export function watchSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
