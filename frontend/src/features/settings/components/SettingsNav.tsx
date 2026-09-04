import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

const TAB_KEYS = ['profile', 'preferences', 'appearance'] as const;

// Sub-nav between Settings' own pages - the app shell's rail only goes one
// level deep (top-level sections).
export async function SettingsNav({
  locale,
  active,
}: {
  locale: string;
  active: (typeof TAB_KEYS)[number];
}) {
  const t = await getTranslations('Settings.nav');
  return (
    <nav className="flex w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1">
      {TAB_KEYS.map((key) => (
        <Link
          key={key}
          href={`/${locale}/settings/${key}`}
          aria-current={key === active ? 'page' : undefined}
          className={`flex min-h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${
            key === active ? 'bg-inv text-inv-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
