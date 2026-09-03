'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

export function GenerateDietError({
  error,
  preferencesBlocked,
}: {
  error?: string;
  preferencesBlocked: boolean;
}) {
  const t = useTranslations('Diet.generateError');
  const { locale } = useParams<{ locale: string }>();
  if (!error) return null;

  return (
    <p className="text-sm text-red-600" role="alert">
      {error}
      {preferencesBlocked && (
        <>
          {' '}
          <Link href={`/${locale}/settings/preferences`} className="underline">
            {t('reviewPreferences')}
          </Link>
          .
        </>
      )}
    </p>
  );
}
