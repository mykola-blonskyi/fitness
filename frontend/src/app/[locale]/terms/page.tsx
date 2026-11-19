import { LegalDocument } from '@features/legal';

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <LegalDocument doc="terms" locale={locale} />;
}
