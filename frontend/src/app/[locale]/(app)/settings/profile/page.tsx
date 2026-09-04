import { getTranslations } from 'next-intl/server';
import { ProfileForm, SettingsNav } from '@features/settings';
import { apiFetch } from '@libs/api-client';
import type { UserProfile } from '@shared/types/user';

export default async function ProfileSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Settings.profilePage');
  const profile = await apiFetch<UserProfile>('/users/me');

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <SettingsNav locale={locale} active="profile" />
      <h1 className="text-2xl font-extrabold md:text-[26px]">{t('title')}</h1>
      <ProfileForm profile={profile} />
    </main>
  );
}
