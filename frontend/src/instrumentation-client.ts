import * as Sentry from '@sentry/nextjs';
import { sharedSentryOptions } from '@shared/libs/sentry-shared';

// Client-side DSN must be NEXT_PUBLIC_-prefixed - Next.js inlines
// NEXT_PUBLIC_* vars into the browser bundle at build time, so this must
// also be supplied as a Docker build arg (see frontend/Dockerfile), not
// just a runtime env var like the rest of this app's config.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  ...sharedSentryOptions(),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
