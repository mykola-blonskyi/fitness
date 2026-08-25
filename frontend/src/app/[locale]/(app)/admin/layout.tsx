import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { apiFetch } from '@libs/api-client';
import type { UserProfile } from '@shared/types/user';

// Gate for every /admin/* page - a non-admin caller gets the same 404 an
// unbuilt route would give, not a 403 page revealing the section exists.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await apiFetch<UserProfile>('/users/me');
  if (!profile.isAdmin) {
    notFound();
  }

  return children;
}
