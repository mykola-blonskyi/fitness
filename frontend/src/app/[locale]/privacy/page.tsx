import { LegalDocument } from '@features/legal';

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <LegalDocument doc="privacy" locale={locale} />;
}
