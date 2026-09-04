'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

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

  return (
    <select
      aria-label={t('label')}
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value })}
      className="chip min-h-8 cursor-pointer appearance-none text-ink transition-colors hover:bg-hover"
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
