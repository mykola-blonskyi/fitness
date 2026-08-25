import Link from 'next/link';

const TABS = [
  { key: 'exercises', label: 'Exercises' },
  { key: 'food', label: 'Food' },
] as const;

// Same pattern as features/settings/components/SettingsNav.tsx.
export function AdminNav({
  locale,
  active,
}: {
  locale: string;
  active: (typeof TABS)[number]['key'];
}) {
  return (
    <nav className="flex w-full max-w-sm gap-4 border-b border-zinc-200 pb-2 dark:border-zinc-800">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/${locale}/admin/${tab.key}`}
          className={
            tab.key === active
              ? 'text-sm font-semibold text-zinc-900 dark:text-zinc-100'
              : 'text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100'
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
