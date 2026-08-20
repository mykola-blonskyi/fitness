// Must be imported before any other module (see main.ts) - Sentry's own
// requirement so it can instrument everything else as it loads.
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Only active in production - local `pnpm dev` never reports, per
  // docs/decisions.md ADR-006 (keeps the shared org's event quota clean).
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV,
  // Set by Coolify from SOURCE_COMMIT (see backend/Dockerfile) - only
  // populated when "Include Source Commit in Build" is enabled there.
  // When it's off, the Dockerfile still sets SENTRY_RELEASE to an empty
  // string (not unset), which Sentry.init would otherwise tag every event
  // with a literal "" release. `|| undefined` degrades that to "no
  // release" instead - same fallback shape as frontend/next.config.ts's
  // sentryRelease.
  release: process.env.SENTRY_RELEASE || undefined,
  // ADR-006: only a UUID is ever attached as user context (set in
  // IdentityGuard) - never email, IP, or request bodies.
  sendDefaultPii: false,
  integrations: [Sentry.requestDataIntegration({ include: { data: false } })],
  // requestDataIntegration's `include` option doesn't cover headers -
  // every request carries a real x-user-email header (see
  // IdentityGuard/parseIdentity), which would otherwise reach
  // event.request.headers untouched. Strip it in both pipelines, same as
  // the frontend's sharedSentryOptions.
  beforeSend(event) {
    delete event.request?.headers;
    return event;
  },
  beforeSendTransaction(event) {
    delete event.request?.headers;
    return event;
  },
});
