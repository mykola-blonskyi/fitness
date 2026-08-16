import * as Sentry from '@sentry/nextjs';
import { sharedSentryOptions } from '@shared/libs/sentry-shared';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  ...sharedSentryOptions(),
});
