import { ProfileForm, SettingsNav } from '@features/settings';
import { apiFetch } from '@libs/api-client';
import type { UserProfile } from '@shared/types/user';

export default async function ProfileSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await apiFetch<UserProfile>('/users/me');

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-16">
      <SettingsNav locale={locale} active="profile" />
      <h1 className="text-2xl font-semibold">Profile</h1>
      <ProfileForm profile={profile} />
    </main>
  );
}
