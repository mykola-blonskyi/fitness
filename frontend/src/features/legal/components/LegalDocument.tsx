import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';

const CONTACT_EMAIL = 'nikolay.blonskiy@gmail.com';
const LAST_UPDATED = new Date('2026-11-19');

type LegalDoc = 'terms' | 'privacy';

interface Section {
  title: string;
  paragraphs: string[];
}

export async function LegalDocument({
  doc,
  locale,
}: {
  doc: LegalDoc;
  locale: string;
}) {
  const [t, format] = await Promise.all([
    getTranslations('Legal'),
    getFormatter(),
  ]);
  const sections = t.raw(`${doc}.sections`) as Section[];
  const other: LegalDoc = doc === 'terms' ? 'privacy' : 'terms';

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 md:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold md:text-[26px]">
          {t(`${doc}.title`)}
        </h1>
        <p className="text-sm text-muted">
          {t('lastUpdated', {
            date: format.dateTime(LAST_UPDATED, { dateStyle: 'long' }),
          })}
        </p>
      </header>

      {locale !== 'en' && (
        <p className="card p-4 text-sm">
          {t('translationNotice')}{' '}
          <Link href={`/en/${doc}`} className="font-semibold underline">
            {t('readEnglish')}
          </Link>
        </p>
      )}

      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className="text-[17px] font-bold">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-[15px] leading-relaxed">
              {paragraph.replaceAll('{email}', CONTACT_EMAIL)}
            </p>
          ))}
        </section>
      ))}

      <footer className="flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
        <Link href={`/${locale}/${other}`} className="underline">
          {t(`${other}.title`)}
        </Link>
        <Link href={`/${locale}`} className="underline">
          {t('backToApp')}
        </Link>
      </footer>
    </main>
  );
}
