# syntax=docker/dockerfile:1
#
# Build context is the monorepo root (see root docker-compose.yml) - `next
# build` auto-detects the pnpm workspace root from the lockfile and traces
# output accordingly (next.config.ts's `output: 'standalone'`), so
# server.js ends up at .next/standalone/frontend/server.js, not
# .next/standalone/server.js.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable
# node:slim ships without CA certificates - without this, any HTTPS call
# needing certificate verification fails ("unable to get local issuer
# certificate"), which is exactly what silently broke the Sentry source
# map upload step below (sentry-cli calling sentry.io during the build).
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
WORKDIR /usr/src/app/frontend
# NEXT_PUBLIC_SENTRY_DSN must be present here, not just at runtime - Next.js
# inlines NEXT_PUBLIC_* vars into the client bundle at build time. The
# other three are build-only (source map upload, see docs/decisions.md
# ADR-006) and deliberately never appear in the runner stage below.
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_RELEASE
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV SENTRY_RELEASE=$SENTRY_RELEASE
RUN pnpm exec next build

FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=build --chown=node:node /usr/src/app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /usr/src/app/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=node:node /usr/src/app/frontend/public ./frontend/public

USER node
WORKDIR /app/frontend

EXPOSE 3000

# Coolify env vars this expects: API_URL, APP_URL, AUTH_SECRET,
# COOKIE_DOMAIN, PROJECT_SLUG, BACKEND_URL (never DEV_BYPASS_AUTH - see
# frontend/.env.example and frontend/src/shared/libs/hub-identity.ts).
CMD ["node", "server.js"]
