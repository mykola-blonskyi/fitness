'use client';

import type { ReactNode } from 'react';
import { IntlErrorCode, NextIntlClientProvider } from 'next-intl';

// onError/getMessageFallback aren't serializable, so they can't be passed
// to NextIntlClientProvider directly from a Server Component - this
// nested 'use client' provider is next-intl's documented workaround.
// `locale` is threaded through explicitly rather than inferred via
// useLocale(): 'use client' resolves next-intl's client bundle here, whose
// NextIntlClientProvider throws if `locale` isn't passed - only the
// react-server bundle infers it automatically.
export function IntlErrorBoundaryProvider({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
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
