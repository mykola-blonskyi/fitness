# Issue tracker: Plane

Specs and tickets for this repo live in Plane (self-hosted at `https://plane.blonskyi.dev`),
workspace slug `blonskyi`, project `FITNESS` (identifier `FITNESS`, id
`a36feeea-ab0c-4aaf-8356-d4bdb7d8ae87`).

All operations go through the Plane REST API (`/api/v1/...`), authenticated with
`X-API-Key: $PLANE_API_KEY`. Read the token from the `PLANE_API_KEY` env var — never hardcode or
commit it. Every write in this doc is a `curl` call; wrap the boilerplate (base URL, workspace,
project id, auth header) in a shell function or small script rather than repeating it.

This convention set mirrors the sibling `todolist` project's `docs/agents/issue-tracker.md` — same
Plane instance, same shape of workflow. Re-check that doc if something here seems underspecified;
don't re-derive conventions that are already settled there.

## Specs vs. tickets

Specs (PRD-style, e.g. `Spec: Diet Engine`) and implementation tickets are both work items in the
FITNESS project — there's no separate "docs" surface (this Plane instance's public API doesn't
mount the Pages endpoints; see the `todolist` issue-tracker doc's "Specs vs. tickets" section for
the full investigation of why Pages automation was rejected). Specs are distinguished by the `spec`
label, tickets are not.

## Modules

**Every `spec`-labeled ticket gets a Plane Module — always, as part of creating the spec, not a
later/optional step.** The module groups the spec with its related implementation tickets. Module
name is the spec's title with the `Spec: ` prefix stripped (e.g. `Spec: Diet Engine` → module
`Diet Engine`).

- **Create a module**: `POST .../modules/` with `{"name": "..."}`.
- **Add tickets to a module**: `POST .../modules/{module_id}/module-issues/` with
  `{"issues": ["<work-item-id>", ...]}` (bulk; include the spec ticket itself plus every related
  ticket).
- **List a module's tickets**: `GET .../modules/{module_id}/module-issues/`.

Related tickets also get the spec ticket set as their `parent` (`PATCH .../work-items/{id}/` with
`{"parent": "<spec-id>"}`) — independent from module membership; both get set. A ticket that
doesn't map cleanly to one spec (cross-cutting infra) is left out of every module, `parent: null`.

## Dependencies (`blocked_by`) and priority

- **Set blocking**: `POST .../work-items/{id}/relations/` with
  `{"relation_type": "blocked_by", "issues": ["<blocker-id>", ...]}` (bulk; pass every blocker in
  one call).
- **Read blockers**: `GET .../work-items/{id}/relations/` → `blocked_by`.

Priority (`urgent`/`high`/`medium`/`low`/`none`): the true critical-path bottleneck (nothing else
can start until it's done) is `urgent`; the rest of the current build phase is `high`; later phases
are `medium`; pure polish/distribution tickets are `low`. Specs stay `none` — reference docs, not
actionable work. `PATCH .../work-items/{id}/` with `{"priority": "<value>"}`.

## Markdown → description_html gotcha

`description_html` must be actual HTML, not raw markdown — the API silently ignores a plain
`description` field. Acceptance-criteria checklists (`- [ ] ...`) need Tiptap's task-list shape:
`<ul data-type="taskList"><li data-checked="false"><label><input type="checkbox"><span></span></label><div><p>...</p></div></li></ul>`
A plain markdown converter turns `- [ ] foo` into a literal bullet reading "[ ] foo" instead of a
checkbox — verify by round-tripping a PATCH and reading it back before trusting a fresh conversion.

## States

Fetch fresh via `GET /api/v1/workspaces/blonskyi/projects/{project_id}/states/` if these ever
change:

| Name | group | id |
| --- | --- | --- |
| Backlog | backlog | `f2a1f3a1-6902-4520-956e-09c35f83c430` (default for new items) |
| Todo | unstarted | `dd2c803e-4394-4601-b859-332ea6e995d7` |
| In Progress | started | `150a9846-0346-4820-b564-e58c57b4f674` |
| Done | completed | `c46c30bc-8462-4243-a025-47af9d5e3de8` |
| Cancelled | cancelled | `886cec0c-edfc-437a-8f04-7c4de298f74e` |

## Labels

| Name | id |
| --- | --- |
| spec | `11e7b5f2-0592-4f1e-9371-a8e854607805` |
| ready-for-agent | `a42404da-ce6a-4e13-9c5c-12151837180c` |

## Conventions

- **Create a ticket**: `POST /api/v1/workspaces/blonskyi/projects/{project_id}/work-items/` with
  `{"name": "...", "description_html": "<p>...</p>", "state": "<state-id>", "labels": ["<label-id>"]}`.
- **Read a ticket**: `GET .../work-items/{id}/` for the item, `GET .../work-items/{id}/comments/`
  for its comments. Look up `{id}` by sequence (`FITNESS-3`) via
  `GET .../work-items/?fields=id,sequence_id` and matching `sequence_id`.
- **List tickets**: `GET .../work-items/?per_page=100` with `cursor` for pagination. Filter
  client-side on `state.group`, `labels`, `assignees`.
- **Comment on a ticket**: `POST .../work-items/{id}/comments/` with `{"comment_html": "<p>...</p>"}`.
- **Apply / remove labels**: `PATCH .../work-items/{id}/` with the full desired `labels` array.
- **Close**: `PATCH .../work-items/{id}/` with `{"state": "<Done-or-Cancelled-id>"}`.

## Working a ticket

1. **Eligibility**: only take a ticket whose state is **Todo** (`state.group: unstarted`). Never
   `Backlog` (not yet promoted) and never a ticket already `In Progress`/`Done`/`Cancelled`.
2. **Claim**: `PATCH .../work-items/{id}/` with `{"state": "<In-Progress-id>"}` before writing any
   code.
3. **Branch**: `git checkout -b FITNESS-<n> main` — the bare ticket id as the entire branch name
   (per the grooming note's stated convention), not this repo's usual `type/description` pattern.
4. **Implement** the ticket, applying Modules/`blocked_by`/priority conventions above for anything
   Plane-side the work touches.
5. **Ship**: commit, push, `gh pr create`. Wait for CI to pass before treating the PR as ready.
6. **Stop — do not merge it yourself.** Open the PR, confirm CI is green, report it as ready;
   merging stays a deliberate human action.
7. **Close out**: only after the PR is merged into `main`:
   1. Check off every satisfied acceptance-criteria checkbox in the ticket's description (Tiptap
      task-list markup — see the gotcha above). Re-`GET` the ticket and verify the checkboxes
      actually round-tripped before moving on.
   2. Only then `PATCH` the ticket to **Done**.

## When a skill says "publish to the issue tracker"

Create a Plane work item in the FITNESS project. If it's a spec (`spec` label), also create its
Module in the same operation — see Modules above; this is not optional.

## When a skill says "fetch the relevant ticket"

`GET .../work-items/{id}/` plus its comments.
