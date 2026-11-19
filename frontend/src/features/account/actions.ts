'use server';

import * as Sentry from '@sentry/nextjs';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { apiFetch } from '@libs/api-client';
import { SESSION_COOKIE_NAME } from '@libs/session-cookie';

export async function deleteAccount(): Promise<void> {
  await Sentry.withServerActionInstrumentation(
    'deleteAccount',
    {},
    async () => {
      await apiFetch('/account', { method: 'DELETE' });
      (await cookies()).delete(SESSION_COOKIE_NAME);
    },
  );

  // Outside the instrumentation: redirect() throws, see completeOnboarding.
  const locale = await getLocale();
  redirect({ href: '/login', locale });
}
