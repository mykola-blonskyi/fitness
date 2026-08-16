// Must be imported before any other module (see main.ts) - Sentry's own
// requirement so it can instrument everything else as it loads.
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Only active in production - local `pnpm dev` never reports, per
  // docs/decisions.md ADR-006 (keeps the shared org's event quota clean).
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV,
  // Set by Coolify from SOURCE_COMMIT (see backend/Dockerfile) - undefined
  // locally, which Sentry treats as "no release", not an error.
  release: process.env.SENTRY_RELEASE,
  // ADR-006: only a UUID is ever attached as user context (set in
  // IdentityGuard) - never email, IP, or request bodies.
  sendDefaultPii: false,
  integrations: [Sentry.requestDataIntegration({ include: { data: false } })],
});
