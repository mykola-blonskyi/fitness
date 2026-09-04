import { hasLocale, IntlErrorCode } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // Dates in this app are ISO day strings computed in UTC (todayIso()).
    timeZone: 'UTC',
    messages: (await import(`../../messages/${locale}.json`)).default,
    onError(error) {
      // A missing key must be loud in dev/CI (throw) rather than
      // silently rendering the key path - prod degrades to a console
      // error instead so one bad key doesn't 500 a whole page in front
      // of real users.
      if (
        process.env.NODE_ENV !== 'production' &&
        error.code === IntlErrorCode.MISSING_MESSAGE
      ) {
        throw error;
      }
      console.error(error);
    },
  };
});
