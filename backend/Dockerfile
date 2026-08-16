# syntax=docker/dockerfile:1
#
# Build context is the monorepo root (see root docker-compose.yml) - a pnpm
# workspace install needs the root lockfile/pnpm-workspace.yaml plus every
# package.json, not just backend/'s own files.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter backend build
RUN pnpm deploy --filter=backend --prod /prod/backend
# pnpm deploy already includes dist/ (built in the previous step) despite
# it being gitignored - confirmed by inspection, not an assumption carried
# over from another project. `drizzle/` (migrations) is committed but
# `pnpm deploy` only follows the dependency graph, not arbitrary source
# files - copy it in so drizzle-kit has something to apply at boot.
RUN cp -r backend/drizzle /prod/backend/drizzle
RUN cp backend/drizzle.config.ts /prod/backend/drizzle.config.ts

FROM base AS runner
# Coolify only populates this build arg when "Include Source Commit in
# Build" is enabled in the app's General settings (off by default, to
# preserve build cache) - see docs/decisions.md ADR-006. Baked into an ENV
# since ARGs don't persist into the running container.
ARG SOURCE_COMMIT
ENV SENTRY_RELEASE=$SOURCE_COMMIT
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/backend ./
USER node

EXPOSE 3001

# Applies pending migrations, then starts the server - see docs/decisions.md
# ADR-005 for why migrations run here (at boot) rather than as a separate
# CI step: this is the only place that ever has real access to the
# production DATABASE_URL. A failed migration crashes the container before
# app.listen(), so it never passes its healthcheck and Coolify leaves the
# previous version running.
CMD ["sh", "-c", "node_modules/.bin/drizzle-kit migrate && node dist/main"]
