'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { updateLocale } from '@libs/locale-actions';
import type { Locale } from '@shared/types/user';

const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
  en: 'English',
  uk: 'Українська',
  ru: 'Русский',
  es: 'Español',
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('LanguageSwitcher');
  const [isPending, startTransition] = useTransition();

  // Two stores have to agree: next-intl's route segment (UI strings) and
  // users.locale (catalog display names). Persist first, then navigate -
  // the new route re-renders against the stored value.
  function onChange(next: string) {
    startTransition(async () => {
      await updateLocale(next as Locale);
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <select
      aria-label={t('label')}
      value={locale}
      disabled={isPending}
      onChange={(e) => onChange(e.target.value)}
      className="chip min-h-8 cursor-pointer appearance-none text-ink transition-colors hover:bg-hover disabled:cursor-wait"
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
