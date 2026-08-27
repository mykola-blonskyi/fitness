import type { ReactNode } from 'react';
import { Header } from '@shared/ui/components/Header';
import { apiFetch } from '@libs/api-client';
import type { UserProfile } from '@shared/types/user';

// Wraps every route except /onboarding and /health (siblings, outside
// this route group) - see docs/decisions.md ADR-007. Both are excluded
// for a real reason, not just style: onboarding is a distinct focused
// flow, and /health never gets identity headers injected (proxy.ts
// returns early for it), so there'd be no profile to show here anyway.
export default async function AppLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}) {
  const { locale } = await params;
  const profile = await apiFetch<UserProfile>('/users/me');

  return (
    <>
      <Header
        locale={locale}
        identity={{
          userId: profile.id,
          name: profile.name,
          email: profile.email,
          isAdmin: profile.isAdmin,
        }}
      />
      {children}
    </>
  );
}
