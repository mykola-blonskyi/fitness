import { getTranslations } from 'next-intl/server';
import { OnboardingForm } from '@features/onboarding';

export default async function OnboardingPage() {
  const t = await getTranslations('Onboarding');
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('subtitle')}</p>
      </div>
      <OnboardingForm />
    </main>
  );
}
