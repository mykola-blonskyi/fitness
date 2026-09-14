import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function LocaleNotFound() {
  const [t, locale] = await Promise.all([
    getTranslations('NotFoundPage'),
    getLocale(),
  ]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="card flex w-full max-w-md flex-col items-center gap-5 p-6 text-center">
        <div className="flex flex-col gap-2">
          <span className="kicker">404</span>
          <h1 className="font-display text-2xl font-extrabold">{t('title')}</h1>
          <p className="text-sm text-muted">{t('body')}</p>
        </div>
        <Link href={`/${locale}`} className="btn-primary">
          {t('home')}
        </Link>
      </div>
    </main>
  );
}
