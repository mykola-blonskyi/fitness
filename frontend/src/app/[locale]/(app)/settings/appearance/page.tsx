import { getTranslations } from 'next-intl/server';
import { SettingsNav, ThemeSwitcher } from '@features/settings';
import { Page, PageHeader, Section } from '@shared/ui/components/Page';

export default async function AppearanceSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Settings.appearancePage');

  return (
    <Page narrow>
      <PageHeader title={t('title')} description={t('description')} />
      <SettingsNav locale={locale} active="appearance" />
      <Section title={t('themeLabel')}>
        <ThemeSwitcher />
      </Section>
    </Page>
  );
}
