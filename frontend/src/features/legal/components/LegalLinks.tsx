import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function LegalLinks({ locale }: { locale: string }) {
  const t = await getTranslations('Legal');
  return (
    <nav className="flex gap-4 text-sm text-muted">
      <Link href={`/${locale}/terms`} className="underline hover:text-ink">
        {t('terms.title')}
      </Link>
      <Link href={`/${locale}/privacy`} className="underline hover:text-ink">
        {t('privacy.title')}
      </Link>
    </nav>
  );
}
