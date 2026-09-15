---
id: FITNESS-39
title: "Frontend Sentry source maps still fail to upload in production (Coolify-specific)"
state: Cancelled
state_group: cancelled
priority: medium
labels: []
module: null
parent: FITNESS-33
created: 2026-08-17
updated: 2026-08-17
plane_id: 97e4946b-6f4f-47a5-9739-3bc8f517959c
---

# FITNESS-39: Frontend Sentry source maps still fail to upload in production (Coolify-specific)

### Parent

FITNESS-33 — Frontend error tracking (Sentry)

### What happened

Frontend Sentry source-map upload never succeeds in production despite everything being correctly configured. Fixed two confirmed real bugs along the way (both merged to main), but a third, unidentified issue remains that only reproduces on Coolify's actual deploy path, not in any manual reproduction.

### Fixed and merged (confirmed via 6+ manual reproductions on the VPS using real credentials)

- `next.config.ts`

  :

  `silent: !process.env.CI`

  silenced the Sentry plugin's output on every Coolify build (Coolify never sets

  `CI=true`

  ) - now keys off

  `SENTRY_AUTH_TOKEN`

  presence instead.

- `next.config.ts`

  : Coolify's

  `SOURCE_COMMIT`

  isn't reliably populated - an empty (not unset)

  `SENTRY_RELEASE`

  made

  `sentry-cli`

  hard-reject the upload with an invalid-value error. Now falls back to a build-time timestamp.

- `Dockerfile`

  :

  `node:slim`

  ships with no CA certificates, so every HTTPS call

  `sentry-cli`

  made during the build failed TLS verification (\"unable to get local issuer certificate\"). Now installs

  `ca-certificates`

  in the base stage.

### Still broken

After both real fixes landed, two separate live Coolify deploys (each with a genuinely fresh release version, ruling out a stale-release skip) still produced a release with **zero uploaded files**. Manually reproducing the exact same build - same commit, same real Sentry credentials, same `docker compose build` / `buildx bake` invocation Coolify uses (captured verbatim from a live helper container's process list), with and without cache, with and without `.git` in the build context, building frontend alone or concurrently with backend - succeeds every single time (\"Successfully uploaded source maps to Sentry\"). The gap between manual reproduction and Coolify's actual build has not been identified.

### Suggested next steps

- [ ] Try intercepting the live `buildx bake` process's raw stdout (e.g. via `/proc/<pid>/fd/1`) during an actual Coolify deploy, rather than reproducing after the fact - this is the one thing not yet tried.
- [ ] Alternative: have the already-running frontend container perform the source-map upload itself shortly after startup (confirmed working: the runtime container's network/TLS/DNS access to Sentry's API is fine, verified repeatedly via `docker exec ... node -e fetch(...)`) - sidesteps the build-time mystery entirely at the cost of a less standard deploy flow.

### Acceptance criteria

- [ ] A production deploy produces a release in the frontend Sentry project with at least one uploaded source map file
- [ ] A real production error's stack trace resolves to actual source file paths and line numbers, not minified bundle positions
