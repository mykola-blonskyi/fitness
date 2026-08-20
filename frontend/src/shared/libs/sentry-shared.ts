import type * as Sentry from '@sentry/nextjs';

// Shared across client/server/edge Sentry.init() calls (see
// docs/decisions.md ADR-006). Only ever active in production, and only
// ever a UUID as identifying context - never email, IP, or request data.
//
// beforeSend and beforeSendTransaction are two entirely separate pipelines
// - error events only ever go through beforeSend, and anything from
// Sentry.withServerActionInstrumentation's `formData`/`headers` options
// (see features/*/actions.ts) attaches to the transaction/span pipeline,
// which only beforeSendTransaction can see. Missing this the first time
// around is exactly how real form data (a name, a weight, a date of
// birth) almost reached Sentry despite beforeSend existing - both hooks
// are required, not one or the other.
function scrubUser(user: Sentry.User | undefined): Sentry.User | undefined {
  return user?.id ? { id: user.id } : undefined;
}

export function sharedSentryOptions(): Parameters<typeof Sentry.init>[0] {
  return {
    enabled: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    beforeSend(event) {
      event.user = scrubUser(event.user);
      delete event.request?.data;
      delete event.request?.cookies;
      // apiFetch sends x-user-email on every request (see
      // shared/libs/api-client.ts) - it lands in event.request.headers,
      // not .data or .user, so it needs its own scrub or a real email
      // reaches Sentry despite the rest of this file's PII guarantees.
      delete event.request?.headers;
      return event;
    },
    beforeSendTransaction(event) {
      event.user = scrubUser(event.user);
      delete event.request?.data;
      delete event.request?.cookies;
      delete event.request?.headers;
      // Defense-in-depth: the real fix is that no `formData`/`headers`
      // option is ever passed to withServerActionInstrumentation (see
      // features/*/actions.ts), so nothing should reach span data in the
      // first place. This is a second layer in case that regresses -
      // pattern-based rather than one specific guessed attribute name,
      // since Sentry's own internal naming for it isn't documented.
      for (const span of event.spans ?? []) {
        if (!span.data) continue;
        for (const key of Object.keys(span.data)) {
          if (/form|body|request\.data/i.test(key)) delete span.data[key];
        }
      }
      return event;
    },
  };
}
