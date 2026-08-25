import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { OfflineIndicator } from '@shared/ui/components/OfflineIndicator';
import { LanguageSwitcher } from '@shared/ui/components/LanguageSwitcher';

interface HeaderProps {
  locale: string;
  identity: { userId: string; name: string; email: string };
}

// See docs/decisions.md ADR-007 for why this is a nav menu, not a
// breadcrumb trail like the hub/todolist use: fitness has several
// sibling top-level sections (Training, Diary, Diet, Photos, Settings)
// a user needs to move *between*, not a single hierarchy to track depth
// within. Nav items are scoped to only what's actually built today
// (Diary, Training, Workouts, Exercises, Food, Diet, Settings) - add one line here
// each time a new section ships its first real page, per ADR-007's
// Consequences.
export function Header({ locale, identity }: HeaderProps) {
  const t = useTranslations('Header');

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <nav className="flex items-center gap-4">
          <a
            href={`${process.env.API_URL}/${locale}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            blonskyi.dev
          </a>
          <Link
            href={`/${locale}`}
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {t('brand')}
          </Link>
          <Link
            href={`/${locale}/diary`}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {t('nav.diary')}
          </Link>
          <Link
            href={`/${locale}/training`}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {t('nav.training')}
          </Link>
          <Link
            href={`/${locale}/workouts`}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Workouts
          </Link>
          <Link
            href={`/${locale}/exercises`}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {t('nav.exercises')}
          </Link>
          <Link
            href={`/${locale}/food`}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {t('nav.food')}
          </Link>
          <Link
            href={`/${locale}/diet`}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {t('nav.diet')}
          </Link>
          <Link
            href={`/${locale}/settings/profile`}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {t('nav.settings')}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <OfflineIndicator userId={identity.userId} />
          {/* Identity only - no dropdown, no settings link (already in
              nav above), no sign-out (the Hub has no public logout URL
              to delegate to - see ADR-007's Consequences). */}
          <span className="text-sm text-zinc-500">
            {identity.name || identity.email}
          </span>
        </div>
      </div>
    </header>
  );
}
