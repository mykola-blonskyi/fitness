# Open tickets snapshot (pulled 2026-08-22 via VPS SSH)

Local cache of all non-Done/non-Cancelled FITNESS tickets, since this sandbox's direct network path to plane.blonskyi.dev is broken (self-signed cert on the sandbox's egress route, origin itself is healthy). One file per ticket in this directory.

**Update (2026-08-22, same day)**: FITNESS-12, 15, 17, 30 shipped (PRs #22, #19, #20, #21, all merged) and were closed to Done in Plane — removed from this snapshot. That unblocks **FITNESS-18** (was blocked by 17) and **FITNESS-31** (was blocked by 30); their files below still show the stale `Unresolved blockers` value from the original pull and haven't been re-verified against live Plane state.

| Ticket | State | Priority | Labels | Unresolved blockers | Title |
|---|---|---|---|---|---|
| FITNESS-1 | Todo | none | spec,ready-for-agent | — | Spec: Auth & User Profile |
| FITNESS-2 | Todo | none | spec,ready-for-agent | — | Spec: Training Programs & Workout Tracking |
| FITNESS-3 | Todo | none | spec,ready-for-agent | — | Spec: Body-Weight Diary |
| FITNESS-4 | Backlog | none | spec,ready-for-agent | — | Spec: Progress Photos & Pose Analysis |
| FITNESS-5 | Todo | none | spec,ready-for-agent | — | Spec: Diet Engine |
| FITNESS-6 | Todo | none | spec,ready-for-agent | — | Spec: Internationalization & Offline PWA |
| FITNESS-11 | Todo | medium | ready-for-agent | — | next-intl UI chrome |
| FITNESS-13 | Todo | medium | ready-for-agent | FITNESS-12 (now Done — recheck) | Offline write-queue + sync + indicator |
| FITNESS-18 | Todo | high | ready-for-agent | ~~FITNESS-17~~ now Done — likely unblocked | Training Program builder |
| FITNESS-19 | Todo | medium | ready-for-agent | FITNESS-18 | Multiple concurrent active programs |
| FITNESS-20 | Todo | high | ready-for-agent | FITNESS-19 | Workout logging (online) |
| FITNESS-21 | Todo | medium | ready-for-agent | FITNESS-13, FITNESS-20 | Offline workout logging |
| FITNESS-22 | Backlog | high | ready-for-agent | — | Photo upload pipeline |
| FITNESS-23 | Backlog | high | ready-for-agent | FITNESS-22 | Photo-analysis queue plumbing + worker skeleton (stub) |
| FITNESS-24 | Backlog | high | ready-for-agent | FITNESS-23 | Real pose/alignment analysis + retry semantics + retry UI |
| FITNESS-25 | Backlog | medium | ready-for-agent | FITNESS-24 | Progress gallery |
| FITNESS-31 | Todo | medium | ready-for-agent | ~~FITNESS-30~~ now Done — likely unblocked | Role-based food swap |
| FITNESS-35 | Todo | none | spec,ready-for-agent | — | Spec: Frontend Form Validation with Zod |
