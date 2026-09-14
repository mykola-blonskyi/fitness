# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Instructions

This repository follows the global Claude configuration.

## Current State

All six phases of `plans/current.md` are implemented and merged into `main` — training, diet, photo/pose analysis, i18n, offline PWA, Sentry error tracking (ADR-006), and the Phase 6 move to an independent OIDC client of `login.blonskyi.dev` (ADR-018). Work continues past those phases on the ADR-020 menu-composition rework; Plane is the live ticket state, not this file.

`login.blonskyi.dev` is live, the `fitness` client is registered against it, and signing in now goes to that issuer instead of the Hub. The one path still unproven from outside is the token exchange, which only a real sign-in exercises — so if a login ever fails at the callback rather than at the prompt, suspect `OIDC_CLIENT_SECRET` in Coolify first.

Production tracks `main` automatically. A push to `main` runs CI, and the `deploy` job calls Coolify's deploy API using the `COOLIFY_WEBHOOK_URL`/`COOLIFY_WEBHOOK_TOKEN` repo secrets (Coolify token `fitness auto-deploy`, `deploy` ability). A red check therefore means no release, by design — the job used to skip itself when the secrets were missing, which hid the fact that they were never set.

Coolify injects the app's build-time variables into its own image builds, so `docker build -f frontend/Dockerfile` by hand fails on `OIDC_ISSUER` where Coolify succeeds. That is expected, not a broken build.

See `plans/current.md` for the phased plan and Plane (`docs/agents/issue-tracker.md`) for live ticket status.

Common commands (run from repo root):

- `pnpm install` — install all workspace deps
- `pnpm dev` — start both apps in parallel (backend :3001, frontend :3000)
- `pnpm build` — build both apps
- `pnpm --filter backend <script>` / `pnpm --filter frontend <script>` — run a script in one package; see each `package.json` for the full list (`lint`, `lint:check`, `format`, `format:check`, `test`, `test:e2e`, `db:generate`, `db:migrate`, `db:studio` on the backend)

The intended stack (Next.js frontend, NestJS backend, Drizzle/Postgres, Redis, MinIO, a Python/FastAPI photo-analysis worker) is documented in `docs/architecture.md` — read that before touching architecture, since key decisions (e.g. NestJS owns the database, not Next.js Server Actions) are already settled in `docs/decisions.md`.

## Code Comments

The global default already applies here (no comments unless the WHY is genuinely non-obvious) — this section exists because that default got over-applied in practice, not because the rule changed. Concretely, on 2026-08-23 five tickets built in parallel each independently wrote a paragraph-style rationale comment on nearly every field/function (schema.ts alone reached 101 comment-lines in 376), which then needed a separate cleanup pass (PRs #26, #27) to fix.

Before writing a comment, ask: would removing it leave a future reader confused? If no, don't write it. In particular:

- Don't narrate the ticket/AC ("per FITNESS-N's acceptance criteria...") — that belongs in the PR description, not the code.
- Don't restate what the code already says (a well-named field or function doesn't need a sentence repeating its name).
- Don't explain routine framework/library usage.
- Don't state the same fact twice. One rule, one home — every other mention is a pointer or nothing.
- Do keep: a hidden constraint, a workaround for a specific bug/quirk, or a design decision whose reasoning isn't derivable from the code itself — and keep it to one or two lines, not a paragraph.

When dispatching a subagent to implement a ticket in this repo, restate this constraint explicitly in the prompt — don't assume the subagent will infer it from this file alone.

Run an explicit comment pass over the diff before the first commit, and again over a subagent's diff before you accept it. Writing clean is not enough on its own; the over-application above happened while everyone believed they were following the rule. For each surviving comment, cut it to the shortest phrasing that still answers the why.

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

Project documentation lives in `docs/` and `knowledge/`. As of 2026-08-25, full history/rationale lives outside the repo, at `~/Documents/obsidian-notes/projects_history/fitness/` (mirrors `docs/` and `knowledge/`, plus its own `CHANGELOG.md`) — that split exists because in-repo docs were accumulating detailed alternatives-considered/rationale narrative on every decision, growing what every session has to load just to get oriented.

When a change touches `docs/` or `knowledge/`:

1. Write the full version — rationale, alternatives considered, the "why" — into the mirrored file under `~/Documents/obsidian-notes/projects_history/fitness/`, and add a dated entry to that vault's `CHANGELOG.md` describing what changed and why.
2. Keep the in-repo file trimmed to the current, final decision only — state what's true now, not how the team got there. No "Alternatives Considered" section, no narrative — that lives in the mirror.

Existing in-repo docs haven't been retroactively trimmed yet (only the mirror + this policy exist so far) — trim opportunistically when you're already touching a file for another reason, not as a standalone sweep unless asked.

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
