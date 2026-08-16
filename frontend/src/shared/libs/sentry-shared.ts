import type * as Sentry from '@sentry/nextjs';

// Shared across client/server/edge Sentry.init() calls (see
// docs/decisions.md ADR-006). Only ever active in production, and only
// ever a UUID as identifying context - never email, IP, or request data.
export function sharedSentryOptions(): Parameters<typeof Sentry.init>[0] {
  return {
    enabled: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.user) {
        event.user = event.user.id ? { id: event.user.id } : undefined;
      }
      delete event.request?.data;
      delete event.request?.cookies;
      return event;
    },
  };
}
