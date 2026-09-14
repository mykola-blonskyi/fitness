'use client';

import { useTranslations } from 'next-intl';
import { useTheme, type Theme } from '@shared/theme';
import { CheckIcon } from '@shared/ui/icons';

interface Swatch {
  theme: Exclude<Theme, 'auto'>;
  bg: string;
  side: string;
  card: string;
  accent: string;
}

// Static previews (not the live tokens) so every swatch shows its own
// palette regardless of which theme is currently applied.
const SWATCHES: Swatch[] = [
  {
    theme: 'lime',
    bg: '#f3f4f0',
    side: '#15171a',
    card: '#ffffff',
    accent: '#d6f542',
  },
  {
    theme: 'midnight',
    bg: '#0b0c10',
    side: '#15171d',
    card: '#1d2027',
    accent: '#ff6a3d',
  },
  {
    theme: 'paper',
    bg: '#f6f1e8',
    side: '#efe8db',
    card: '#fdfbf7',
    accent: '#b5522f',
  },
  {
    theme: 'glass',
    bg: 'linear-gradient(135deg,#dcd6ff,#c9f0ff,#ffe1ec)',
    side: 'rgba(255,255,255,0.6)',
    card: 'rgba(255,255,255,0.75)',
    accent: '#6d5cff',
  },
];

export function ThemeSwitcher() {
  const t = useTranslations('Settings.appearancePage');
  const [theme, setTheme] = useTheme();

  return (
    <div className="flex flex-col gap-4">
      {/* fieldset keeps its min-inline-size: min-content default, so the
          grid lives on an inner div rather than on the fieldset itself. */}
      <fieldset className="min-w-0">
        <legend className="sr-only">{t('themeLabel')}</legend>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {SWATCHES.map((swatch) => {
            const selected = theme === swatch.theme;
            return (
              <label
                key={swatch.theme}
                className={`flex cursor-pointer flex-col gap-2 rounded-card border-2 p-2 text-left transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                  selected ? 'border-ink' : 'border-line hover:border-muted'
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={swatch.theme}
                  checked={selected}
                  onChange={() => setTheme(swatch.theme)}
                  className="sr-only"
                />
                <span
                  className="grid h-[72px] grid-cols-[28%_1fr] gap-1.5 rounded-ctl p-2"
                  style={{ background: swatch.bg }}
                  aria-hidden="true"
                >
                  <span
                    className="rounded-md"
                    style={{ background: swatch.side }}
                  />
                  <span className="flex flex-col gap-1.5">
                    <span
                      className="h-2.5 rounded"
                      style={{ background: swatch.accent }}
                    />
                    <span
                      className="h-2.5 rounded"
                      style={{ background: swatch.card }}
                    />
                    <span
                      className="h-2.5 rounded"
                      style={{ background: swatch.card }}
                    />
                  </span>
                </span>
                <span className="flex items-center justify-between px-1 text-xs font-semibold">
                  {t(`themes.${swatch.theme}`)}
                  {selected && <CheckIcon className="size-4" />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-ctl border border-line px-3 py-2">
        <span className="flex flex-col">
          <span className="text-sm font-semibold">{t('followSystem')}</span>
          <span className="text-xs text-muted">{t('followSystemHint')}</span>
        </span>
        <input
          type="checkbox"
          className="size-5 accent-[color:var(--accent-strong)]"
          checked={theme === 'auto'}
          onChange={(e) => setTheme(e.target.checked ? 'auto' : 'lime')}
        />
      </label>
    </div>
  );
}
