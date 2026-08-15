# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the
codebase.

## Layout: single-context, non-standard paths

This repo uses its own established documentation layout (see the repo's own `CLAUDE.md`, which
directs project structure and explicitly prefers updating existing docs over creating duplicates).
Use these files instead of looking for `CONTEXT.md` or `docs/adr/` — they don't exist here and
shouldn't be created:

- **Glossary / domain model**: [`knowledge/glossary.md`](../../knowledge/glossary.md) (canonical
  terminology) and [`knowledge/domain-model.md`](../../knowledge/domain-model.md) (entities, fields,
  relationships) — together, these are this repo's `CONTEXT.md` equivalent
- **Business rules**: [`knowledge/business-rules.md`](../../knowledge/business-rules.md) — numbered
  rules, not part of the standard template but load-bearing here
- **ADRs**: [`docs/decisions.md`](../decisions.md) — a single file with all ADRs (`ADR-001`,
  `ADR-002`, …), not a `docs/adr/` directory of one-file-per-decision
- **Architecture overview**: [`docs/architecture.md`](../architecture.md) — components, data flow,
  deployment topology; read before touching infra/deploy
- **Phased plan**: [`plans/current.md`](../../plans/current.md) — what's built vs. still open, by
  phase

This is a single bounded context (fitness.blonskyi.dev). The frontend/backend/photo-analysis-worker
split (Next.js / NestJS / Python) is a *deployable-service* boundary (see ADR-001 in
`docs/decisions.md`), not a separate domain context — not a signal for the multi-context
(`CONTEXT-MAP.md`) layout.

## Use the glossary's vocabulary

When your output names a domain concept (an issue title, a spec, a test name), use the term as
defined in `knowledge/glossary.md` — e.g. **Daily Log** (not "diary entry" — see ADR-004 for why
that rename happened), **Photo Session** vs. **Progress Photo** (a session groups several photos;
don't conflate them), **Food Role** (the substitution/diet-generation key — not Category or
Subcategory).

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing
language the project doesn't use (reconsider) or there's a real gap (note it for
`/domain-modeling`).

## Flag ADR / business-rule conflicts

If your output contradicts an existing ADR in `docs/decisions.md` or a rule in
`knowledge/business-rules.md`, surface it explicitly rather than silently overriding:

> _Contradicts ADR-003 (Redis, not BullMQ, across the Node/Python boundary) — but worth reopening
> because…_
