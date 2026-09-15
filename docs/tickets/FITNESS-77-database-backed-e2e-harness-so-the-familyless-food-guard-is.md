---
id: FITNESS-77
title: "Database-backed e2e harness, so the familyless-food guard is a real test"
state: Backlog
state_group: backlog
priority: medium
labels: []
module: null
parent: null
created: 2026-09-13
updated: 2026-09-13
plane_id: c7f209e8-5db0-4749-a442-8bcd4b4dd458
---

# FITNESS-77: Database-backed e2e harness, so the familyless-food guard is a real test

Split out of FITNESS-72, whose third acceptance criterion asked for a test that a Food Item with no Family is **still browsable and loggable**. Only the generation half shipped.

The browse half cannot be tested with the idiom the diet specs use. Every one of them mocks the Drizzle chain, so a mocked `where()` returns its canned rows whatever the predicate is. A test asserting that browse still returns a familyless row would pass even if someone added a Family filter to `FoodItemsService.list()` — it guards nothing. Verified by inspection instead: `food-items.service.ts` never references family.

A real guard needs a spec that runs against a live Postgres. `backend/test/` holds one e2e spec with no database wiring, so the harness is the work here, not the assertion.

**Acceptance criteria**

- [ ] Backend e2e specs can run against a real Postgres (testcontainer or a disposable schema), migrations applied
- [ ] A spec proves a Food Item with no Family is returned by food-item browse and accepted by daily-log entry
- [ ] The same spec proves it is never returned as a generation candidate, against the real query rather than a mock
- [ ] The harness runs in CI once Actions billing is restored, and locally with one documented command

Follow-up to FITNESS-72 (PR #98). Part of ADR-020 phase 1 — see `plans/current.md`.
