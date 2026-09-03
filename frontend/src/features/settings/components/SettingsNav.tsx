import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

const TAB_KEYS = ['profile', 'preferences'] as const;

// Shared between settings/profile and settings/preferences - Header.tsx's
// own nav only goes one level deep (top-level sections), so a sub-nav
// between Settings' own pages lives here instead of growing Header.
export async function SettingsNav({
  locale,
  active,
}: {
  locale: string;
  active: (typeof TAB_KEYS)[number];
}) {
  const t = await getTranslations('Settings.nav');
  return (
    <nav className="flex w-full max-w-sm gap-4 border-b border-zinc-200 pb-2 dark:border-zinc-800">
      {TAB_KEYS.map((key) => (
        <Link
          key={key}
          href={`/${locale}/settings/${key}`}
          className={
            key === active
              ? 'text-sm font-semibold text-zinc-900 dark:text-zinc-100'
              : 'text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100'
          }
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
