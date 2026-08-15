# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Instructions

This repository follows the global Claude configuration.

## Current State

**No application code exists yet.** This repository currently holds only planning artifacts — specs, ADRs, and a domain model — ahead of implementation. There is no `package.json`, no build/lint/test tooling, and nothing to run. Do not invent commands; there are none to invent.

The intended stack (Next.js frontend, NestJS backend, Drizzle/Postgres, Redis, MinIO, a Python/FastAPI photo-analysis worker) is documented in `docs/architecture.md` — read that before scaffolding anything, since key decisions (e.g. NestJS owns the database, not Next.js Server Actions) are already settled in `docs/decisions.md`.

Work is tracked in Plane (see `docs/agents/issue-tracker.md`), project `FITNESS`. The first implementation ticket is **FITNESS-7** ("App scaffolding + Drizzle/Postgres wiring", Phase 1 of `plans/current.md`) — it has no blockers and establishes the commands (`dev`, `build`, `lint`, `test`, `migrate`) that this section should be updated with once it lands.

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
