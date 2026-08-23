import path from 'node:path';
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Minimal server bundle for the Docker runner stage — see frontend/Dockerfile.
  output: 'standalone',
  // Monorepo: workspace root, not frontend/, or tracing misses pnpm's nested deps.
  outputFileTracingRoot: path.join(__dirname, '..'),
  // Next 16.3.1's Turbopack tracer drops @swc/helpers' esm/ subpath from the
  // standalone output, causing a runtime MODULE_NOT_FOUND despite a clean build.
  // Force it back in.
  outputFileTracingIncludes: {
    '/*': [
      '../node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**/*',
    ],
  },
  // The only two external image hosts this app renders (Open Food Facts, wger).
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.openfoodfacts.org',
        pathname: '/images/products/**',
      },
      {
        protocol: 'https',
        hostname: 'wger.de',
        pathname: '/media/exercise-images/**',
      },
    ],
  },
  // sw.js's filename never changes between deploys, so it must always be
  // revalidated or a long-lived cache would keep serving a stale worker.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
    ];
  },
};

// `silent` keys off SENTRY_AUTH_TOKEN, not CI: Coolify prod builds never set
// CI=true, so `silent: !process.env.CI` was silencing real deploy upload
// errors with no way to detect failure short of checking Sentry directly.
//
// SENTRY_RELEASE (Coolify's SOURCE_COMMIT) isn't always populated — an empty
// value reaches here as '', and Sentry's CLI hard-rejects an empty
// --release. Fall back to a build-time timestamp so uploads don't fail over it.
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
