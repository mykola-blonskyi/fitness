import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

const TAB_KEYS = ['exercises', 'food'] as const;

// Same pattern as features/settings/components/SettingsNav.tsx.
export async function AdminNav({
  locale,
  active,
}: {
  locale: string;
  active: (typeof TAB_KEYS)[number];
}) {
  const t = await getTranslations('Admin.nav');
  return (
    <nav className="flex w-full max-w-sm gap-4 border-b border-line pb-2">
      {TAB_KEYS.map((key) => (
        <Link
          key={key}
          href={`/${locale}/admin/${key}`}
          className={
            key === active
              ? 'text-sm font-semibold text-ink'
              : 'text-sm text-muted transition-colors hover:text-ink'
          }
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
