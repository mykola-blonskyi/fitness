---
id: FITNESS-40
title: "Spec: Catalog Moderation & Virtualized Browsing"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Catalog Moderation & Virtualized Browsing"
parent: null
created: 2026-08-25
updated: 2026-08-30
plane_id: e947ac17-e769-45f4-947d-d95aeb6e7d76
---

# FITNESS-40: Spec: Catalog Moderation & Virtualized Browsing

### Problem Statement

Seeded Exercises and Food Items start unverified and nothing in the app ever reviews or approves them. Meanwhile the public catalog browse pages show an unbounded, unfiltered list mixing verified and unverified rows with no pagination — a list that will only get slower and messier as the catalog grows.

### Solution

Add an admin-only review dashboard to approve, unapprove, or delete unverified Exercises and Food Items, and rework the public catalog browse pages to show only verified items via a virtualized, infinitely-scrolling, cursor-paginated list — with both surfaces sharing the same underlying list machinery.

### User Stories

1. As the site owner, I want to see a queue of unverified Exercises, so that I can review newly imported ones.
2. As the site owner, I want to see a queue of unverified Food Items, so that I can review newly imported ones.
3. As the site owner, I want to approve an unverified Exercise, so that it becomes visible to normal browsing.
4. As the site owner, I want to approve an unverified Food Item, so that it becomes visible to normal browsing.
5. As the site owner, I want to revert an approved Exercise back to unverified, so that I can correct an accidental approval.
6. As the site owner, I want to revert an approved Food Item back to unverified, so that I can correct an accidental approval.
7. As the site owner, I want to delete an Exercise that isn't referenced by any Program Exercise, so that I can remove garbage seed data.
8. As the site owner, I want to delete a Food Item that isn't referenced by any Diet Item, so that I can remove garbage seed data.
9. As the site owner, I want to be blocked with a clear message when I try to delete an Exercise or Food Item that's actually in use, so that I don't corrupt my own training programs or diets.

10. As the site owner, I want a confirmation step before a delete fires, so that I don't destroy data with one misclick.

11. As the site owner, I want to see the source and source id of an unverified row, so that I can judge its trustworthiness before approving it.

12. As the site owner, I want the admin dashboard gated behind an admin check, so that moderation actions aren't exposed to just any authenticated request.

13. As the site owner, I want a single admin page with a Food/Exercises tab switch, so that I can review both catalogs from one place.

14. As the site owner, I want a nav link to the admin dashboard, so that I can get there without remembering a URL.

15. As a user browsing the Exercise catalog, I want to see only verified Exercises, so that I'm not shown unreviewed or potentially wrong data.

16. As a user browsing the Food catalog, I want to see only verified Food Items, so that I'm not shown unreviewed or potentially wrong data.

17. As a user scrolling a long catalog list, I want new items to load automatically as I scroll, so that I don't have to click through numbered pages.

18. As a user scrolling a long catalog list, I want the list to render smoothly regardless of how many items exist, so that performance doesn't degrade as the catalog grows.

19. As the site owner reviewing the admin queue, I want approving or rejecting an item to never cause the next item in my scroll position to be skipped, so that my review session doesn't miss items.

20. As a user who manually creates a custom Exercise, I want it to appear in my browse list immediately, so that I don't lose track of something I just added.

21. As a user who manually creates a custom Food Item, I want it to appear in my browse list immediately, so that I don't lose track of something I just added.

### Implementation Decisions

