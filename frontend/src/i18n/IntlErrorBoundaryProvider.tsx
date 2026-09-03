'use client';

import type { ReactNode } from 'react';
import { IntlErrorCode, NextIntlClientProvider } from 'next-intl';

// onError/getMessageFallback aren't serializable, so they can't be passed
// to NextIntlClientProvider directly from a Server Component - this
// nested 'use client' provider is next-intl's documented workaround; it
// inherits locale/messages from the outer NextIntlClientProvider.
export function IntlErrorBoundaryProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider
      onError={(error) => {
        if (
          process.env.NODE_ENV !== 'production' &&
          error.code === IntlErrorCode.MISSING_MESSAGE
        ) {
          throw error;
        }
        console.error(error);
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
