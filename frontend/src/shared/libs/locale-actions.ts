'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { apiFetch } from '@libs/api-client';
import { LOCALES, type Locale } from '@shared/types/user';

// The language switcher writes the profile, not just the route: catalog
// display names resolve against users.locale server-side (see
// knowledge/business-rules.md), so switching the route alone would leave
// every food and exercise name in the previous language.
export async function updateLocale(locale: Locale): Promise<void> {
  return Sentry.withServerActionInstrumentation(
    'updateLocale',
    {},
    async () => {
      if (!LOCALES.includes(locale)) return;
      await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ locale }),
      });
      // Catalog names are rendered on nearly every page, so the whole tree's
      // cached output is stale once the stored locale changes.
      revalidatePath('/', 'layout');
    },
  );
}
