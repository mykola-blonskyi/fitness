import { getTranslations } from 'next-intl/server';
import { SignInButton } from '@features/auth';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ callbackUrl }, t] = await Promise.all([
    searchParams,
    getTranslations('SignIn'),
  ]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-2xl font-extrabold md:text-[26px]">
          {t('title')}
        </h1>
        <p className="text-sm text-muted">{t('subtitle')}</p>
      </div>
      <div className="w-full max-w-xs">
        <SignInButton callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