- This spec covers two sequential tracer-bullet implementation tickets: the admin review dashboard (built first — it establishes the shared cursor-pagination and virtualized-list machinery), then the public catalog browse rework (reuses that machinery against the existing browse endpoints).
- New `isAdmin` boolean on the User entity. Checked at the API layer for the new admin endpoints, and used by the frontend to hide the admin page and its nav link for non-admin identities. This is new authorization infrastructure in an app that previously had none — see Further Notes.
- `isVerified` remains a plain boolean on Exercise and Food Item — no new pending/rejected state is introduced.
- Admin actions: approve (unverified → verified), unapprove (verified → unverified), and delete.
- Delete removes the Exercise/Food Item along with its own per-locale translations (their existence is scoped to the parent, not independent usage). Delete is rejected with a descriptive error if the entity is referenced by a Program Exercise (Exercise) or a Diet Item (Food Item) — genuinely in use elsewhere, as opposed to just having translations.
- Delete requires an explicit confirmation step in the UI before the request fires.
- Translation verification (the separate `isVerified` flag on Exercise Translation / Food Item Translation) is untouched by this feature.
- The admin queue lists unverified Exercises/Food Items on one page with a tab switch between the two catalogs, reachable via a header nav link. Each row shows the same fields as the public browse view plus source and source id.
- Public catalog browse (Exercise and Food Item) is filtered server-side to verified-only.
- Manual creation (the existing "create custom Exercise/Food Item" flows) sets `isVerified` to true at creation time, rather than leaving it at the unverified default — a manually-created item is implicitly self-reviewed by its creator.
- Both the admin queue and the public browse tables share one cursor-based pagination and virtualized-rendering approach: results are fetched in bounded pages ordered by creation time (ties broken by id) rather than offset/limit, and the frontend renders only the visible rows of a long list, loading further pages automatically as the user scrolls near the end of what's loaded.
- No traditional page-number control anywhere — infinite scroll is the only pagination UI.
- The public browse table's column set is unchanged for now except dropping the verified indicator (redundant once the list is verified-only by construction) — further column trimming is explicitly deferred to a later pass.

### Testing Decisions

- Only test external behavior via small, directly-callable pure functions extracted from the surrounding service/handler code — this repo's established pattern (the diet-generation heuristic, the diet-preference exclusion mapping, the program-exercise target resolver, and the calorie-calculation algorithm are all tested this way today; no service-level or HTTP-level tests exist anywhere in the codebase).
- Cursor pagination: the boundary-construction logic for a creation-time+id cursor gets a dedicated pure-function test module, covering first-page (no cursor), subsequent-page, and empty-result cases. This is the one seam shared by both tickets.
- Delete-in-use guard: the predicate that decides whether an Exercise/Food Item may be deleted given its known usage gets a dedicated pure-function test module, covering "no usage → allowed" and "has usage → blocked with reason" cases.
- No frontend test seam — infinite-scroll/virtualization behavior is entirely delegated to the chosen libraries' own documented APIs, with no bespoke logic of ours to verify beyond what those libraries already guarantee.

### Out of Scope

- Translation verification workflow (Exercise Translation / Food Item Translation's own `isVerified` flag).
- A pending/rejected tri-state for moderation — approve/unapprove is a plain boolean toggle.
- Any multi-user or role-hierarchy concept beyond a single `isAdmin` boolean — this app has exactly one real user.
- Traditional page-number pagination UI.
- Trimming or redesigning the public browse table's column set beyond dropping the verified indicator.
- Auto-approving or bulk-approving translations as a side effect of approving the parent entity.
- Soft-delete or undo for deleted Exercises/Food Items.

### Further Notes

- The `isAdmin` addition is a genuine architectural decision worth its own ADR once implemented: it's hard to reverse, surprising without context (a single-user personal app choosing to add a role concept), and the result of a real, deliberately-made trade-off (the simpler alternative — gating on "any authenticated request" — was explicitly considered and rejected in favor of this). Recommend writing that ADR as part of, or immediately after, the admin-dashboard ticket.
- Cursor-based (rather than offset-based) pagination was chosen specifically because the admin queue is a self-mutating list during use: approving or unapproving an item while scrolling would cause offset-based pagination to skip or duplicate the next row. This applies less to the public browse tables, but the same mechanism is reused there for consistency and to avoid a second pagination implementation.
