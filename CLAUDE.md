# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Instructions

This repository follows the global Claude configuration.

## Current State

Scaffolding, Hub SSO auth, profile onboarding/settings, CI/CD, Daily Log + weight logging, and the exercise-catalog seed script are built, merged, and deployed to production at fitness.blonskyi.dev (FITNESS-7, 8, 9, 10, 14, 16). Error tracking (Sentry — see ADR-006) is designed and ticketed (FITNESS-32, 33) but not yet implemented. See `plans/current.md` for the phased plan and Plane (`docs/agents/issue-tracker.md`) for live ticket status.

Common commands (run from repo root):

- `pnpm install` — install all workspace deps
- `pnpm dev` — start both apps in parallel (backend :3001, frontend :3000)
- `pnpm build` — build both apps
- `pnpm --filter backend <script>` / `pnpm --filter frontend <script>` — run a script in one package; see each `package.json` for the full list (`lint`, `lint:check`, `format`, `format:check`, `test`, `test:e2e`, `db:generate`, `db:migrate`, `db:studio` on the backend)

The intended stack (Next.js frontend, NestJS backend, Drizzle/Postgres, Redis, MinIO, a Python/FastAPI photo-analysis worker) is documented in `docs/architecture.md` — read that before touching architecture, since key decisions (e.g. NestJS owns the database, not Next.js Server Actions) are already settled in `docs/decisions.md`.

## Source of Truth

Before making architectural or implementation decisions, review:

1. docs/architecture.md
2. docs/decisions.md
3. docs/TODO.md
4. knowledge/domain-model.md
5. knowledge/business-rules.md

## Planning

Use:

- plans/current.md for active work
- plans/backlog.md for future work

Update plans when major tasks are completed.

## Documentation

Project documentation lives in:

- docs/
- knowledge/

Keep documentation synchronized with code changes.

## Reports

Analysis results should be stored in:

- reports/reviews/
- reports/investigations/
- reports/audits/
- reports/summaries/

Reports are historical records and should not replace project documentation.

## Architecture Analysis

Use:

- graph/architecture.md
- graph/dependencies.md

for architecture and dependency analysis.

## Reusable Resources

Reference materials:

- snippets/
- examples/
- boilerplates/
- prompts/

Reuse existing templates whenever possible.

## Local Overrides

Additional project-specific instructions may exist in:

- .claude/CLAUDE.local.md

## Agent skills

### Issue tracker

Specs and tickets live in Plane (`plane.blonskyi.dev`, workspace `blonskyi`, project `FITNESS`). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context, non-standard paths — this repo's own `knowledge/`/`docs/` layout, not `CONTEXT.md`/`docs/adr/`. See `docs/agents/domain.md`.

### Design

Always use the `ui-ux-pro-max` skill for any UI/UX design work in this repo — page layout, component design, color/typography choices, styling decisions. Load it before writing frontend UI code, not just when explicitly asked for a "design."
