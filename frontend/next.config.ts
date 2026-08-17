import path from 'node:path';
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Traces a minimal server bundle for the Docker runner stage — see
  // frontend/Dockerfile.
  output: 'standalone',
  // Build context is the pnpm workspace root (monorepo), not frontend/
  // itself - without this, output file tracing can miss transitive
  // dependencies pnpm nests deeply.
  outputFileTracingRoot: path.join(__dirname, '..'),
  // Next 16.3.1's Turbopack tracer drops @swc/helpers' esm/ subpath from
  // the standalone output even though it exists in the full node_modules
  // (confirmed by inspecting the intermediate build stage directly) -
  // Next itself requires this exact subpath internally, causing a
  // MODULE_NOT_FOUND at runtime despite a successful `next build`. Force
  // it back in rather than working around it with a manual Dockerfile
  // copy step, since this is the documented mechanism for exactly this
  // failure mode.
  outputFileTracingIncludes: {
    '/*': [
      '../node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**/*',
    ],
  },
};

// Uploads source maps at build time (see docs/decisions.md ADR-006) so
// Sentry stack traces resolve to real source, not minified bundle
// positions. Only actually uploads when SENTRY_AUTH_TOKEN is present -
// silently no-ops otherwise, so local dev builds are unaffected.
//
// `silent` keys off SENTRY_AUTH_TOKEN, not CI - Coolify production
// builds never set CI=true, so `silent: !process.env.CI` silenced every
// real deploy's plugin output (including upload errors) with no way to
// tell success from failure short of checking Sentry's dashboard
// directly. Stay quiet only when there's genuinely nothing to upload
// with (local dev); be verbose whenever an upload is actually attempted.
//
// SENTRY_RELEASE comes from Coolify's SOURCE_COMMIT, which is not
// reliably populated on every deploy (confirmed via a real build
// reproduction: an empty SENTRY_RELEASE env var reaches this file as
// '', not undefined, and Sentry's CLI hard-rejects an empty --release
// value, failing the entire upload). Fall back to a build-time
// timestamp so an upload never fails outright over this - real commit
// hashes are still used whenever Coolify supplies one correctly.
const sentryRelease = process.env.SENTRY_RELEASE || `build-${Date.now()}`;

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  release: {
    name: sentryRelease,
  },
});
