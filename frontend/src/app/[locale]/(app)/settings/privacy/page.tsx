import { getTranslations } from 'next-intl/server';
import { DeleteAccountButton } from '@features/account';
import { LegalLinks } from '@features/legal';
import { SettingsNav } from '@features/settings';

export default async function PrivacySettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Settings.privacyPage');

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <SettingsNav locale={locale} active="privacy" />
      <h1 className="text-2xl font-extrabold md:text-[26px]">{t('title')}</h1>

      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('legalHeading')}</h2>
        <LegalLinks locale={locale} />
      </section>

      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('export.heading')}</h2>
        <p className="text-sm text-muted">{t('export.description')}</p>
        <a
          href={`/${locale}/settings/export`}
          download
          className="btn-ghost self-start"
        >
          {t('export.submit')}
        </a>
      </section>

      <section className="card flex w-full flex-col gap-3 border-danger p-4 md:p-5">
        <h2 className="text-[15px] font-bold text-danger">
          {t('delete.heading')}
        </h2>
        <p className="text-sm text-muted">{t('delete.description')}</p>
        <DeleteAccountButton />
      </section>
    </main>
  );
}
