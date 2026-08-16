import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Auto-captures render errors across the App Router (Server Components,
// Route Handlers). Server Actions are NOT covered by this - they need
// their own Sentry.withServerActionInstrumentation wrapper (see
// features/*/actions.ts), Sentry's own documented limitation.
export const onRequestError = Sentry.captureRequestError;
